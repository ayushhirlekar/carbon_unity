-- ============================================================
-- 009 — Single-use authentication nonces
-- ============================================================
-- Run in: Supabase SQL editor, NEW TAB.
-- Requires: 001-008 applied.
--
-- Why: requestNonce currently generates a nonce, returns it, and
-- stores NOTHING. The server then verifies whatever `message`
-- the client sends back, so the nonce proves nothing at all:
--
--   * a captured signature + message pair authenticates forever
--   * an attacker who sees one login request can replay it
--     indefinitely to impersonate that wallet
--
-- A nonce only works if the server remembers issuing it, accepts
-- it exactly once, and expires it.
--
-- This lives in its own table rather than on users, because the
-- nonce must work for a wallet that has not registered yet —
-- there is no users row to hang it off during registration.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS auth_nonces (
    wallet_address text PRIMARY KEY,
    nonce          text NOT NULL,
    issued_at      timestamptz NOT NULL DEFAULT now(),
    used_at        timestamptz
);

ALTER TABLE auth_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_nonces FORCE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_auth_nonces_issued ON auth_nonces(issued_at);

-- users.nonce / nonce_issued_at were added in 001 before it was
-- clear the nonce had to cover unregistered wallets too. Nothing
-- has ever written to them, so removing them avoids two places
-- claiming to hold the same thing.
ALTER TABLE users DROP COLUMN IF EXISTS nonce;
ALTER TABLE users DROP COLUMN IF EXISTS nonce_issued_at;

COMMIT;

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT 'auth_nonces table' AS check_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables
                         WHERE table_schema='public' AND table_name='auth_nonces')
            THEN 'present' ELSE 'MISSING' END AS result,
       'present' AS expected,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables
                         WHERE table_schema='public' AND table_name='auth_nonces')
            THEN 'PASS' ELSE 'FAIL' END AS verdict

UNION ALL
SELECT 'rls enabled on it',
       CASE WHEN relrowsecurity THEN 'yes' ELSE 'no' END, 'yes',
       CASE WHEN relrowsecurity THEN 'PASS' ELSE 'FAIL' END
FROM pg_class WHERE relname = 'auth_nonces'

UNION ALL
SELECT 'users.nonce removed',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='users'
                           AND column_name IN ('nonce','nonce_issued_at'))
            THEN 'STILL THERE' ELSE 'removed' END, 'removed',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='users'
                           AND column_name IN ('nonce','nonce_issued_at'))
            THEN 'FAIL' ELSE 'PASS' END

UNION ALL
SELECT 'users rows', count(*)::text, '8',
       CASE WHEN count(*) = 8 THEN 'PASS' ELSE 'FAIL' END FROM users;
