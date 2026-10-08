-- ============================================================
-- 011 — Agent infrastructure
-- ============================================================
-- Run in: Supabase SQL editor, NEW TAB.
-- Requires: 001-010 applied.
--
-- ADDITIVE ONLY. Four tables.
--
-- LangGraph needs somewhere to persist graph state. Without a
-- checkpointer every conversation resets when the server
-- restarts and human-in-the-loop cannot resume mid-run, which
-- turns the agent layer into a stateless chatbot.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Conversations and messages
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agent_conversations (
    conversation_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address  text NOT NULL,
    farm_id         uuid REFERENCES farms(farm_id) ON DELETE SET NULL,
    title           text,
    language        text NOT NULL DEFAULT 'en' CHECK (language IN ('en','mr','hi')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conv_wallet ON agent_conversations(wallet_address, updated_at DESC);

CREATE TABLE IF NOT EXISTS agent_messages (
    message_id      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id uuid NOT NULL REFERENCES agent_conversations(conversation_id) ON DELETE CASCADE,
    role            text NOT NULL CHECK (role IN ('user','assistant','system')),
    content         text NOT NULL,

    -- What the deterministic layer produced for this turn. Kept
    -- so an answer can be re-checked later against the numbers it
    -- was supposed to be based on.
    assessment      jsonb,

    -- Whether the numeric guard passed the model's prose or fell
    -- back to a template. Recorded rather than hidden, because a
    -- silent fallback is indistinguishable from a good answer.
    guard_status    text CHECK (guard_status IN ('passed','regenerated','template_fallback')),
    agents_used     text[],
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_msg_conv ON agent_messages(conversation_id, created_at);

-- ------------------------------------------------------------
-- 2. LangGraph checkpoints
-- ------------------------------------------------------------
-- Shape follows LangGraph's checkpointer contract: a thread, an
-- ordered checkpoint within it, and an opaque state blob.

CREATE TABLE IF NOT EXISTS agent_checkpoints (
    thread_id     text NOT NULL,
    checkpoint_id text NOT NULL,
    parent_id     text,
    state         jsonb NOT NULL,
    metadata      jsonb,
    created_at    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (thread_id, checkpoint_id)
);

CREATE INDEX IF NOT EXISTS idx_ckpt_thread ON agent_checkpoints(thread_id, created_at DESC);

-- ------------------------------------------------------------
-- 3. Alerts — the only unprompted contact with a farmer
-- ------------------------------------------------------------
-- Everything else in the system answers a question the farmer
-- asked. These push, so they carry a severity and a dedupe key:
-- telling someone their sensor is offline once a day is help,
-- telling them hourly is noise.

CREATE TABLE IF NOT EXISTS alerts (
    alert_id       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id        uuid NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
    wallet_address text NOT NULL,
    kind           text NOT NULL,
    severity       text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','advice','urgent')),
    title          text NOT NULL,
    body           text NOT NULL,
    dedupe_key     text NOT NULL,
    read_at        timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),

    -- A stored date rather than an expression on created_at.
    -- timestamptz::date depends on the session TimeZone, so it is
    -- only STABLE, and Postgres refuses non-IMMUTABLE functions in
    -- an index expression. A column sidesteps that entirely and
    -- fixes the day boundary to UTC rather than whoever connected.
    alert_day      date NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC')::date)
);

CREATE INDEX IF NOT EXISTS idx_alerts_wallet ON alerts(wallet_address, created_at DESC);

-- One live alert per farm per kind per day. Telling a farmer their
-- feed is offline once a day is help; telling them hourly is noise.
CREATE UNIQUE INDEX IF NOT EXISTS one_alert_per_key_per_day
    ON alerts(farm_id, dedupe_key, alert_day);

COMMIT;

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT 'agent tables created' AS check_name,
       count(*)::text AS result, '4' AS expected,
       CASE WHEN count(*) = 4 THEN 'PASS' ELSE 'FAIL' END AS verdict
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('agent_conversations','agent_messages','agent_checkpoints','alerts')

UNION ALL
SELECT 'alert dedupe index',
       CASE WHEN EXISTS (SELECT 1 FROM pg_indexes
                         WHERE indexname = 'one_alert_per_key_per_day')
            THEN 'present' ELSE 'MISSING' END, 'present',
       CASE WHEN EXISTS (SELECT 1 FROM pg_indexes
                         WHERE indexname = 'one_alert_per_key_per_day')
            THEN 'PASS' ELSE 'FAIL' END

UNION ALL
SELECT 'farms rows', count(*)::text, '7',
       CASE WHEN count(*) = 7 THEN 'PASS' ELSE 'FAIL' END FROM farms;
