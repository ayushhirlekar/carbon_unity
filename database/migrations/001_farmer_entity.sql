-- ============================================================
-- 001 — Farmer as a first-class user
-- ============================================================
-- Run in: Supabase SQL editor, in a NEW TAB (Run executes the
--         whole editor, so never paste this into another script).
--
-- ADDITIVE ONLY. Nothing is dropped, no data is deleted.
-- Baseline before this file: users 8, farms 7.
--
-- Why this file exists: the schema has no farmer entity.
-- farms.farmer_name / farmer_contact are plain VARCHAR and
-- farms.created_by points at the ADMIN who created the row, so
-- there is nothing to authenticate a farmer against or to own a
-- parcel. Everything in Part 1 depends on fixing that first.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. users.role: enum -> text + CHECK, so 'farmer' can exist
-- ------------------------------------------------------------
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction and
-- Supabase migrates transactionally, so the enum is replaced
-- rather than extended.

ALTER TABLE users ALTER COLUMN role TYPE text USING role::text;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'buyer', 'farmer'));

-- The 2026-10-08 backup was made with CREATE TABLE AS SELECT, which
-- copied the enum type along with the column. user_role cannot be
-- dropped while that column still references it. Convert the backup
-- to text too — CASCADE would alter the backup's shape instead, and
-- the backup is the thing protecting us.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users_backup_20261008' AND column_name = 'role'
    ) THEN
        EXECUTE 'ALTER TABLE users_backup_20261008 '
             || 'ALTER COLUMN role TYPE text USING role::text';
    END IF;
END $$;

DROP TYPE IF EXISTS user_role;

-- ------------------------------------------------------------
-- 2. Farmer-facing columns on users
-- ------------------------------------------------------------
-- nonce / nonce_issued_at: requestNonce currently persists
-- nothing, so any captured signature authenticates forever.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone              text,
    ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en',
    ADD COLUMN IF NOT EXISTS farmer_code        text,
    ADD COLUMN IF NOT EXISTS nonce              text,
    ADD COLUMN IF NOT EXISTS nonce_issued_at    timestamptz;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_language_check;
ALTER TABLE users ADD CONSTRAINT users_language_check
    CHECK (preferred_language IN ('en', 'mr', 'hi'));

-- Unique only among rows that have one; admins and buyers stay NULL.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_farmer_code
    ON users(farmer_code) WHERE farmer_code IS NOT NULL;

-- ------------------------------------------------------------
-- 3. farmer_code generation
-- ------------------------------------------------------------
-- A farmer shares this code out loud or over SMS to be invited
-- to a project. UUIDs are unusable for that. The alphabet omits
-- 0/O/1/I/L because they are misread when spoken or handwritten.

CREATE OR REPLACE FUNCTION gen_farmer_code()
RETURNS text AS $$
DECLARE
    alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    result   text := '';
    i        int;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

CREATE OR REPLACE FUNCTION assign_farmer_code()
RETURNS TRIGGER AS $$
DECLARE
    candidate text;
    tries     int := 0;
BEGIN
    IF NEW.role = 'farmer' AND NEW.farmer_code IS NULL THEN
        LOOP
            candidate := gen_farmer_code();
            EXIT WHEN NOT EXISTS (SELECT 1 FROM users WHERE farmer_code = candidate);
            tries := tries + 1;
            IF tries > 20 THEN
                RAISE EXCEPTION 'could not generate a unique farmer_code after 20 attempts';
            END IF;
        END LOOP;
        NEW.farmer_code := candidate;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_farmer_code ON users;
CREATE TRIGGER trg_users_farmer_code
    BEFORE INSERT OR UPDATE OF role ON users
    FOR EACH ROW EXECUTE FUNCTION assign_farmer_code();

-- ------------------------------------------------------------
-- 4. farms.farmer_wallet — the parcel's owner
-- ------------------------------------------------------------
-- Nullable: the 7 existing farms were created by an admin and
-- have no farmer yet. They are claimed during backfill.

ALTER TABLE farms ADD COLUMN IF NOT EXISTS farmer_wallet text;

ALTER TABLE farms DROP CONSTRAINT IF EXISTS fk_farms_farmer_wallet;
ALTER TABLE farms ADD CONSTRAINT fk_farms_farmer_wallet
    FOREIGN KEY (farmer_wallet) REFERENCES users(wallet_address) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_farms_farmer ON farms(farmer_wallet);

-- ------------------------------------------------------------
-- 5. Lowercase farmer_wallet, or the foreign key breaks
-- ------------------------------------------------------------
-- users.wallet_address is lowercased by trg_users_normalize_wallet.
-- A mixed-case address written to farmer_wallet would therefore
-- fail the FK against a row that does exist. Extending the farms
-- normalizer is the fix; the trigger on farms already fires.

CREATE OR REPLACE FUNCTION normalize_farm_created_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_by := LOWER(NEW.created_by);
    IF NEW.farmer_wallet IS NOT NULL THEN
        NEW.farmer_wallet := LOWER(NEW.farmer_wallet);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================
-- VERIFICATION — send me everything this returns
-- ============================================================

SELECT 'role column type' AS check_name,
       data_type AS result,
       'expect: text' AS expected
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'role'

UNION ALL
SELECT 'user_role enum dropped',
       CASE WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role')
            THEN 'STILL EXISTS' ELSE 'dropped' END,
       'expect: dropped'

UNION ALL
SELECT 'new users columns',
       count(*)::text,
       'expect: 5'
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('phone','preferred_language','farmer_code','nonce','nonce_issued_at')

UNION ALL
SELECT 'farms.farmer_wallet',
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name = 'farms' AND column_name = 'farmer_wallet')
       THEN 'present' ELSE 'MISSING' END,
       'expect: present'

UNION ALL
SELECT 'farmer_code generator',
       gen_farmer_code(),
       'expect: 8 chars, no 0/O/1/I/L'

UNION ALL
SELECT 'users rows', count(*)::text, 'expect: 8' FROM users

UNION ALL
SELECT 'farms rows', count(*)::text, 'expect: 7' FROM farms

UNION ALL
SELECT 'existing roles', string_agg(DISTINCT role, ', '), 'expect: admin, buyer'
FROM users

UNION ALL
SELECT 'backup intact', count(*)::text, 'expect: 8'
FROM users_backup_20261008;
