-- ============================================================
-- 003 — Overlap detection and spatial deduplication
-- ============================================================
-- Run in: Supabase SQL editor, NEW TAB.
-- Requires: migrations 001 and 002 applied.
--
-- ADDITIVE ONLY. One new table, two triggers.
--
-- Why this file exists: the same land registered twice earns
-- credits twice. This is the double-counting problem, and a
-- controller check cannot enforce it — only the database sees
-- every write.
--
-- Three bands, and the middle one is the point:
--   ratio > 20%        reject outright, name the conflict
--   1% < ratio <= 20%  accept but flag for human review
--   ratio <= 1%        accept silently
--
-- The 1% tolerance is REQUIRED, not lenient. Hand-drawn
-- boundaries and consumer GPS routinely produce sliver
-- intersections between plots that genuinely abut. Zero
-- tolerance would reject exactly the adjacent smallholders
-- this platform exists to serve.
-- ============================================================

BEGIN;

SET LOCAL search_path = public, extensions;

-- ------------------------------------------------------------
-- 1. Review queue for flagged pairs
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS overlap_flags (
    flag_id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id             uuid NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
    conflicting_farm_id uuid NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
    intersection_ratio  numeric NOT NULL,
    status              text NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','reviewed_ok','rejected')),
    reviewed_by         text,
    resolution_note     text,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_overlap_flags_farm   ON overlap_flags(farm_id);
CREATE INDEX IF NOT EXISTS idx_overlap_flags_status ON overlap_flags(status);

-- ------------------------------------------------------------
-- 2. BEFORE: validate the shape, measure the overlap, decide
-- ------------------------------------------------------------
-- Never EXCLUDE USING gist (boundary WITH &&) — the && operator
-- compares bounding boxes, so two L-shaped neighbours that share
-- no actual ground would collide.

CREATE OR REPLACE FUNCTION check_boundary_overlap()
RETURNS TRIGGER AS $$
DECLARE
    conflict_id   uuid;
    conflict_name text;
    ratio         numeric;
BEGIN
    IF NOT ST_IsValid(NEW.boundary) THEN
        RAISE EXCEPTION 'Parcel boundary is not a valid shape: %',
            ST_IsValidReason(NEW.boundary)
            USING HINT = 'The outline crosses itself. Redraw without crossing lines.';
    END IF;

    SELECT f.farm_id,
           f.name,
           ST_Area(ST_Intersection(f.boundary, NEW.boundary)::geography)
             / NULLIF(ST_Area(NEW.boundary::geography), 0)
      INTO conflict_id, conflict_name, ratio
    FROM farms f
    WHERE f.farm_id <> NEW.farm_id
      AND f.boundary IS NOT NULL
      AND ST_Intersects(f.boundary, NEW.boundary)
    ORDER BY 3 DESC NULLS LAST
    LIMIT 1;

    IF ratio IS NULL OR ratio <= 0.01 THEN
        NEW.overlap_status := 'clear';
    ELSIF ratio > 0.20 THEN
        RAISE EXCEPTION 'Parcel overlaps "%" by % percent',
            conflict_name, ROUND(ratio * 100, 1)
            USING HINT = 'This land is already registered. Check the boundary.';
    ELSE
        NEW.overlap_status := 'flagged';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_farms_overlap_check ON farms;
CREATE TRIGGER trg_farms_overlap_check
    BEFORE INSERT OR UPDATE OF boundary ON farms
    FOR EACH ROW
    WHEN (NEW.boundary IS NOT NULL)
    EXECUTE FUNCTION check_boundary_overlap();

-- ------------------------------------------------------------
-- 3. AFTER: record the flag
-- ------------------------------------------------------------
-- This MUST be a separate AFTER trigger. A BEFORE INSERT trigger
-- cannot write overlap_flags, because the farms row it references
-- does not exist yet and the foreign key fails.

CREATE OR REPLACE FUNCTION record_overlap_flag()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO overlap_flags (farm_id, conflicting_farm_id, intersection_ratio)
    SELECT NEW.farm_id,
           f.farm_id,
           ST_Area(ST_Intersection(f.boundary, NEW.boundary)::geography)
             / NULLIF(ST_Area(NEW.boundary::geography), 0)
    FROM farms f
    WHERE f.farm_id <> NEW.farm_id
      AND f.boundary IS NOT NULL
      AND ST_Intersects(f.boundary, NEW.boundary)
      AND ST_Area(ST_Intersection(f.boundary, NEW.boundary)::geography)
            / NULLIF(ST_Area(NEW.boundary::geography), 0) > 0.01;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_farms_overlap_flag ON farms;
CREATE TRIGGER trg_farms_overlap_flag
    AFTER INSERT OR UPDATE OF boundary ON farms
    FOR EACH ROW
    WHEN (NEW.overlap_status = 'flagged')
    EXECUTE FUNCTION record_overlap_flag();

COMMIT;

-- ============================================================
-- VERIFICATION — exercises all four behaviours, then cleans up
-- ============================================================

-- Dropped first: a previous failed run may have left it behind in
-- this session, and CREATE TEMP TABLE would then fail confusingly.
DROP TABLE IF EXISTS overlap_test;
CREATE TEMP TABLE overlap_test (seq int, check_name text, result text, expected text);

-- Also clear any test parcels left by an interrupted run.
DELETE FROM farms WHERE name LIKE '\_\_ov\_%';

DO $$
DECLARE
    admin_w text;
    base_id uuid;
    st      text;
    flags   int;
BEGIN
    SELECT wallet_address INTO admin_w FROM users WHERE role = 'admin' LIMIT 1;

    -- Base parcel: 100 m square near Sangli
    INSERT INTO farms (name, location, area, created_by, boundary)
    VALUES ('__ov_base__', 'test', 1, admin_w, ST_Multi(ST_GeomFromText(
        'POLYGON((74.560000 16.850000, 74.560939 16.850000, '
     || '74.560939 16.850900, 74.560000 16.850900, 74.560000 16.850000))', 4326)))
    RETURNING farm_id INTO base_id;
    INSERT INTO overlap_test VALUES (1, 'base parcel inserted', 'ok', 'ok');

    -- A. identical parcel -> must be rejected
    BEGIN
        INSERT INTO farms (name, location, area, created_by, boundary)
        VALUES ('__ov_dup__', 'test', 1, admin_w, ST_Multi(ST_GeomFromText(
            'POLYGON((74.560000 16.850000, 74.560939 16.850000, '
         || '74.560939 16.850900, 74.560000 16.850900, 74.560000 16.850000))', 4326)));
        INSERT INTO overlap_test VALUES (2, 'identical parcel', 'ACCEPTED', 'rejected');
    EXCEPTION WHEN others THEN
        INSERT INTO overlap_test VALUES (2, 'identical parcel', 'rejected', 'rejected');
    END;

    -- B. ~5% overlap -> accepted but flagged
    INSERT INTO farms (name, location, area, created_by, boundary)
    VALUES ('__ov_5pct__', 'test', 1, admin_w, ST_Multi(ST_GeomFromText(
        'POLYGON((74.560892 16.850000, 74.561831 16.850000, '
     || '74.561831 16.850900, 74.560892 16.850900, 74.560892 16.850000))', 4326)))
    RETURNING overlap_status INTO st;
    INSERT INTO overlap_test VALUES (3, '5% overlap status', st, 'flagged');

    SELECT count(*) INTO flags FROM overlap_flags
    WHERE farm_id = (SELECT farm_id FROM farms WHERE name = '__ov_5pct__');
    INSERT INTO overlap_test VALUES (4, '5% overlap flag row', flags::text, '1');

    -- C. shares an edge exactly -> must be accepted clean.
    -- Placed WEST of the base parcel: the east side is already
    -- occupied by __ov_5pct__, so a neighbour there would overlap
    -- that instead and be rejected for the wrong reason.
    INSERT INTO farms (name, location, area, created_by, boundary)
    VALUES ('__ov_adj__', 'test', 1, admin_w, ST_Multi(ST_GeomFromText(
        'POLYGON((74.559061 16.850000, 74.560000 16.850000, '
     || '74.560000 16.850900, 74.559061 16.850900, 74.559061 16.850000))', 4326)))
    RETURNING overlap_status INTO st;
    INSERT INTO overlap_test VALUES (5, 'edge-adjacent neighbour', st, 'clear');

    -- D. self-intersecting bowtie -> must be rejected
    BEGIN
        INSERT INTO farms (name, location, area, created_by, boundary)
        VALUES ('__ov_bow__', 'test', 1, admin_w, ST_Multi(ST_GeomFromText(
            'POLYGON((74.570000 16.860000, 74.571000 16.861000, '
         || '74.571000 16.860000, 74.570000 16.861000, 74.570000 16.860000))', 4326)));
        INSERT INTO overlap_test VALUES (6, 'self-intersecting shape', 'ACCEPTED', 'rejected');
    EXCEPTION WHEN others THEN
        INSERT INTO overlap_test VALUES (6, 'self-intersecting shape', 'rejected', 'rejected');
    END;

    DELETE FROM farms WHERE name LIKE '\_\_ov\_%';
    INSERT INTO overlap_test
    SELECT 7, 'farms rows after cleanup', count(*)::text, '7' FROM farms;
END $$;

SELECT check_name, result, expected,
       CASE WHEN result = expected THEN 'PASS' ELSE 'FAIL' END AS verdict
FROM overlap_test ORDER BY seq;
