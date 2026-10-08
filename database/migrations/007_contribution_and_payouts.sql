-- ============================================================
-- 007 — Live contribution, distributions, payout entitlements
-- ============================================================
-- Run in: Supabase SQL editor, NEW TAB.
-- Requires: 001-006 applied.
--
-- ADDITIVE ONLY. Two views, two tables.
--
-- Two things kept deliberately separate:
--
--   CONTRIBUTION is LIVE. A view over current samples, so it
--   moves whenever a farmer adds a reading. This is what the
--   dashboard shows.
--
--   DISTRIBUTION is FROZEN. When the admin pays out, the
--   current shares are snapshotted into immutable rows.
--
-- Conflating them is a real bug, not a style preference: if
-- payouts read the live view at transfer time, a farmer joining
-- after a sale dilutes everyone retroactively, shares drift
-- between the first and last transfer in a batch, and the total
-- paid stops reconciling with the revenue that funded it.
-- ============================================================

BEGIN;

SET LOCAL search_path = public, extensions;

-- ------------------------------------------------------------
-- 1. Per-parcel carbon delta
-- ------------------------------------------------------------
-- Baseline = earliest sample, current = latest. Bulk density and
-- depth come from the SAMPLE, not the farm, because each sample
-- carries its own and they are NOT NULL there.
--
-- A single sample yields no delta. That parcel is 'awaiting
-- baseline', not zero — visibly pending rather than silently
-- excluded.

CREATE OR REPLACE VIEW v_farm_carbon_delta AS
WITH ranked AS (
    SELECT s.*,
           ROW_NUMBER() OVER (PARTITION BY farm_id ORDER BY sampled_at ASC,  created_at ASC)  AS first_rank,
           ROW_NUMBER() OVER (PARTITION BY farm_id ORDER BY sampled_at DESC, created_at DESC) AS last_rank,
           COUNT(*)    OVER (PARTITION BY farm_id) AS n
    FROM soil_samples s
)
SELECT
    f.farm_id,
    f.farmer_wallet,
    f.name                        AS parcel_name,
    COALESCE(f.area_ha, f.area)   AS area_ha,
    COALESCE(b.n, 0)              AS sample_count,
    b.sampled_at                  AS baseline_date,
    b.soc_percent                 AS baseline_soc,
    c.sampled_at                  AS latest_date,
    c.soc_percent                 AS current_soc,
    c.bulk_density,
    c.depth_cm,
    CASE WHEN COALESCE(b.n, 0) < 2 THEN NULL
         ELSE GREATEST(c.soc_percent - b.soc_percent, 0) END AS delta_soc
FROM farms f
LEFT JOIN ranked b ON b.farm_id = f.farm_id AND b.first_rank = 1
LEFT JOIN ranked c ON c.farm_id = f.farm_id AND c.last_rank  = 1;

-- ------------------------------------------------------------
-- 2. Live contribution per project member
-- ------------------------------------------------------------
-- Share is proportional to each parcel's MEASURED delta, never
-- an equal split. An equal split would pay a farmer who
-- sequestered nothing, which destroys the additionality claim
-- the credits rest on.

CREATE OR REPLACE VIEW v_project_contributions AS
WITH scored AS (
    SELECT
        pm.project_id,
        d.*,
        CASE WHEN d.delta_soc IS NULL THEN NULL
             ELSE ROUND((d.delta_soc * d.bulk_density * d.depth_cm
                         * d.area_ha * 3.67)::numeric, 4)
        END AS contribution_tco2e
    FROM project_members pm
    JOIN v_farm_carbon_delta d ON d.farm_id = pm.farm_id
    WHERE pm.status = 'active'
)
SELECT
    project_id, farm_id, farmer_wallet, parcel_name, area_ha,
    sample_count, baseline_date, baseline_soc, latest_date, current_soc,
    delta_soc, contribution_tco2e,
    CASE
        WHEN sample_count = 0        THEN 'no_samples'
        WHEN sample_count < 2        THEN 'awaiting_baseline'
        WHEN delta_soc = 0           THEN 'no_gain_yet'
        ELSE                              'contributing'
    END AS contribution_status,
    CASE
        WHEN COALESCE(SUM(contribution_tco2e) OVER (PARTITION BY project_id), 0) > 0
        THEN ROUND(100 * COALESCE(contribution_tco2e, 0)
                   / SUM(contribution_tco2e) OVER (PARTITION BY project_id), 2)
        ELSE 0
    END AS share_pct
FROM scored;

-- ------------------------------------------------------------
-- 3. Distributions — the frozen snapshot
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS distributions (
    distribution_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      uuid NOT NULL REFERENCES projects(project_id) ON DELETE RESTRICT,
    revenue_wei     numeric NOT NULL CHECK (revenue_wei > 0),
    snapshot_at     timestamptz NOT NULL DEFAULT now(),
    created_by      text NOT NULL,
    note            text
);

CREATE INDEX IF NOT EXISTS idx_distributions_project ON distributions(project_id);

-- ------------------------------------------------------------
-- 4. Entitlements — what each farmer is owed, and whether paid
-- ------------------------------------------------------------
-- Each row is settled by its OWN transfer, so one failure does
-- not block the rest of the batch. status='failed' plus a retry
-- path, not all-or-nothing.
--
-- Honest limitation: this is custodial. Proceeds land in the
-- admin wallet and the admin is trusted to press Distribute.
-- The ledger makes what is owed fully visible — amount, share,
-- status, paying tx hash — but it does not enforce payment.

CREATE TABLE IF NOT EXISTS payout_entitlements (
    entitlement_id     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    distribution_id    uuid NOT NULL REFERENCES distributions(distribution_id) ON DELETE CASCADE,
    project_id         uuid NOT NULL REFERENCES projects(project_id) ON DELETE RESTRICT,
    farm_id            uuid NOT NULL REFERENCES farms(farm_id) ON DELETE RESTRICT,
    farmer_wallet      text NOT NULL,
    credits_attributed numeric NOT NULL,
    share_pct          numeric NOT NULL,
    amount_wei         numeric NOT NULL,
    status             text NOT NULL DEFAULT 'owed'
                           CHECK (status IN ('owed','paid','failed')),
    paid_at            timestamptz,
    payout_tx_hash     text,
    failure_reason     text,
    created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entitlements_farmer ON payout_entitlements(farmer_wallet, status);
CREATE INDEX IF NOT EXISTS idx_entitlements_dist   ON payout_entitlements(distribution_id);

CREATE OR REPLACE FUNCTION entitlements_before_write()
RETURNS TRIGGER AS $$
BEGIN
    NEW.farmer_wallet := LOWER(NEW.farmer_wallet);
    IF NEW.status = 'paid' AND NEW.paid_at IS NULL THEN
        NEW.paid_at := now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_entitlements_before_write ON payout_entitlements;
CREATE TRIGGER trg_entitlements_before_write
    BEFORE INSERT OR UPDATE ON payout_entitlements
    FOR EACH ROW EXECUTE FUNCTION entitlements_before_write();

COMMIT;

-- ============================================================
-- VERIFICATION — two farmers, unequal gains, shares must reflect it
-- ============================================================

DROP TABLE IF EXISTS contrib_test;
CREATE TEMP TABLE contrib_test (seq int, check_name text, result text, expected text);

DO $$
DECLARE
    admin_w text;
    p uuid; fa uuid; fb uuid; fc uuid;
    sa numeric; sb numeric; tot numeric; st text;
BEGIN
    SELECT wallet_address INTO admin_w FROM users WHERE role = 'admin' LIMIT 1;

    DELETE FROM farms   WHERE name LIKE '\_\_cb\_%';
    DELETE FROM projects WHERE name LIKE '\_\_cb\_%';

    INSERT INTO projects (host_wallet, name) VALUES (admin_w, '__cb_proj__')
    RETURNING project_id INTO p;

    -- Three identical 1 ha parcels
    INSERT INTO farms (name, location, area, created_by, soil_type)
    VALUES ('__cb_a__', 'v', 1.0, admin_w, 'black') RETURNING farm_id INTO fa;
    INSERT INTO farms (name, location, area, created_by, soil_type)
    VALUES ('__cb_b__', 'v', 1.0, admin_w, 'black') RETURNING farm_id INTO fb;
    INSERT INTO farms (name, location, area, created_by, soil_type)
    VALUES ('__cb_c__', 'v', 1.0, admin_w, 'black') RETURNING farm_id INTO fc;

    INSERT INTO project_members (project_id, farm_id) VALUES (p, fa), (p, fb), (p, fc);

    -- A gains 0.20, B gains 0.10, C has only one sample
    INSERT INTO soil_samples (farm_id, sampled_at, soc_percent, bulk_density, depth_cm, source)
    VALUES (fa, '2025-06-01', 0.50, 1.25, 15, 'shc'),
           (fa, '2026-06-01', 0.70, 1.25, 15, 'shc'),
           (fb, '2025-06-01', 0.50, 1.25, 15, 'shc'),
           (fb, '2026-06-01', 0.60, 1.25, 15, 'shc'),
           (fc, '2026-06-01', 0.55, 1.25, 15, 'shc');

    SELECT share_pct INTO sa FROM v_project_contributions WHERE farm_id = fa;
    SELECT share_pct INTO sb FROM v_project_contributions WHERE farm_id = fb;
    SELECT contribution_status INTO st FROM v_project_contributions WHERE farm_id = fc;
    SELECT SUM(share_pct) INTO tot FROM v_project_contributions WHERE project_id = p;

    INSERT INTO contrib_test VALUES (1, 'A gained 2x B -> share', ROUND(sa)::text, '67');
    INSERT INTO contrib_test VALUES (2, 'B share',                ROUND(sb)::text, '33');
    INSERT INTO contrib_test VALUES (3, 'single-sample parcel',   st,              'awaiting_baseline');
    INSERT INTO contrib_test VALUES (4, 'shares sum to 100',      ROUND(tot)::text,'100');

    DELETE FROM project_members WHERE project_id = p;
    DELETE FROM projects WHERE project_id = p;
    DELETE FROM farms WHERE farm_id IN (fa, fb, fc);
END $$;

SELECT check_name, result, expected,
       CASE WHEN result = expected THEN 'PASS' ELSE 'FAIL' END AS verdict
FROM contrib_test

UNION ALL
SELECT 'farms rows', count(*)::text, '7',
       CASE WHEN count(*) = 7 THEN 'PASS' ELSE 'FAIL' END FROM farms

UNION ALL
SELECT 'new tables', count(*)::text, '2',
       CASE WHEN count(*) = 2 THEN 'PASS' ELSE 'FAIL' END
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('distributions','payout_entitlements');
