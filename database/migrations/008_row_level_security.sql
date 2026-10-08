-- ============================================================
-- 008 — Row Level Security: deny by default
-- ============================================================
-- Run in: Supabase SQL editor, NEW TAB.
-- Requires: 001-007 applied, and backend/src/config/supabase.js
--           updated (it now throws instead of silently falling
--           back to the anon key).
--
-- WHY THIS IS SAFE FOR YOUR CODE
-- Verified before writing this file:
--   * frontend/package.json has NO @supabase dependency and
--     frontend/src contains no Supabase calls — the browser
--     talks to Express over axios only.
--   * every backend query uses supabaseAdmin (service role),
--     which BYPASSES RLS entirely. The anon client is exported
--     but never imported anywhere.
-- So locking the anon role out of everything breaks nothing
-- that exists, and turns a leaked anon key into a dead key.
--
-- WHAT THIS DOES NOT FIX
-- The service_role key in database/.env.example is real and
-- committed. That key bypasses every policy below. Rotate it,
-- or none of this matters.
--
-- Rollback is at the bottom of this file.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Drop every permissive policy
-- ------------------------------------------------------------
-- The current policies are all USING (true) for select, insert
-- and update, so anyone holding the anon key has effectively
-- unrestricted access to the whole database.

DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                       r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ------------------------------------------------------------
-- 2. Enable RLS on every table, including the backups
-- ------------------------------------------------------------
-- The backup tables hold a full copy of real user and farm data.
-- Leaving them unprotected would make the lockdown pointless.
-- With RLS enabled and no policy present, the anon role can do
-- nothing; the service role is unaffected.

DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
END $$;

-- FORCE would also apply RLS to the table owner, which would
-- break legitimate maintenance in the SQL editor. Keep FORCE off
-- for the two views' base tables we read during verification.
ALTER TABLE public.farms         NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.soil_samples  NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.users         NO FORCE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 3. Views must not become a bypass
-- ------------------------------------------------------------
-- By default a view executes with its OWNER's privileges, so a
-- view over a locked table would happily serve its contents to
-- the anon role. security_invoker makes the view run as the
-- caller instead, so RLS on the base tables actually applies.

ALTER VIEW v_farm_carbon_delta     SET (security_invoker = true);
ALTER VIEW v_project_contributions SET (security_invoker = true);

COMMIT;

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT 'tables with RLS enabled' AS check_name,
       count(*) FILTER (WHERE rowsecurity)::text AS result,
       count(*)::text AS expected,
       CASE WHEN count(*) FILTER (WHERE rowsecurity) = count(*)
            THEN 'PASS' ELSE 'FAIL' END AS verdict
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public' AND c.relkind = 'r'

UNION ALL
SELECT 'permissive policies left',
       count(*)::text, '0',
       CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END
FROM pg_policies WHERE schemaname = 'public'

UNION ALL
SELECT 'views run as caller',
       count(*)::text, '2',
       CASE WHEN count(*) = 2 THEN 'PASS' ELSE 'FAIL' END
FROM pg_class
WHERE relname IN ('v_farm_carbon_delta','v_project_contributions')
  AND reloptions::text LIKE '%security_invoker=true%'

UNION ALL
SELECT 'data still readable as owner',
       count(*)::text, '7',
       CASE WHEN count(*) = 7 THEN 'PASS' ELSE 'FAIL' END
FROM farms

UNION ALL
SELECT 'soil_samples intact',
       count(*)::text, '7',
       CASE WHEN count(*) = 7 THEN 'PASS' ELSE 'FAIL' END
FROM soil_samples WHERE source = 'legacy_import';

-- ============================================================
-- AFTER RUNNING THIS: restart the backend and confirm the
-- marketplace still loads. It should, because every query uses
-- the service role. If it does NOT, your backend/.env is missing
-- the service role key — which is exactly the bug this sequence
-- was designed to surface rather than hide.
-- ============================================================

-- ------------------------------------------------------------
-- ROLLBACK — paste and run only if something breaks
-- ------------------------------------------------------------
-- Restores the previous wide-open behaviour:
--
-- DO $$
-- DECLARE r record;
-- BEGIN
--     FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
--         EXECUTE format('ALTER TABLE public.%I NO FORCE ROW LEVEL SECURITY', r.tablename);
--         EXECUTE format('DROP POLICY IF EXISTS tmp_open ON public.%I', r.tablename);
--         EXECUTE format('CREATE POLICY tmp_open ON public.%I FOR ALL USING (true) WITH CHECK (true)', r.tablename);
--     END LOOP;
-- END $$;
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- FOR PART 2 — Supabase Realtime needs a read policy
-- ------------------------------------------------------------
-- The live dashboard will subscribe to farm_observations from
-- the browser, and Realtime respects RLS. When that work starts,
-- add a scoped policy rather than reopening the table:
--
-- CREATE POLICY farmer_reads_own_observations ON farm_observations
--   FOR SELECT TO authenticated
--   USING (farm_id IN (SELECT farm_id FROM farms
--                      WHERE farmer_wallet = auth.jwt() ->> 'wallet'));
-- ------------------------------------------------------------
