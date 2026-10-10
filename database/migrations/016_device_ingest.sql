-- ============================================================
-- 016 — Device registry and observation provenance
-- ============================================================
-- Run in: Supabase SQL editor, NEW TAB. Requires 001-013.
-- (015 is demo seed and independent; 014 RLS is not required.)
--
-- ADDITIVE ONLY. No DROP of any table, column or constraint
-- except the source CHECK, which is replaced by a wider one —
-- every value previously allowed is still allowed.
--
-- ############################################################
-- ## ROLLBACK ##
-- ############################################################
-- BEGIN;
-- ALTER TABLE farm_observations DROP COLUMN IF EXISTS device_id;
-- DROP TABLE IF EXISTS iot_devices;
-- ALTER TABLE farm_observations DROP CONSTRAINT IF EXISTS farm_observations_source_check;
-- ALTER TABLE farm_observations ADD CONSTRAINT farm_observations_source_check
--     CHECK (source IN ('farmer_reported','admin','remote_sensed','derived','device'));
-- COMMIT;
-- ############################################################
--
-- WHY A DEVICE TABLE AT ALL, WITH NO HARDWARE YET
-- The ingest path is written as production code so that real
-- hardware later changes only which process posts to it. A demo
-- that fakes the ingest path would have to be rewritten the day a
-- probe arrives; this one does not.
--
-- WHY THE KEY IS HASHED
-- A device table is precisely the kind of thing that leaks, and a
-- device key is not merely read access: it writes observations
-- that feed the reasoning engine, which feeds the advice a farmer
-- acts on. So the key is stored as a SHA-256 hex digest, shown to
-- the farmer once at creation and never recoverable afterwards.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Device registry
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS iot_devices (
    device_id     text PRIMARY KEY,
    farm_id       uuid NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,

    -- What kind of thing this is. Open text rather than an enum:
    -- the set of device types is not knowable yet and an enum
    -- would need a migration per new sensor.
    device_type   text NOT NULL DEFAULT 'soil_probe',
    label         text,

    -- SHA-256 hex of the key. Never the key itself.
    api_key_hash  text NOT NULL,

    -- The honesty flag. Everything downstream reads this to label
    -- simulated data in the UI, so a demo reading can never be
    -- mistaken for a measurement from a real field.
    is_simulated  boolean NOT NULL DEFAULT true,

    is_active     boolean NOT NULL DEFAULT true,
    last_seen     timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    created_by    text
);

CREATE INDEX IF NOT EXISTS idx_iot_devices_farm ON iot_devices(farm_id);
CREATE INDEX IF NOT EXISTS idx_iot_devices_hash ON iot_devices(api_key_hash);

-- ------------------------------------------------------------
-- 2. Provenance on the observation itself
-- ------------------------------------------------------------
-- device_id answers "which thing reported this", and the widened
-- source answers "what kind of thing". Both live on the row rather
-- than behind a join, because the evidence panel and the numeric
-- guard read observations directly and honest labelling must not
-- depend on the caller remembering to join.
ALTER TABLE farm_observations
    ADD COLUMN IF NOT EXISTS device_id text REFERENCES iot_devices(device_id) ON DELETE SET NULL;

ALTER TABLE farm_observations DROP CONSTRAINT IF EXISTS farm_observations_source_check;
ALTER TABLE farm_observations ADD CONSTRAINT farm_observations_source_check
    CHECK (source IN ('farmer_reported','admin','remote_sensed','derived','device','simulated'));

-- ------------------------------------------------------------
-- 3. The index the trend queries need
-- ------------------------------------------------------------
-- get_trend() asks for one variable on one farm ordered by time.
-- Without this it is a sequential scan per question asked, and the
-- simulator makes that table grow fast.
CREATE INDEX IF NOT EXISTS idx_obs_farm_variable_time
    ON farm_observations(farm_id, variable, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_obs_device_time
    ON farm_observations(device_id, observed_at DESC)
    WHERE device_id IS NOT NULL;

-- ------------------------------------------------------------
-- 4. Key hashing helper
-- ------------------------------------------------------------
-- sha256() rather than digest(), so this needs no pgcrypto — the
-- same choice made in 010 and for the same reason.
CREATE OR REPLACE FUNCTION fn_hash_device_key(p_key text)
RETURNS text AS $$
    SELECT encode(sha256(p_key::bytea), 'hex');
$$ LANGUAGE sql IMMUTABLE;

-- ------------------------------------------------------------
-- 5. Authenticate a device by raw key
-- ------------------------------------------------------------
-- Returns the device row for a valid, active key and nothing at
-- all otherwise. Kept in SQL so the comparison happens against the
-- stored hash and the raw key never needs to leave the request.
CREATE OR REPLACE FUNCTION fn_device_by_key(p_key text)
RETURNS TABLE (
    device_id    text,
    farm_id      uuid,
    device_type  text,
    is_simulated boolean
) AS $$
    SELECT d.device_id, d.farm_id, d.device_type::text, d.is_simulated
    FROM iot_devices d
    WHERE d.api_key_hash = fn_hash_device_key(p_key)
      AND d.is_active = true;
$$ LANGUAGE sql STABLE;

COMMIT;

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT 'iot_devices table' AS check_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables
                         WHERE table_name = 'iot_devices')
            THEN 'PASS' ELSE 'FAIL' END AS verdict

UNION ALL SELECT 'farm_observations.device_id',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name = 'farm_observations' AND column_name = 'device_id')
         THEN 'PASS' ELSE 'FAIL' END

UNION ALL SELECT 'source accepts simulated',
    CASE WHEN (SELECT pg_get_constraintdef(oid) FROM pg_constraint
               WHERE conname = 'farm_observations_source_check') LIKE '%simulated%'
         THEN 'PASS' ELSE 'FAIL' END

UNION ALL SELECT 'source still accepts remote_sensed (nothing lost)',
    CASE WHEN (SELECT pg_get_constraintdef(oid) FROM pg_constraint
               WHERE conname = 'farm_observations_source_check') LIKE '%remote_sensed%'
         THEN 'PASS' ELSE 'FAIL' END

UNION ALL SELECT 'trend index present',
    CASE WHEN EXISTS (SELECT 1 FROM pg_indexes
                      WHERE indexname = 'idx_obs_farm_variable_time')
         THEN 'PASS' ELSE 'FAIL' END

-- The known SHA-256 of the string 'test', so this checks the
-- function is actually SHA-256 and not merely returning something
-- 64 characters long.
UNION ALL SELECT 'hash function is sha256',
    CASE WHEN fn_hash_device_key('test') =
              '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
         THEN 'PASS' ELSE 'FAIL' END

UNION ALL SELECT 'existing observations intact',
    CASE WHEN (SELECT count(*) FROM farm_observations) >= 9
         THEN 'PASS' ELSE 'FAIL' END;
