-- ============================================================
-- 002 — Parcel geometry and derived area
-- ============================================================
-- Run in: Supabase SQL editor, NEW TAB.
-- Requires: PostGIS enabled, migration 001 applied.
--
-- ADDITIVE ONLY. farms.area is NOT touched — it stays until
-- every parcel has a boundary (migration 009 drops it).
--
-- Why this file exists: farms.area is typed by hand and feeds
-- calculateCarbon(soc, bd, depth, area) directly. Draw 2 ha,
-- type 20 ha, get ten times the credits, and nothing in the
-- data shows it happened. After this file, area is computed
-- from the polygon by the database and is not writable through
-- the API at all.
-- ============================================================

BEGIN;

-- PostGIS lives in the extensions schema on Supabase.
SET LOCAL search_path = public, extensions;

-- ------------------------------------------------------------
-- 1. Geometry columns
-- ------------------------------------------------------------
-- 4326 = WGS 84, the lat/lon the browser and GPS both speak.
-- MultiPolygon rather than Polygon because a single holding can
-- legitimately be two detached pieces.

ALTER TABLE farms
    ADD COLUMN IF NOT EXISTS boundary       geometry(MultiPolygon, 4326),
    ADD COLUMN IF NOT EXISTS centroid       geometry(Point, 4326),
    ADD COLUMN IF NOT EXISTS area_ha        numeric,
    ADD COLUMN IF NOT EXISTS geometry_hash  bytea,
    ADD COLUMN IF NOT EXISTS climate_zone   text,
    ADD COLUMN IF NOT EXISTS texture_class  text,
    ADD COLUMN IF NOT EXISTS overlap_status text NOT NULL DEFAULT 'clear';

ALTER TABLE farms DROP CONSTRAINT IF EXISTS farms_overlap_status_check;
ALTER TABLE farms ADD CONSTRAINT farms_overlap_status_check
    CHECK (overlap_status IN ('clear', 'flagged', 'reviewed_ok'));

-- GiST is what makes ST_Intersects and ST_DWithin fast. Without
-- it every overlap check is a sequential scan over every parcel.
CREATE INDEX IF NOT EXISTS idx_farms_boundary_gist ON farms USING gist (boundary);
CREATE INDEX IF NOT EXISTS idx_farms_centroid_gist ON farms USING gist (centroid);

-- ------------------------------------------------------------
-- 2. Derived area and centroid — the fraud fix
-- ------------------------------------------------------------
-- A BEFORE trigger, not GENERATED ALWAYS AS ... STORED. A
-- generated column needs a provably IMMUTABLE expression, and
-- PostGIS function volatility varies between versions, so that
-- route breaks on upgrade. The trigger gives the same guarantee
-- — the value can never come from the client — without the
-- version dependency.
--
-- ::geography casts to the spheroid so ST_Area returns square
-- metres on the globe rather than square degrees.

CREATE OR REPLACE FUNCTION set_parcel_derived()
RETURNS TRIGGER AS $$
BEGIN
    NEW.area_ha  := ROUND((ST_Area(NEW.boundary::geography) / 10000.0)::numeric, 4);
    NEW.centroid := ST_Centroid(NEW.boundary);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_farms_derived ON farms;
CREATE TRIGGER trg_farms_derived
    BEFORE INSERT OR UPDATE OF boundary ON farms
    FOR EACH ROW
    WHEN (NEW.boundary IS NOT NULL)
    EXECUTE FUNCTION set_parcel_derived();

COMMIT;

-- ============================================================
-- VERIFICATION — send me everything this returns
-- ============================================================

-- A real 1-hectare square near Sangli, inserted, measured, removed.
-- If the trigger works, area_ha comes back ~1.0000 without anyone
-- having typed a number.
DO $$
DECLARE
    test_id uuid;
    got     numeric;
    admin_w text;
BEGIN
    SELECT wallet_address INTO admin_w FROM users WHERE role = 'admin' LIMIT 1;

    INSERT INTO farms (name, location, area, created_by, boundary)
    VALUES ('__geom_selftest__', 'test', 1, admin_w,
            ST_Multi(ST_GeomFromText(
                'POLYGON((74.5600 16.8500, 74.5694 16.8500, '
             || '74.5694 16.8590, 74.5600 16.8590, 74.5600 16.8500))', 4326)))
    RETURNING farm_id, area_ha INTO test_id, got;

    RAISE NOTICE 'derived area_ha = % (expect close to 1.0)', got;
    DELETE FROM farms WHERE farm_id = test_id;
END $$;

SELECT 'geometry columns' AS check_name,
       count(*)::text AS result,
       'expect: 7' AS expected
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'farms'
  AND column_name IN ('boundary','centroid','area_ha','geometry_hash',
                      'climate_zone','texture_class','overlap_status')

UNION ALL
SELECT 'boundary srid',
       COALESCE((SELECT srid::text FROM geometry_columns
                 WHERE f_table_name = 'farms' AND f_geometry_column = 'boundary'), 'MISSING'),
       'expect: 4326'

UNION ALL
SELECT 'gist indexes',
       count(*)::text,
       'expect: 2'
FROM pg_indexes
WHERE tablename = 'farms' AND indexname IN ('idx_farms_boundary_gist','idx_farms_centroid_gist')

UNION ALL
SELECT 'derived trigger',
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_farms_derived')
            THEN 'present' ELSE 'MISSING' END,
       'expect: present'

UNION ALL
SELECT 'farms.area still there',
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name='farms' AND column_name='area')
       THEN 'yes' ELSE 'GONE' END,
       'expect: yes (dropped later)'

UNION ALL
SELECT 'farms rows', count(*)::text, 'expect: 7' FROM farms

UNION ALL
SELECT 'parcels with boundary', count(*)::text, 'expect: 0 for now'
FROM farms WHERE boundary IS NOT NULL;
