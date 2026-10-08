-- ============================================================
-- 010 — Parcel RPC functions
-- ============================================================
-- Run in: Supabase SQL editor, NEW TAB.
-- Requires: 001-009 applied.
--
-- ADDITIVE ONLY. Functions only, no table changes.
--
-- Why these exist: the backend talks to Postgres through the
-- supabase-js query builder, which cannot emit ST_Intersects,
-- ST_Area, ST_DWithin or ST_AsGeoJSON, and PostgREST will not
-- serialise a geometry column at all. So every spatial operation
-- is a function called with .rpc(), and geometry only ever
-- crosses the API boundary as GeoJSON text.
-- ============================================================

BEGIN;

SET LOCAL search_path = public, extensions;

-- ------------------------------------------------------------
-- 0. Keep the legacy area column honest
-- ------------------------------------------------------------
-- farms.area is NOT NULL *and* CHECK (area > 0), so a parcel
-- cannot be inserted without one — but accepting a typed area is
-- exactly the hole 002 closed. Rather than storing a placeholder
-- lie, the derived-area trigger now writes the computed value
-- into the legacy column too. It mirrors area_ha until 011 drops
-- it, so nothing can read a fabricated number in the meantime.
--
-- BEFORE triggers run before CHECK constraints are evaluated, so
-- the constraint sees the computed value, not the placeholder.

CREATE OR REPLACE FUNCTION set_parcel_derived()
RETURNS TRIGGER AS $$
BEGIN
    NEW.area_ha  := ROUND((ST_Area(NEW.boundary::geography) / 10000.0)::numeric, 4);
    NEW.centroid := ST_Centroid(NEW.boundary);
    NEW.area     := NEW.area_ha;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- fn_check_overlap — dry run, writes nothing
-- ------------------------------------------------------------
-- Used while the farmer is still drawing, so a conflict appears
-- before they submit rather than after.

CREATE OR REPLACE FUNCTION fn_check_overlap(p_geojson text)
RETURNS TABLE (
    conflict_farm_id   uuid,
    conflict_name      text,
    intersection_ratio numeric,
    verdict            text,
    area_ha            numeric
) AS $$
DECLARE g geometry;
BEGIN
    g := ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(p_geojson), 4326));

    IF NOT ST_IsValid(g) THEN
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::numeric,
                            'invalid_shape'::text, NULL::numeric;
        RETURN;
    END IF;

    RETURN QUERY
    WITH best AS (
        SELECT f.farm_id, f.name,
               ST_Area(ST_Intersection(f.boundary, g)::geography)
                 / NULLIF(ST_Area(g::geography), 0) AS ratio
        FROM farms f
        WHERE f.boundary IS NOT NULL AND ST_Intersects(f.boundary, g)
        ORDER BY 3 DESC NULLS LAST
        LIMIT 1
    )
    -- Two casts are required here and both are easy to miss:
    --   ::numeric because ST_Area returns double precision and
    --     round(double precision, int) does not exist
    --   ::text    because farms.name is VARCHAR(150) and a
    --     RETURNS TABLE column typed text demands an exact match
    SELECT b.farm_id, b.name::text, ROUND(b.ratio::numeric, 4),
           CASE WHEN b.ratio IS NULL OR b.ratio <= 0.01 THEN 'clear'
                WHEN b.ratio > 0.20                     THEN 'rejected'
                ELSE                                         'flagged' END,
           ROUND((ST_Area(g::geography) / 10000.0)::numeric, 4)
    FROM best b
    UNION ALL
    SELECT NULL::uuid, NULL::text, NULL::numeric, 'clear'::text,
           ROUND((ST_Area(g::geography) / 10000.0)::numeric, 4)
    WHERE NOT EXISTS (SELECT 1 FROM best)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ------------------------------------------------------------
-- fn_create_parcel — the only way a parcel is created
-- ------------------------------------------------------------
-- Area is never accepted from the caller. The legacy farms.area
-- column is NOT NULL, so it is written with a placeholder of 0
-- until migration 011 drops it; every read uses area_ha.
--
-- The overlap and validity triggers from 003 fire on insert, so
-- a duplicate or self-intersecting shape raises here rather than
-- being quietly stored.

CREATE OR REPLACE FUNCTION fn_create_parcel(
    p_farmer_wallet text,
    p_name          text,
    p_geojson       text,
    p_meta          jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    farm_id        uuid,
    area_ha        numeric,
    overlap_status text,
    centroid_lon   double precision,
    centroid_lat   double precision,
    geometry_hash  text
) AS $$
DECLARE
    g      geometry;
    new_id uuid;
BEGIN
    g := ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(p_geojson), 4326));

    INSERT INTO farms (
        name, location, area, created_by, farmer_wallet, boundary,
        gat_number, hissa_number, village, taluka, district, state,
        tenure, season, crop_type, previous_crop, cropping_system,
        water_source, soil_type, soil_depth, slope,
        tillage, residue_management, organic_inputs,
        has_bund, has_trees, uses_fertilizer
    )
    VALUES (
        p_name,
        COALESCE(p_meta->>'village', 'unknown'),
        1,                      -- overwritten by set_parcel_derived()
        LOWER(p_farmer_wallet),
        LOWER(p_farmer_wallet),
        g,
        p_meta->>'gat_number',   p_meta->>'hissa_number',
        p_meta->>'village',      p_meta->>'taluka',
        p_meta->>'district',     COALESCE(p_meta->>'state', 'Maharashtra'),
        p_meta->>'tenure',       p_meta->>'season',
        p_meta->>'crop_type',    p_meta->>'previous_crop',
        p_meta->>'cropping_system', p_meta->>'water_source',
        p_meta->>'soil_type',    p_meta->>'soil_depth',
        p_meta->>'slope',        p_meta->>'tillage',
        p_meta->>'residue_management', p_meta->>'organic_inputs',
        (p_meta->>'has_bund')::boolean,
        (p_meta->>'has_trees')::boolean,
        (p_meta->>'uses_fertilizer')::boolean
    )
    RETURNING farms.farm_id INTO new_id;

    -- A commitment to the normalised shape, so a credit can later
    -- be tied to the exact land it was computed from.
    -- sha256() is built into Postgres 11+; digest() would pull in
    -- pgcrypto, which is not guaranteed to be enabled here.
    UPDATE farms SET geometry_hash = sha256(ST_AsBinary(boundary))
    WHERE farms.farm_id = new_id;

    RETURN QUERY
    SELECT f.farm_id, f.area_ha, f.overlap_status,
           ST_X(f.centroid), ST_Y(f.centroid),
           encode(f.geometry_hash, 'hex')
    FROM farms f WHERE f.farm_id = new_id;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- fn_farmer_parcels — list with geometry as GeoJSON
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_farmer_parcels(p_wallet text)
RETURNS TABLE (
    farm_id        uuid,
    name           text,
    area_ha        numeric,
    village        text,
    taluka         text,
    gat_number     text,
    hissa_number   text,
    soil_type      text,
    water_source   text,
    crop_type      text,
    overlap_status text,
    boundary_json  text,
    centroid_lon   double precision,
    centroid_lat   double precision,
    project_id     uuid,
    project_name   text,
    sample_count   bigint,
    latest_soc     numeric
) AS $$
    -- Columns from the original schema are VARCHAR and must be
    -- cast; the ones added in 004 are already text.
    SELECT f.farm_id, f.name::text, f.area_ha, f.village, f.taluka,
           f.gat_number, f.hissa_number, f.soil_type, f.water_source,
           f.crop_type::text, f.overlap_status,
           ST_AsGeoJSON(f.boundary),
           ST_X(f.centroid), ST_Y(f.centroid),
           p.project_id, p.name::text,
           (SELECT count(*) FROM soil_samples s WHERE s.farm_id = f.farm_id),
           (SELECT s.soc_percent FROM soil_samples s
             WHERE s.farm_id = f.farm_id
             ORDER BY s.sampled_at DESC, s.created_at DESC LIMIT 1)
    FROM farms f
    LEFT JOIN project_members pm ON pm.farm_id = f.farm_id AND pm.status = 'active'
    LEFT JOIN projects p         ON p.project_id = pm.project_id
    WHERE f.farmer_wallet = LOWER(p_wallet)
    ORDER BY f.created_at DESC;
$$ LANGUAGE sql STABLE;

-- ------------------------------------------------------------
-- fn_parcel_geojson — single parcel, for map rendering
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_parcel_geojson(p_farm_id uuid)
RETURNS text AS $$
    SELECT ST_AsGeoJSON(boundary) FROM farms WHERE farm_id = p_farm_id;
$$ LANGUAGE sql STABLE;

COMMIT;

-- ============================================================
-- VERIFICATION
-- ============================================================

DROP TABLE IF EXISTS rpc_test;
CREATE TEMP TABLE rpc_test (seq int, check_name text, result text, expected text);
DELETE FROM farms WHERE name LIKE '\_\_rpc\_%';

DO $$
DECLARE
    w text;
    r record;
    created uuid;
    gj text := '{"type":"Polygon","coordinates":[[[74.70,16.95],[74.700939,16.95],'
            || '[74.700939,16.9509],[74.70,16.9509],[74.70,16.95]]]}';
BEGIN
    SELECT wallet_address INTO w FROM users WHERE role = 'admin' LIMIT 1;

    -- empty ground: should be clear
    SELECT * INTO r FROM fn_check_overlap(gj);
    INSERT INTO rpc_test VALUES (1, 'dry-run on empty ground', r.verdict, 'clear');
    INSERT INTO rpc_test VALUES (2, 'dry-run reports area',
        CASE WHEN r.area_ha BETWEEN 0.9 AND 1.1 THEN 'ok'
             ELSE COALESCE(r.area_ha::text,'null') END, 'ok');

    -- create it
    SELECT * INTO r FROM fn_create_parcel(w, '__rpc_a__', gj,
        '{"village":"Shirgaon","taluka":"Miraj","soil_type":"black",
          "tenure":"owned","water_source":"rainfed","gat_number":"142"}'::jsonb);
    created := r.farm_id;
    INSERT INTO rpc_test VALUES (3, 'parcel created, area derived',
        CASE WHEN r.area_ha BETWEEN 0.9 AND 1.1 THEN 'ok' ELSE r.area_ha::text END, 'ok');
    INSERT INTO rpc_test VALUES (4, 'geometry hash set',
        CASE WHEN length(r.geometry_hash) = 64 THEN 'ok' ELSE 'missing' END, 'ok');

    -- same ground again: now a conflict
    SELECT * INTO r FROM fn_check_overlap(gj);
    INSERT INTO rpc_test VALUES (5, 'dry-run on taken ground', r.verdict, 'rejected');

    -- soil_type mapped by the 004 trigger
    INSERT INTO rpc_test
    SELECT 6, 'soil defaults applied', texture_class || '/' || bulk_density::text, 'clay/1.25'
    FROM farms WHERE farm_id = created;

    -- listing returns GeoJSON
    INSERT INTO rpc_test
    SELECT 7, 'parcel list returns geojson',
           CASE WHEN boundary_json LIKE '{"type":"MultiPolygon"%' THEN 'ok' ELSE 'bad' END, 'ok'
    FROM fn_farmer_parcels(w) WHERE name = '__rpc_a__';

    DELETE FROM farms WHERE farm_id = created;
END $$;

SELECT check_name, result, expected,
       CASE WHEN result = expected THEN 'PASS' ELSE 'FAIL' END AS verdict
FROM rpc_test
UNION ALL
SELECT 'farms rows', count(*)::text, '7',
       CASE WHEN count(*) = 7 THEN 'PASS' ELSE 'FAIL' END FROM farms
ORDER BY 1;
