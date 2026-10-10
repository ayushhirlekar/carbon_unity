-- ============================================================
-- 015 — Demo farm seed for AI agent testing
-- ============================================================
-- Run in: Supabase SQL editor, NEW TAB.
-- Requires: 001-014 applied.
--
-- PURPOSE:
--   The AI agent's reasoning engine only produces rich advice
--   when a farm has:
--     1. soc_percent and moisture_percent populated (critical vars)
--     2. soil_type, texture_class, cropping_system, water_source
--        (required for context-matching evidence claims)
--     3. Two soil samples (baseline + current) for carbon crediting
--     4. Recent farm_observations (moisture, NDVI, rainfall)
--     5. climate_zone set (for threshold lookup)
--
--   Without these, assess() returns status='insufficient_data'
--   and the template falls back to "not enough information".
--
-- SAFE TO RERUN: uses ON CONFLICT DO NOTHING / WHERE NOT EXISTS.
-- Does NOT touch any existing farmer accounts or farm rows.
-- Creates one demo farmer user + one well-populated demo farm.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Demo farmer user (wallet address is a dummy for testing)
-- ------------------------------------------------------------
INSERT INTO users (
    wallet_address, display_name, role, preferred_language
)
VALUES (
    '0xdemo0000000000000000000000000000000000001',
    'Demo Farmer',
    'farmer',
    'mr'
)
ON CONFLICT (wallet_address) DO NOTHING;

-- ------------------------------------------------------------
-- 2. Demo farm — fully populated so the reasoning engine fires
-- ------------------------------------------------------------
-- All critical fields filled:
--   soil_type         -> triggers texture_class + bulk_density
--   cropping_system   -> 'double' matches evidence claims
--   water_source      -> 'rainfed' is the most common in Maharashtra
--   climate_zone      -> 'semi_arid' selects the right thresholds
--   village/taluka    -> real Maharashtra geography
-- ------------------------------------------------------------
INSERT INTO farms (
    name, location, area, area_ha,
    created_by, farmer_wallet,
    gat_number, hissa_number, village, taluka, district, state,
    tenure, season, cropping_system, water_source,
    soil_type, soil_depth, slope,
    tillage, residue_management, organic_inputs,
    has_bund, has_trees, uses_fertilizer,
    climate_zone,
    boundary
)
SELECT
    'Demo Farm - Shirgaon',
    'Shirgaon, Sangli',
    1.8, 1.8,
    (SELECT wallet_address FROM users WHERE role = 'admin' LIMIT 1),
    '0xdemo0000000000000000000000000000000000001',
    '142', '2A', 'Shirgaon', 'Miraj', 'Sangli', 'Maharashtra',
    'owned', 'kharif', 'double', 'rainfed',
    'black', 'medium', 'gentle',
    'conventional', 'fed_to_cattle', 'fym',
    true, false, true,
    'semi_arid',
    ST_Multi(ST_GeomFromText(
        'POLYGON((74.6200 16.9050, 74.6218 16.9050, 74.6218 16.9068, 74.6200 16.9068, 74.6200 16.9050))',
        4326
    ))
WHERE NOT EXISTS (
    SELECT 1 FROM farms WHERE name = 'Demo Farm - Shirgaon'
);

-- ------------------------------------------------------------
-- 3. Soil samples — baseline (2 years ago) + current reading
-- ------------------------------------------------------------
-- Two readings = delta = carbon gain = crediting engine fires.
-- Values are representative of a recovering semi-arid black soil.
-- ------------------------------------------------------------
WITH demo AS (
    SELECT farm_id FROM farms WHERE name = 'Demo Farm - Shirgaon' LIMIT 1
)
INSERT INTO soil_samples (
    farm_id, sampled_at, soc_percent, bulk_density, depth_cm,
    ph, ec, nitrogen, phosphorus, potassium,
    source, shc_reference, verified
)
SELECT
    d.farm_id, vals.sampled_at, vals.soc_percent,
    1.25, 15,
    vals.ph, 0.32, vals.nitrogen, 22, 185,
    'shc', vals.shc_ref, false
FROM demo d,
(VALUES
    ('2024-06-10'::date, 0.48::numeric, 7.2::numeric, 165::numeric, 'SHC/MH/2024/0512'),
    ('2026-06-15'::date, 0.61::numeric, 7.4::numeric, 172::numeric, 'SHC/MH/2026/0142')
) AS vals(sampled_at, soc_percent, ph, nitrogen, shc_ref)
WHERE NOT EXISTS (
    SELECT 1 FROM soil_samples ss
    JOIN demo d2 ON ss.farm_id = d2.farm_id
    WHERE ss.sampled_at = vals.sampled_at
);

-- ------------------------------------------------------------
-- 4. Farm observations — the sensing feed the agent reads
-- ------------------------------------------------------------
-- moisture_percent is CRITICAL: without it the suitability scorer
-- cannot produce a limiting factor and returns 'insufficient_data'.
-- ndvi_proxy shows canopy stress.
-- annual_rainfall_mm is used for context matching rainfall band.
-- ------------------------------------------------------------
WITH demo AS (
    SELECT farm_id FROM farms WHERE name = 'Demo Farm - Shirgaon' LIMIT 1
)
INSERT INTO farm_observations (
    farm_id, variable, value_num, unit, observed_at, source, quality_flag
)
SELECT d.farm_id, obs.variable, obs.value_num, obs.unit, obs.observed_at, obs.source, 'ok'
FROM demo d,
(VALUES
    ('moisture_percent', 14.5::numeric, '%',       CURRENT_DATE,       'remote_sensed'),
    ('moisture_percent', 13.8::numeric, '%',       CURRENT_DATE - 3,   'remote_sensed'),
    ('moisture_percent', 12.1::numeric, '%',       CURRENT_DATE - 6,   'remote_sensed'),
    ('ndvi_proxy',       0.38::numeric, 'index',   CURRENT_DATE - 1,   'remote_sensed'),
    ('ndvi_proxy',       0.35::numeric, 'index',   CURRENT_DATE - 8,   'remote_sensed'),
    ('annual_rainfall_mm', 680::numeric, 'mm',     CURRENT_DATE,       'derived'),
    ('moisture_percent', 18.2::numeric, '%',       CURRENT_DATE - 14,  'remote_sensed'),
    ('moisture_percent', 21.0::numeric, '%',       CURRENT_DATE - 21,  'remote_sensed')
) AS obs(variable, value_num, unit, observed_at, source)
WHERE NOT EXISTS (
    SELECT 1 FROM farm_observations fo
    JOIN demo d2 ON fo.farm_id = d2.farm_id
    WHERE fo.variable = obs.variable
      AND fo.observed_at = obs.observed_at
);

COMMIT;

-- ============================================================
-- VERIFICATION — run this to confirm everything seeded OK
-- ============================================================

SELECT 'demo farm exists' AS check_name,
       CASE WHEN EXISTS (SELECT 1 FROM farms WHERE name = 'Demo Farm - Shirgaon')
            THEN 'PASS' ELSE 'FAIL' END AS verdict

UNION ALL SELECT 'demo farmer linked',
    CASE WHEN EXISTS (
        SELECT 1 FROM farms f
        JOIN users u ON f.farmer_wallet = u.wallet_address
        WHERE f.name = 'Demo Farm - Shirgaon'
          AND u.role = 'farmer'
    ) THEN 'PASS' ELSE 'FAIL' END

UNION ALL SELECT 'texture_class derived from soil_type',
    CASE WHEN EXISTS (
        SELECT 1 FROM farms WHERE name = 'Demo Farm - Shirgaon'
          AND soil_type = 'black' AND texture_class IS NOT NULL
    ) THEN 'PASS' ELSE 'FAIL' END

UNION ALL SELECT 'two soil samples (carbon delta required)',
    CASE WHEN (
        SELECT count(*) FROM soil_samples ss
        JOIN farms f ON ss.farm_id = f.farm_id
        WHERE f.name = 'Demo Farm - Shirgaon'
    ) >= 2 THEN 'PASS' ELSE 'FAIL' END

UNION ALL SELECT 'carbon gain detected (baseline to current)',
    CASE WHEN (
        SELECT max(soc_percent) - min(soc_percent)
        FROM soil_samples ss
        JOIN farms f ON ss.farm_id = f.farm_id
        WHERE f.name = 'Demo Farm - Shirgaon'
    ) > 0 THEN 'GAIN - PASS' ELSE 'NO GAIN - FAIL' END

UNION ALL SELECT 'moisture_percent observations present (critical)',
    CASE WHEN (
        SELECT count(*) FROM farm_observations fo
        JOIN farms f ON fo.farm_id = f.farm_id
        WHERE f.name = 'Demo Farm - Shirgaon'
          AND fo.variable = 'moisture_percent'
    ) >= 3 THEN 'PASS' ELSE 'FAIL' END

UNION ALL SELECT 'climate_zone = semi_arid',
    CASE WHEN EXISTS (
        SELECT 1 FROM farms WHERE name = 'Demo Farm - Shirgaon'
          AND climate_zone = 'semi_arid'
    ) THEN 'PASS' ELSE 'FAIL' END

UNION ALL SELECT 'cropping_system set (evidence matching)',
    CASE WHEN EXISTS (
        SELECT 1 FROM farms WHERE name = 'Demo Farm - Shirgaon'
          AND cropping_system IS NOT NULL
    ) THEN 'PASS' ELSE 'FAIL' END;
