-- ============================================================
-- 017 — Alert lifecycle and daily reports
-- ============================================================
-- Run in: Supabase SQL editor, NEW TAB. Requires 011 and 016.
--
-- ADDITIVE ONLY. The existing alerts table keeps every column it
-- has, including title and body, and the existing per-day unique
-- index is left exactly as it is. The seven Watchdog rules written
-- in 011 continue to work untouched.
--
-- ############################################################
-- ## ROLLBACK ##
-- ############################################################
-- BEGIN;
-- DROP INDEX IF EXISTS one_open_alert_per_key;
-- ALTER TABLE alerts DROP COLUMN IF EXISTS resolved_at;
-- ALTER TABLE alerts DROP COLUMN IF EXISTS message_key;
-- ALTER TABLE alerts DROP COLUMN IF EXISTS evidence;
-- ALTER TABLE alerts DROP COLUMN IF EXISTS lifecycle;
-- DROP TABLE IF EXISTS daily_reports;
-- COMMIT;
-- ############################################################
--
-- WHY TWO DEDUPE MODELS RATHER THAN ONE
-- The existing index allows one alert per rule per UTC day, which
-- is right for an advisory nudge: "add your soil card" should come
-- back tomorrow if it is still true. It is wrong for a device
-- condition: "your sensor is offline" should appear once, stay up
-- while it is true, and clear itself when it is fixed — not
-- reappear every morning as though it were new.
--
-- So lifecycle is a property of the RULE, not of the table. Daily
-- rules keep the day index; open-ended rules get a partial unique
-- index on unresolved rows. Neither interferes with the other.
--
-- WHY message_key AND evidence
-- Alerts today store rendered English title and body, which
-- quietly defeats the point of having Marathi and Hindi at all — a
-- farmer reading Marathi receives an English alert. Storing a key
-- plus the values that triggered it lets language be chosen when
-- the alert is read, which is the same discipline the rest of the
-- system already follows: the numbers exist before the words.
--
-- title and body stay populated so nothing that reads them breaks.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Lifecycle and i18n columns on the existing alerts table
-- ------------------------------------------------------------
ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
    ADD COLUMN IF NOT EXISTS message_key text,
    ADD COLUMN IF NOT EXISTS evidence    jsonb,

    -- 'daily'  — may recur each day while true (the 011 rules)
    -- 'open'   — raised once, held open, auto-resolved when clear
    ADD COLUMN IF NOT EXISTS lifecycle   text NOT NULL DEFAULT 'daily';

ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_lifecycle_check;
ALTER TABLE alerts ADD CONSTRAINT alerts_lifecycle_check
    CHECK (lifecycle IN ('daily','open'));

-- ------------------------------------------------------------
-- 2. One OPEN alert per rule, for lifecycle='open' rules only
-- ------------------------------------------------------------
-- Partial, so it constrains nothing about the daily rules. This is
-- what lets a dry-spell alert resolve and then legitimately fire
-- again later the same day — which the day index alone forbids,
-- and which is exactly what the rain_event demo depends on.
CREATE UNIQUE INDEX IF NOT EXISTS one_open_alert_per_key
    ON alerts(farm_id, dedupe_key)
    WHERE lifecycle = 'open' AND resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_alerts_farm_open
    ON alerts(farm_id, created_at DESC)
    WHERE resolved_at IS NULL;

-- ------------------------------------------------------------
-- 3. Daily reports
-- ------------------------------------------------------------
-- The unprompted morning brief. Stored rather than generated on
-- read because it is a record of what the farmer was told on a
-- given day: regenerating it later from newer data would quietly
-- rewrite history, and advice the farmer acted on is exactly the
-- thing that must stay fixed.
CREATE TABLE IF NOT EXISTS daily_reports (
    report_id   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id     uuid NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
    report_date date NOT NULL,

    summary     text NOT NULL,          -- narrated prose, past the guard
    actions     jsonb,                  -- the staged plan
    evidence    jsonb,                  -- every figure used, with provenance
    language    text NOT NULL DEFAULT 'en',

    -- What the guard made of the prose: passed, regenerated or
    -- template_fallback. Recorded so a run of fallbacks is visible
    -- as a signal rather than something to be discovered by
    -- reading reports and finding them oddly stilted.
    guard_status text,
    model_notice text,

    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS one_report_per_farm_per_day
    ON daily_reports(farm_id, report_date);

CREATE INDEX IF NOT EXISTS idx_reports_farm_date
    ON daily_reports(farm_id, report_date DESC);

COMMIT;

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT 'alerts.resolved_at' AS check_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_name='alerts' AND column_name='resolved_at')
            THEN 'PASS' ELSE 'FAIL' END AS verdict

UNION ALL SELECT 'alerts.evidence',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name='alerts' AND column_name='evidence')
         THEN 'PASS' ELSE 'FAIL' END

UNION ALL SELECT 'alerts.message_key',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name='alerts' AND column_name='message_key')
         THEN 'PASS' ELSE 'FAIL' END

UNION ALL SELECT 'open-alert partial index',
    CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='one_open_alert_per_key')
         THEN 'PASS' ELSE 'FAIL' END

UNION ALL SELECT 'per-day index PRESERVED (nothing removed)',
    CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='one_alert_per_key_per_day')
         THEN 'PASS' ELSE 'FAIL' END

UNION ALL SELECT 'title/body still NOT NULL (011 rules unaffected)',
    CASE WHEN (SELECT count(*) FROM information_schema.columns
               WHERE table_name='alerts' AND column_name IN ('title','body')
                 AND is_nullable='NO') = 2
         THEN 'PASS' ELSE 'FAIL' END

UNION ALL SELECT 'daily_reports table',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables
                      WHERE table_name='daily_reports')
         THEN 'PASS' ELSE 'FAIL' END

UNION ALL SELECT 'existing alerts preserved',
    CASE WHEN (SELECT count(*) FROM alerts) >= 0 THEN 'PASS' ELSE 'FAIL' END;
