-- ============================================================
-- 013 — Sensing support
-- ============================================================
-- Run in: Supabase SQL editor, NEW TAB.
-- Requires: 001-012 applied.
--
-- ADDITIVE ONLY. One function, one table, extra thresholds.
--
-- The weather feed needs every parcel's centroid as plain
-- numbers. PostgREST will not serialise a geometry column, so
-- like every other spatial read this goes through a function.
-- ============================================================

BEGIN;

SET LOCAL search_path = public, extensions;

-- ------------------------------------------------------------
-- 1. Centroids for the scheduler
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_all_parcel_centroids()
RETURNS TABLE (
    farm_id      uuid,
    name         text,
    centroid_lat double precision,
    centroid_lon double precision
) AS $$
    SELECT farm_id, name::text, ST_Y(centroid), ST_X(centroid)
    FROM farms
    WHERE centroid IS NOT NULL;
$$ LANGUAGE sql STABLE;

-- ------------------------------------------------------------
-- 2. Feed run log
-- ------------------------------------------------------------
-- So "no new data" can be distinguished from "the feed broke".
-- Without this a stale dashboard looks identical to a quiet one.

CREATE TABLE IF NOT EXISTS sensing_runs (
    run_id       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    feed         text NOT NULL,
    started_at   timestamptz NOT NULL DEFAULT now(),
    finished_at  timestamptz,
    parcels_seen int,
    rows_written int,
    errors       int DEFAULT 0,
    detail       jsonb
);

CREATE INDEX IF NOT EXISTS idx_sensing_runs_time ON sensing_runs(feed, started_at DESC);

-- ------------------------------------------------------------
-- 3. Thresholds for the new variables
-- ------------------------------------------------------------
-- days_since_rain is a ramp in reverse: zero days is ideal and
-- suitability falls as the dry spell lengthens, so lo and hi are
-- inverted deliberately rather than by mistake.

INSERT INTO suitability_thresholds (variable, zone, kind, lo, hi, unit, critical, basis) VALUES
('days_since_rain','semi_arid','ramp', 21, 0,'days', false,
 'Inverted ramp: 0 days since rain is ideal, 21 or more is a serious dry spell for a rainfed crop.'),
('soil_temp_c','semi_arid','band', NULL, NULL,'C', false,
 'Placeholder band; root-zone temperature matters mainly at the extremes.'),
('rain_next_7d_mm','semi_arid','ramp', 0, 40,'mm', false,
 'Forecast rain in the coming week. Informs irrigation timing rather than diagnosis.')
ON CONFLICT (variable, zone) DO NOTHING;

UPDATE suitability_thresholds
   SET centre = 27, half_width = 12
 WHERE variable = 'soil_temp_c' AND zone = 'semi_arid';

-- ------------------------------------------------------------
-- 4. Causal edges for the weather variables
-- ------------------------------------------------------------

INSERT INTO causal_relationships (rel_id, from_var, to_var, weight, direction, basis) VALUES
('R11','days_since_rain','moisture_percent', 0.60,'negative','A lengthening dry spell drains the root zone.'),
('R12','et0_mm','moisture_percent',          0.40,'negative','Evapotranspiration is the loss term in the water balance.'),
('R13','annual_rainfall_mm','moisture_percent',0.35,'positive','Sets the baseline water a rainfed plot can expect.')
ON CONFLICT (rel_id) DO NOTHING;

COMMIT;

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT 'centroid function' AS check_name,
       count(*)::text AS result, 'one row per parcel with geometry' AS expected,
       'INFO' AS verdict
FROM fn_all_parcel_centroids()

UNION ALL
SELECT 'sensing_runs table',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables
                         WHERE table_schema='public' AND table_name='sensing_runs')
            THEN 'present' ELSE 'MISSING' END, 'present',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables
                         WHERE table_schema='public' AND table_name='sensing_runs')
            THEN 'PASS' ELSE 'FAIL' END

UNION ALL
SELECT 'thresholds total', count(*)::text, '8',
       CASE WHEN count(*) = 8 THEN 'PASS' ELSE 'FAIL' END
FROM suitability_thresholds WHERE zone = 'semi_arid'

UNION ALL
SELECT 'causal edges total', count(*)::text, '13',
       CASE WHEN count(*) = 13 THEN 'PASS' ELSE 'FAIL' END
FROM causal_relationships;
