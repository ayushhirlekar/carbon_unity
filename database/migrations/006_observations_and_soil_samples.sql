-- ============================================================
-- 006 — Observations, soil samples, Soil Health Card intake
-- ============================================================
-- Run in: Supabase SQL editor, NEW TAB.
-- Requires: 001-005 applied.
--
-- ADDITIVE + a DATA COPY. carbon_data is READ and copied; it is
-- NOT dropped here. Dropping happens in a later file, only once
-- you have confirmed the copy.
--
-- Why: carbon_data holds exactly one row per farm (7 and 7), so
-- there is no baseline and no current reading, so no delta, so
-- nothing to credit against measured change. It also has no
-- measurement date — only created_at — so a baseline cannot be
-- anchored to when a sample was actually taken.
--
-- soil_samples fixes both: a dated series, with the sample date
-- supplied by the farmer from their Soil Health Card.
-- ============================================================

BEGIN;

SET LOCAL search_path = public, extensions;

-- ------------------------------------------------------------
-- 1. farm_observations — the dated series
-- ------------------------------------------------------------
-- Everything lands here regardless of origin: farmer-reported,
-- admin-entered, satellite, weather API, or a physical probe.
-- The reasoning engine reads only this table, so adding sensors
-- later changes nothing downstream.

CREATE TABLE IF NOT EXISTS farm_observations (
    observation_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id        uuid NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
    variable       text NOT NULL,
    value_num      numeric,
    value_text     text,
    unit           text,
    observed_at    date NOT NULL,
    source         text NOT NULL
                       CHECK (source IN ('farmer_reported','admin','remote_sensed','derived','device')),
    quality_flag   text DEFAULT 'ok',
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obs_farm_var
    ON farm_observations(farm_id, variable, observed_at DESC);

-- ------------------------------------------------------------
-- 2. soil_samples — including the Soil Health Card
-- ------------------------------------------------------------
-- The SHC carries 12 parameters and every Indian smallholder
-- receives one. Transcribing it gives a real baseline on day one
-- with no hardware and no cost. Values are only ever COPIED off
-- the card, never asked from memory.

CREATE TABLE IF NOT EXISTS soil_samples (
    sample_id      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id        uuid NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
    sampled_at     date NOT NULL,

    -- the carbon-bearing values
    soc_percent    numeric NOT NULL CHECK (soc_percent > 0),
    bulk_density   numeric NOT NULL CHECK (bulk_density > 0),
    depth_cm       numeric NOT NULL CHECK (depth_cm > 0),

    -- remaining Soil Health Card parameters, all optional
    ph             numeric,
    ec             numeric,
    nitrogen       numeric,
    phosphorus     numeric,
    potassium      numeric,
    sulphur        numeric,
    zinc           numeric,
    boron          numeric,
    iron           numeric,
    manganese      numeric,
    copper         numeric,

    -- derived, computed by trigger
    carbon_stock   numeric,
    co2_equivalent numeric,

    source         text NOT NULL
                       CHECK (source IN ('shc','lab','ml_predicted','farmer_reported','legacy_import')),
    shc_reference  text,
    verified       boolean NOT NULL DEFAULT false,
    verified_by    text,
    verified_at    timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_samples_farm_date
    ON soil_samples(farm_id, sampled_at DESC);

-- ------------------------------------------------------------
-- 3. Carbon stock, computed not typed
-- ------------------------------------------------------------
-- Soil mass per hectare = 10,000 m2 x (depth_cm/100) m x BD,
-- and BD in g/cm3 equals t/m3, so mass = 100 x depth_cm x BD
-- tonnes/ha. Carbon is soc_percent of that, which reduces to
--
--   carbon_stock (t) = soc_percent x BD x depth_cm x area_ha
--
-- Worked: 0.62% x 1.25 x 15cm x 1.8ha = 20.9 t C -> 76.8 t CO2e.
-- 3.67 is the mass ratio of CO2 to C (44/12).
--
-- area_ha comes from the polygon. Where a parcel has no boundary
-- yet, the legacy typed area is used and that is visible in the
-- source column.

CREATE OR REPLACE FUNCTION compute_sample_carbon()
RETURNS TRIGGER AS $$
DECLARE a numeric;
BEGIN
    SELECT COALESCE(area_ha, area) INTO a FROM farms WHERE farm_id = NEW.farm_id;

    IF a IS NOT NULL THEN
        NEW.carbon_stock   := ROUND((NEW.soc_percent * NEW.bulk_density
                                     * NEW.depth_cm * a)::numeric, 4);
        NEW.co2_equivalent := ROUND((NEW.carbon_stock * 3.67)::numeric, 4);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_samples_carbon ON soil_samples;
CREATE TRIGGER trg_samples_carbon
    BEFORE INSERT OR UPDATE OF soc_percent, bulk_density, depth_cm ON soil_samples
    FOR EACH ROW EXECUTE FUNCTION compute_sample_carbon();

-- ------------------------------------------------------------
-- 4. Copy carbon_data across
-- ------------------------------------------------------------
-- source = 'legacy_import' rather than 'farmer_reported': we do
-- not actually know who reported these, and saying so is better
-- than inventing a provenance.
--
-- sampled_at can only be created_at::date, because carbon_data
-- never recorded when the sample was taken. Noted as a known
-- limitation of the imported rows.
--
-- credits_generated is not carried over — it is an issuance
-- concept, recomputable from carbon_stock, and it remains in
-- both carbon_data and the backup table.

INSERT INTO soil_samples (farm_id, sampled_at, soc_percent, bulk_density, depth_cm,
                          carbon_stock, co2_equivalent, source, verified, verified_by)
SELECT cd.farm_id,
       cd.created_at::date,
       cd.soc,
       cd.bulk_density,
       cd.depth,
       cd.carbon_stock,
       cd.co2_equivalent,
       'legacy_import',
       cd.verified,
       cd.verified_by
FROM carbon_data cd
WHERE NOT EXISTS (
    SELECT 1 FROM soil_samples s
    WHERE s.farm_id = cd.farm_id
      AND s.sampled_at = cd.created_at::date
      AND s.source = 'legacy_import'
);

COMMIT;

-- ============================================================
-- VERIFICATION — the copy must match row for row
-- ============================================================

DROP TABLE IF EXISTS obs_test;
CREATE TEMP TABLE obs_test (seq int, check_name text, result text, expected text);

DO $$
DECLARE
    admin_w text;
    f1 uuid;
    cs numeric;
BEGIN
    SELECT wallet_address INTO admin_w FROM users WHERE role = 'admin' LIMIT 1;

    DELETE FROM farms WHERE name LIKE '\_\_sc\_%';

    INSERT INTO farms (name, location, area, created_by, soil_type, boundary)
    VALUES ('__sc_farm__', 'Shirgaon', 999, admin_w, 'black', ST_Multi(ST_GeomFromText(
        'POLYGON((74.600000 16.900000, 74.601878 16.900000, '
     || '74.601878 16.901800, 74.600000 16.901800, 74.600000 16.900000))', 4326)))
    RETURNING farm_id INTO f1;

    -- A Soil Health Card transcription
    INSERT INTO soil_samples (farm_id, sampled_at, soc_percent, bulk_density, depth_cm,
                              ph, ec, nitrogen, source, shc_reference)
    VALUES (f1, '2026-06-15', 0.62, 1.25, 15, 7.4, 0.35, 180, 'shc', 'SHC/MH/2026/0142')
    RETURNING carbon_stock INTO cs;

    INSERT INTO obs_test VALUES (1, 'carbon_stock computed',
        CASE WHEN cs > 0 THEN 'ok' ELSE 'zero' END, 'ok');

    -- Tolerance, not an exact value. The parcel is nominally 200m x
    -- 200m = 4 ha, but that is hand-converted from degrees; the
    -- spheroid puts it at ~3.98 ha, so the stock lands near 46.3
    -- rather than 46.5. A 2% band tests the formula without
    -- asserting my own approximation.
    INSERT INTO obs_test VALUES (2, 'carbon_stock within 2% of 46.5',
        CASE WHEN cs BETWEEN 45.6 AND 47.4 THEN 'ok'
             ELSE ROUND(cs, 2)::text END, 'ok');

    INSERT INTO farm_observations (farm_id, variable, value_num, unit, observed_at, source)
    VALUES (f1, 'moisture_percent', 11.0, '%', CURRENT_DATE, 'farmer_reported');
    INSERT INTO obs_test
    SELECT 3, 'observation stored', count(*)::text, '1'
    FROM farm_observations WHERE farm_id = f1;

    DELETE FROM farms WHERE farm_id = f1;
END $$;

SELECT check_name, result, expected,
       CASE WHEN result = expected THEN 'PASS' ELSE 'FAIL' END AS verdict
FROM obs_test

UNION ALL
SELECT 'carbon_data rows', count(*)::text, '7',
       CASE WHEN count(*) = 7 THEN 'PASS' ELSE 'FAIL' END FROM carbon_data

UNION ALL
SELECT 'legacy rows copied', count(*)::text, '7',
       CASE WHEN count(*) = 7 THEN 'PASS' ELSE 'FAIL' END
FROM soil_samples WHERE source = 'legacy_import'

UNION ALL
SELECT 'soc values match',
       CASE WHEN NOT EXISTS (
           SELECT 1 FROM carbon_data cd
           JOIN soil_samples s ON s.farm_id = cd.farm_id AND s.source = 'legacy_import'
           WHERE cd.soc <> s.soc_percent OR cd.bulk_density <> s.bulk_density
       ) THEN 'identical' ELSE 'MISMATCH' END,
       'identical',
       CASE WHEN NOT EXISTS (
           SELECT 1 FROM carbon_data cd
           JOIN soil_samples s ON s.farm_id = cd.farm_id AND s.source = 'legacy_import'
           WHERE cd.soc <> s.soc_percent OR cd.bulk_density <> s.bulk_density
       ) THEN 'PASS' ELSE 'FAIL' END

UNION ALL
SELECT 'farms rows', count(*)::text, '7',
       CASE WHEN count(*) = 7 THEN 'PASS' ELSE 'FAIL' END FROM farms;
