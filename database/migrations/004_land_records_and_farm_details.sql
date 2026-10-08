-- ============================================================
-- 004 — Land records and farm details (Maharashtra)
-- ============================================================
-- Run in: Supabase SQL editor, NEW TAB.
-- Requires: 001, 002, 003 applied.
--
-- ADDITIVE ONLY.
--
-- Scope rule: every column here is something an Indian
-- smallholder can answer from memory or read off a document
-- they already hold. Nothing asks for pH from recall, nothing
-- asks for bulk density, nothing asks for coordinates.
--
-- farms already has district, state and crop_type, so those
-- are reused rather than duplicated.
-- ============================================================

BEGIN;

SET LOCAL search_path = public, extensions;

-- ------------------------------------------------------------
-- 1. Land identification — from the 7/12 (सातबारा) extract
-- ------------------------------------------------------------
-- Gat number replaced Survey number in Maharashtra after
-- consolidation. A smallholding is usually a hissa (sub-division)
-- of a Gat, not a whole Gat, so both are needed to identify it.

ALTER TABLE farms
    ADD COLUMN IF NOT EXISTS gat_number    text,
    ADD COLUMN IF NOT EXISTS hissa_number  text,
    ADD COLUMN IF NOT EXISTS village       text,
    ADD COLUMN IF NOT EXISTS taluka        text;

CREATE INDEX IF NOT EXISTS idx_farms_village ON farms(village);

-- ------------------------------------------------------------
-- 2. Tenure — a legal gate on crediting
-- ------------------------------------------------------------
-- A tenant cannot sell carbon on land they do not own. Farmers
-- know their tenure precisely, so one question here prevents
-- issuing credits nobody has the right to. Non-owners still get
-- advisory; they are simply not credit-eligible.

ALTER TABLE farms ADD COLUMN IF NOT EXISTS tenure text;
ALTER TABLE farms DROP CONSTRAINT IF EXISTS farms_tenure_check;
ALTER TABLE farms ADD CONSTRAINT farms_tenure_check
    CHECK (tenure IS NULL OR tenure IN ('owned','leased','sharecropped','other'));

-- ------------------------------------------------------------
-- 3. Crop and water
-- ------------------------------------------------------------
-- jirayat (rainfed) vs bagayat (irrigated) is the single most
-- useful thing a farmer can tell us: water is the usual limiting
-- factor and it is a critical context-matching dimension.

ALTER TABLE farms
    ADD COLUMN IF NOT EXISTS season          text,
    ADD COLUMN IF NOT EXISTS previous_crop   text,
    ADD COLUMN IF NOT EXISTS cropping_system text,
    ADD COLUMN IF NOT EXISTS water_source    text,
    ADD COLUMN IF NOT EXISTS water_months    text[];

ALTER TABLE farms DROP CONSTRAINT IF EXISTS farms_season_check;
ALTER TABLE farms ADD CONSTRAINT farms_season_check
    CHECK (season IS NULL OR season IN ('kharif','rabi','summer'));

ALTER TABLE farms DROP CONSTRAINT IF EXISTS farms_cropping_check;
ALTER TABLE farms ADD CONSTRAINT farms_cropping_check
    CHECK (cropping_system IS NULL OR
           cropping_system IN ('single','double','intercrop','fallow_rotation'));

ALTER TABLE farms DROP CONSTRAINT IF EXISTS farms_water_check;
ALTER TABLE farms ADD CONSTRAINT farms_water_check
    CHECK (water_source IS NULL OR
           water_source IN ('rainfed','well','borewell','canal','drip','sprinkler'));

-- ------------------------------------------------------------
-- 4. Soil, in the words a farmer actually uses
-- ------------------------------------------------------------
-- Asking "clay loam" gets a blank look. Asking "kali or murmad"
-- gets an accurate answer. soil_type is what the farmer picks;
-- texture_class (added in 002) is what the reasoning engine
-- reads, and a trigger maps one to the other.

ALTER TABLE farms
    ADD COLUMN IF NOT EXISTS soil_type  text,
    ADD COLUMN IF NOT EXISTS soil_depth text,
    ADD COLUMN IF NOT EXISTS slope      text;

ALTER TABLE farms DROP CONSTRAINT IF EXISTS farms_soil_type_check;
ALTER TABLE farms ADD CONSTRAINT farms_soil_type_check
    CHECK (soil_type IS NULL OR
           soil_type IN ('black','red','sandy','gravelly','loam','clay'));

ALTER TABLE farms DROP CONSTRAINT IF EXISTS farms_soil_depth_check;
ALTER TABLE farms ADD CONSTRAINT farms_soil_depth_check
    CHECK (soil_depth IS NULL OR soil_depth IN ('shallow','medium','deep'));

ALTER TABLE farms DROP CONSTRAINT IF EXISTS farms_slope_check;
ALTER TABLE farms ADD CONSTRAINT farms_slope_check
    CHECK (slope IS NULL OR slope IN ('flat','gentle','sloping'));

-- ------------------------------------------------------------
-- 5. Current practice — the baseline for additionality
-- ------------------------------------------------------------
-- 'fed_to_cattle' is listed separately on purpose: it is the
-- most common fate of residue on an Indian smallholding and it
-- is not the same as retained or burned for carbon purposes.

ALTER TABLE farms
    ADD COLUMN IF NOT EXISTS tillage            text,
    ADD COLUMN IF NOT EXISTS residue_management text,
    ADD COLUMN IF NOT EXISTS organic_inputs     text,
    ADD COLUMN IF NOT EXISTS has_bund           boolean,
    ADD COLUMN IF NOT EXISTS has_trees          boolean,
    ADD COLUMN IF NOT EXISTS uses_fertilizer    boolean;

ALTER TABLE farms DROP CONSTRAINT IF EXISTS farms_tillage_check;
ALTER TABLE farms ADD CONSTRAINT farms_tillage_check
    CHECK (tillage IS NULL OR tillage IN ('conventional','reduced','zero'));

ALTER TABLE farms DROP CONSTRAINT IF EXISTS farms_residue_check;
ALTER TABLE farms ADD CONSTRAINT farms_residue_check
    CHECK (residue_management IS NULL OR
           residue_management IN ('burned','removed','fed_to_cattle','retained'));

ALTER TABLE farms DROP CONSTRAINT IF EXISTS farms_organic_check;
ALTER TABLE farms ADD CONSTRAINT farms_organic_check
    CHECK (organic_inputs IS NULL OR organic_inputs IN ('fym','compost','both','none'));

-- ------------------------------------------------------------
-- 6. The two values the farmer cannot give us
-- ------------------------------------------------------------
-- Carbon stock needs C = SOC%/100 * bulk_density * depth * area.
-- Nobody knows their bulk density, and sampling depth comes from
-- whoever took the sample. Both are therefore ASSUMED, derived
-- from soil type, and recorded as assumed so an issuance record
-- never presents them as measurements.

ALTER TABLE farms
    ADD COLUMN IF NOT EXISTS bulk_density        numeric,
    ADD COLUMN IF NOT EXISTS bulk_density_source text NOT NULL DEFAULT 'assumed_from_soil_type',
    ADD COLUMN IF NOT EXISTS sampling_depth_cm   numeric NOT NULL DEFAULT 15;

ALTER TABLE farms DROP CONSTRAINT IF EXISTS farms_bd_source_check;
ALTER TABLE farms ADD CONSTRAINT farms_bd_source_check
    CHECK (bulk_density_source IN ('assumed_from_soil_type','measured'));

CREATE OR REPLACE FUNCTION derive_soil_defaults()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.soil_type IS NOT NULL THEN
        NEW.texture_class := CASE NEW.soil_type
            WHEN 'black'    THEN 'clay'
            WHEN 'clay'     THEN 'clay'
            WHEN 'red'      THEN 'sandy_loam'
            WHEN 'gravelly' THEN 'sandy_loam'
            WHEN 'sandy'    THEN 'sandy'
            WHEN 'loam'     THEN 'loam'
        END;

        -- Only fill bulk density while it is still an assumption.
        -- A measured value, once set, is never overwritten.
        IF NEW.bulk_density_source = 'assumed_from_soil_type' THEN
            NEW.bulk_density := CASE NEW.soil_type
                WHEN 'black'    THEN 1.25
                WHEN 'clay'     THEN 1.20
                WHEN 'red'      THEN 1.45
                WHEN 'gravelly' THEN 1.50
                WHEN 'sandy'    THEN 1.55
                WHEN 'loam'     THEN 1.35
            END;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_farms_soil_defaults ON farms;
CREATE TRIGGER trg_farms_soil_defaults
    BEFORE INSERT OR UPDATE OF soil_type ON farms
    FOR EACH ROW EXECUTE FUNCTION derive_soil_defaults();

COMMIT;

-- ============================================================
-- VERIFICATION
-- ============================================================

DROP TABLE IF EXISTS land_test;
CREATE TEMP TABLE land_test (seq int, check_name text, result text, expected text);
DELETE FROM farms WHERE name LIKE '\_\_ld\_%';

DO $$
DECLARE
    admin_w text;
    tex     text;
    bd      numeric;
BEGIN
    SELECT wallet_address INTO admin_w FROM users WHERE role = 'admin' LIMIT 1;

    INSERT INTO farms (name, location, area, created_by,
                       gat_number, hissa_number, village, taluka,
                       tenure, season, cropping_system, water_source,
                       soil_type, soil_depth, slope,
                       tillage, residue_management, organic_inputs,
                       has_bund, has_trees)
    VALUES ('__ld_test__', 'Shirgaon', 1.8, admin_w,
            '142', '2A', 'Shirgaon', 'Miraj',
            'owned', 'kharif', 'double', 'rainfed',
            'black', 'medium', 'gentle',
            'conventional', 'fed_to_cattle', 'fym',
            true, false)
    RETURNING texture_class, bulk_density INTO tex, bd;

    INSERT INTO land_test VALUES (1, 'black soil -> texture_class', tex, 'clay');
    INSERT INTO land_test VALUES (2, 'black soil -> bulk_density', bd::text, '1.25');

    DELETE FROM farms WHERE name = '__ld_test__';
END $$;

SELECT check_name, result, expected,
       CASE WHEN result = expected THEN 'PASS' ELSE 'FAIL' END AS verdict
FROM land_test

UNION ALL
SELECT 'new farms columns', count(*)::text, '22',
       CASE WHEN count(*) = 22 THEN 'PASS' ELSE 'FAIL' END
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'farms'
  AND column_name IN ('gat_number','hissa_number','village','taluka','tenure',
                      'season','previous_crop','cropping_system','water_source','water_months',
                      'soil_type','soil_depth','slope','tillage','residue_management',
                      'organic_inputs','has_bund','has_trees','uses_fertilizer',
                      'bulk_density','bulk_density_source','sampling_depth_cm')

UNION ALL
SELECT 'farms rows', count(*)::text, '7',
       CASE WHEN count(*) = 7 THEN 'PASS' ELSE 'FAIL' END
FROM farms;
