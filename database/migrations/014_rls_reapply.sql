-- ============================================================
-- 014 — Re-apply Row Level Security
-- ============================================================
-- Run in: Supabase SQL editor, NEW TAB.
--
-- ############################################################
-- ## IF THE APP BREAKS, RUN THIS AND IT IS BACK IN SECONDS: ##
-- ############################################################
--
-- DO $$
-- DECLARE r record;
-- BEGIN
--   FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
--     EXECUTE format('ALTER TABLE public.%I NO FORCE ROW LEVEL SECURITY', r.tablename);
--     EXECUTE format('DROP POLICY IF EXISTS tmp_open ON public.%I', r.tablename);
--     EXECUTE format('CREATE POLICY tmp_open ON public.%I FOR ALL USING (true) WITH CHECK (true)', r.tablename);
--   END LOOP;
-- END $$;
--
-- ############################################################
--
-- PRECONDITION — this is why it broke last time.
-- backend/src/config/supabase.js must be the fixed version that
-- THROWS when the service key is missing, instead of silently
-- falling back to the anon key. Verified: the server now boots
-- reporting "Supabase: Connected", so the service role is real
-- and will bypass every policy below.
--
-- WHY THIS MATTERS MORE NOW
-- Every policy today is USING (true), so the anon key — which is
-- published in a public GitHub repo — has unrestricted read and
-- write on the whole database. This closes that.
--
-- WHAT IT CANNOT FIX
-- A leaked service_role key bypasses RLS entirely. Rotating that
-- key is the step that actually stops the exposure; this only
-- closes the anon hole.
-- ============================================================

BEGIN;

-- 1. Remove every permissive policy.
DO $$
DECLARE r record;
BEGIN
    FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 2. Enable RLS everywhere, including the backup tables — they
--    hold a full copy of real user and farm data, so leaving them
--    open would make the whole exercise pointless.
DO $$
DECLARE r record;
BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
END $$;

-- FORCE also applies RLS to the table owner, which would block
-- ordinary maintenance in this SQL editor. Lift it on the tables
-- we routinely inspect.
ALTER TABLE public.farms              NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.users              NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.soil_samples       NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.farm_observations  NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.projects           NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.alerts             NO FORCE ROW LEVEL SECURITY;

-- 3. Views must not become a bypass.
--    A view runs with its OWNER's privileges by default, so a view
--    over a locked table would happily serve its contents to the
--    anon role. security_invoker makes it run as the caller.
ALTER VIEW v_farm_carbon_delta     SET (security_invoker = true);
ALTER VIEW v_project_contributions SET (security_invoker = true);

COMMIT;

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT 'tables with RLS' AS check_name,
       count(*) FILTER (WHERE c.relrowsecurity)::text AS result,
       count(*)::text AS expected,
       CASE WHEN count(*) FILTER (WHERE c.relrowsecurity) = count(*) THEN 'PASS' ELSE 'FAIL' END AS verdict
FROM pg_tables t JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public' AND c.relkind = 'r'

UNION ALL
SELECT 'permissive policies left', count(*)::text, '0',
       CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END
FROM pg_policies WHERE schemaname = 'public'

UNION ALL
SELECT 'views run as caller', count(*)::text, '2',
       CASE WHEN count(*) = 2 THEN 'PASS' ELSE 'FAIL' END
FROM pg_class
WHERE relname IN ('v_farm_carbon_delta','v_project_contributions')
  AND reloptions::text LIKE '%security_invoker=true%'

UNION ALL
SELECT 'data intact — farms', count(*)::text, '8 or more',
       CASE WHEN count(*) >= 8 THEN 'PASS' ELSE 'FAIL' END FROM farms

UNION ALL
SELECT 'data intact — observations', count(*)::text, '9 or more',
       CASE WHEN count(*) >= 9 THEN 'PASS' ELSE 'FAIL' END FROM farm_observations

UNION ALL
SELECT 'data intact — evidence claims', count(*)::text, '10',
       CASE WHEN count(*) = 10 THEN 'PASS' ELSE 'FAIL' END FROM evidence_claims;

-- ============================================================
-- NOW TEST THE APP IMMEDIATELY.
-- Load the marketplace and open the farmer dashboard. Both read
-- through the service role and should be unaffected. If either
-- comes back empty, run the rollback at the top of this file and
-- tell me — do not leave it broken while investigating.
-- ============================================================
