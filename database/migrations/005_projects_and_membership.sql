-- ============================================================
-- 005 — Projects, membership and invitations
-- ============================================================
-- Run in: Supabase SQL editor, NEW TAB.
-- Requires: 001-004 applied.
--
-- ADDITIVE ONLY. Three new tables, nothing existing is changed.
--
-- This is the aggregator model. Admin hosts a PROJECT; many
-- smallholder parcels join it, so verification is paid once
-- across N farmers instead of once per farmer.
--
-- Note: 'project' currently means 'farm' in the codebase.
-- adminController.createProject builds farm + carbon_data +
-- listing atomically and every route keys on :farm_id. This
-- file makes them separate entities for the first time; the
-- controller rekey happens in the backend work.
-- ============================================================

BEGIN;

SET LOCAL search_path = public, extensions;

-- ------------------------------------------------------------
-- 0. Generic short-code generator
-- ------------------------------------------------------------
-- 001 defined gen_farmer_code(). Projects need codes too, so the
-- generator is promoted to a neutral name and the old one kept
-- as a thin alias — existing triggers keep working untouched.

CREATE OR REPLACE FUNCTION gen_short_code()
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

CREATE OR REPLACE FUNCTION gen_farmer_code()
RETURNS text AS $$ SELECT gen_short_code(); $$ LANGUAGE sql VOLATILE;

-- ------------------------------------------------------------
-- 1. Projects
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS projects (
    project_id   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_code text UNIQUE NOT NULL,
    host_wallet  text NOT NULL REFERENCES users(wallet_address) ON DELETE RESTRICT,
    name         text NOT NULL,
    description  text,
    methodology  text,
    zone         text,
    district     text,
    taluka       text,
    status       text NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open','active','closed')),
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_host   ON projects(host_wallet);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE OR REPLACE FUNCTION projects_before_write()
RETURNS TRIGGER AS $$
DECLARE candidate text; tries int := 0;
BEGIN
    NEW.host_wallet := LOWER(NEW.host_wallet);
    IF NEW.project_code IS NULL THEN
        LOOP
            candidate := gen_short_code();
            EXIT WHEN NOT EXISTS (SELECT 1 FROM projects WHERE project_code = candidate);
            tries := tries + 1;
            IF tries > 20 THEN
                RAISE EXCEPTION 'could not generate a unique project_code';
            END IF;
        END LOOP;
        NEW.project_code := candidate;
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_before_write ON projects;
CREATE TRIGGER trg_projects_before_write
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION projects_before_write();

-- ------------------------------------------------------------
-- 2. Membership
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS project_members (
    project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    farm_id    uuid NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
    status     text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','left','removed')),
    invited_by text,
    joined_at  timestamptz NOT NULL DEFAULT now(),
    left_at    timestamptz,
    PRIMARY KEY (project_id, farm_id)
);

-- THE constraint that prevents double counting. The same land
-- earning credits in two projects is exactly what the geometry
-- hash and overlap detection exist to stop, and a controller
-- check cannot enforce it — only the database sees every write.
CREATE UNIQUE INDEX IF NOT EXISTS one_active_project_per_farm
    ON project_members(farm_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_members_project ON project_members(project_id, status);

-- Exit rule: leaving sets left_at and frees the parcel (the
-- partial index only covers 'active'). Credits already issued
-- stay with the project; no new issuance accrues to that parcel.
CREATE OR REPLACE FUNCTION members_before_write()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invited_by IS NOT NULL THEN
        NEW.invited_by := LOWER(NEW.invited_by);
    END IF;
    IF NEW.status IN ('left','removed') AND NEW.left_at IS NULL THEN
        NEW.left_at := now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_members_before_write ON project_members;
CREATE TRIGGER trg_members_before_write
    BEFORE INSERT OR UPDATE ON project_members
    FOR EACH ROW EXECUTE FUNCTION members_before_write();

-- ------------------------------------------------------------
-- 3. Invitations — all three directions in one table
-- ------------------------------------------------------------
-- admin_invite    : host invites a farmer into their project
-- farmer_request  : farmer asks to join a project they found
-- farmer_referral : farmer tells a neighbour about a project
--
-- One state machine, not three mechanisms. farm_id is nullable
-- because a referral can reach someone who has not drawn a
-- parcel yet.

CREATE TABLE IF NOT EXISTS project_invitations (
    invitation_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id    uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    farm_id       uuid REFERENCES farms(farm_id) ON DELETE CASCADE,
    from_wallet   text NOT NULL,
    to_wallet     text,
    to_code       text,
    direction     text NOT NULL
                      CHECK (direction IN ('admin_invite','farmer_request','farmer_referral')),
    status        text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','accepted','declined','expired')),
    message       text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    responded_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_invites_to      ON project_invitations(to_wallet, status);
CREATE INDEX IF NOT EXISTS idx_invites_project ON project_invitations(project_id, status);

-- One open invitation per project/farm pair, so a host clicking
-- twice does not create a second pending row.
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_invite_per_farm
    ON project_invitations(project_id, farm_id) WHERE status = 'pending';

CREATE OR REPLACE FUNCTION invitations_before_write()
RETURNS TRIGGER AS $$
BEGIN
    NEW.from_wallet := LOWER(NEW.from_wallet);
    IF NEW.to_wallet IS NOT NULL THEN
        NEW.to_wallet := LOWER(NEW.to_wallet);
    END IF;
    IF NEW.status <> 'pending' AND NEW.responded_at IS NULL THEN
        NEW.responded_at := now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invitations_before_write ON project_invitations;
CREATE TRIGGER trg_invitations_before_write
    BEFORE INSERT OR UPDATE ON project_invitations
    FOR EACH ROW EXECUTE FUNCTION invitations_before_write();

COMMIT;

-- ============================================================
-- VERIFICATION — the double-counting rule is the one that matters
-- ============================================================

DROP TABLE IF EXISTS proj_test;
CREATE TEMP TABLE proj_test (seq int, check_name text, result text, expected text);

DELETE FROM project_invitations WHERE message = '__pt__';
DELETE FROM project_members WHERE project_id IN (SELECT project_id FROM projects WHERE name LIKE '\_\_pt\_%');
DELETE FROM projects WHERE name LIKE '\_\_pt\_%';
DELETE FROM farms WHERE name LIKE '\_\_pt\_%';

DO $$
DECLARE
    admin_w text;
    p1 uuid; p2 uuid; f1 uuid;
    code text;
BEGIN
    SELECT wallet_address INTO admin_w FROM users WHERE role = 'admin' LIMIT 1;

    INSERT INTO projects (host_wallet, name, methodology, district, taluka)
    VALUES (admin_w, '__pt_sangli__', 'soil-carbon-v1', 'Sangli', 'Miraj')
    RETURNING project_id, project_code INTO p1, code;
    INSERT INTO proj_test VALUES (1, 'project_code generated',
        CASE WHEN length(code) = 8 THEN 'ok' ELSE code END, 'ok');

    INSERT INTO projects (host_wallet, name) VALUES (admin_w, '__pt_second__')
    RETURNING project_id INTO p2;

    INSERT INTO farms (name, location, area, created_by, soil_type)
    VALUES ('__pt_farm__', 'Shirgaon', 1.8, admin_w, 'black')
    RETURNING farm_id INTO f1;

    INSERT INTO project_members (project_id, farm_id, invited_by)
    VALUES (p1, f1, admin_w);
    INSERT INTO proj_test VALUES (2, 'farm joined project 1', 'ok', 'ok');

    -- The rule: this parcel cannot be active in a second project.
    BEGIN
        INSERT INTO project_members (project_id, farm_id) VALUES (p2, f1);
        INSERT INTO proj_test VALUES (3, 'same farm in 2nd project', 'ACCEPTED', 'rejected');
    EXCEPTION WHEN unique_violation THEN
        INSERT INTO proj_test VALUES (3, 'same farm in 2nd project', 'rejected', 'rejected');
    END;

    -- After leaving, the parcel is free to join elsewhere.
    UPDATE project_members SET status = 'left' WHERE project_id = p1 AND farm_id = f1;
    INSERT INTO project_members (project_id, farm_id) VALUES (p2, f1);
    INSERT INTO proj_test VALUES (4, 'can rejoin after leaving', 'ok', 'ok');

    INSERT INTO proj_test
    SELECT 5, 'left_at set on exit',
           CASE WHEN left_at IS NOT NULL THEN 'ok' ELSE 'NULL' END, 'ok'
    FROM project_members WHERE project_id = p1 AND farm_id = f1;

    -- All three invitation directions coexist.
    INSERT INTO project_invitations (project_id, farm_id, from_wallet, direction, message)
    VALUES (p1, f1, admin_w, 'admin_invite', '__pt__');
    INSERT INTO project_invitations (project_id, from_wallet, direction, message)
    VALUES (p1, admin_w, 'farmer_request', '__pt__');
    INSERT INTO project_invitations (project_id, from_wallet, to_code, direction, message)
    VALUES (p1, admin_w, 'ABCD2345', 'farmer_referral', '__pt__');
    INSERT INTO proj_test
    SELECT 6, 'three invite directions', count(DISTINCT direction)::text, '3'
    FROM project_invitations WHERE message = '__pt__';

    DELETE FROM project_invitations WHERE message = '__pt__';
    DELETE FROM project_members WHERE project_id IN (p1, p2);
    DELETE FROM projects WHERE project_id IN (p1, p2);
    DELETE FROM farms WHERE farm_id = f1;
END $$;

SELECT check_name, result, expected,
       CASE WHEN result = expected THEN 'PASS' ELSE 'FAIL' END AS verdict
FROM proj_test

UNION ALL
SELECT 'farms rows', count(*)::text, '7',
       CASE WHEN count(*) = 7 THEN 'PASS' ELSE 'FAIL' END FROM farms

UNION ALL
SELECT 'projects left over', count(*)::text, '0',
       CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END FROM projects;
