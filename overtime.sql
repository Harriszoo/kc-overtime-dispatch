-- King County DAJD Overtime Dispatch System
-- PostgreSQL DDL Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE shift_post AS ENUM (
    'Vacation/Sick Leave Relief',
    'Gun Position / Court Detail / Transport',
    'Intake & Releases',
    'Visiting Control',
    'Hospital Watch',
    'Response and Movement Officer',
    'Central Control'
);

CREATE TYPE shift_status AS ENUM (
    'pending',
    'approved',
    'active',
    'completed',
    'cancelled'
);

CREATE TYPE shift_type AS ENUM (
    'regular',
    'overtime',
    'voluntary_overtime',
    'mandatory_overtime'
);

CREATE TYPE officer_rank AS ENUM (
    'Corrections Officer',
    'Senior Corrections Officer',
    'Corrections Sergeant',
    'Corrections Lieutenant',
    'Corrections Captain'
);

-- ─── Personnel ────────────────────────────────────────────────────────────────

CREATE TABLE personnel (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     VARCHAR(20)     UNIQUE NOT NULL,
    badge_number    VARCHAR(10)     UNIQUE NOT NULL,
    first_name      VARCHAR(100)    NOT NULL,
    last_name       VARCHAR(100)    NOT NULL,
    rank            officer_rank    NOT NULL DEFAULT 'Corrections Officer',
    hire_date       DATE            NOT NULL,
    -- seniority_date may differ from hire_date due to lateral transfers or union agreements
    seniority_date  TIMESTAMPTZ     NOT NULL,
    certifications  TEXT[]          NOT NULL DEFAULT '{}',
    unit            VARCHAR(100),
    email           VARCHAR(255)    UNIQUE NOT NULL,
    phone           VARCHAR(20),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_personnel_employee_id   ON personnel(employee_id);
CREATE INDEX idx_personnel_is_active     ON personnel(is_active);
CREATE INDEX idx_personnel_seniority     ON personnel(seniority_date);
CREATE INDEX idx_personnel_certs         ON personnel USING GIN(certifications);

-- ─── Shifts ───────────────────────────────────────────────────────────────────

CREATE TABLE shifts (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    officer_id      UUID            NOT NULL REFERENCES personnel(id) ON DELETE RESTRICT,
    post            shift_post      NOT NULL,
    shift_type      shift_type      NOT NULL DEFAULT 'overtime',
    shift_start     TIMESTAMPTZ     NOT NULL,
    shift_end       TIMESTAMPTZ     NOT NULL,
    status          shift_status    NOT NULL DEFAULT 'pending',
    notes           TEXT,
    approved_by     UUID            REFERENCES personnel(id),
    approved_at     TIMESTAMPTZ,
    created_by      UUID            REFERENCES personnel(id),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT shift_end_after_start
        CHECK (shift_end > shift_start),

    -- Hard cap at DDL level; trigger enforces the same rule with a human-readable error
    CONSTRAINT shift_max_16_hours
        CHECK (shift_end - shift_start <= INTERVAL '16 hours')
);

CREATE INDEX idx_shifts_officer_id  ON shifts(officer_id);
CREATE INDEX idx_shifts_start       ON shifts(shift_start);
CREATE INDEX idx_shifts_status      ON shifts(status);

-- GiST exclusion index: prevents overlapping active shifts for the same officer
-- at the storage layer (complements the trigger check)
CREATE INDEX idx_shifts_time_range ON shifts USING GIST (
    officer_id,
    tstzrange(shift_start, shift_end, '[)')
);

-- ─── Anti-Fatigue Trigger ─────────────────────────────────────────────────────
--
-- Enforces two operational safety rules for DAJD scheduling:
--   1. No single shift may exceed 16 consecutive hours.
--   2. Every officer must have at least 8 hours of unbroken rest between shifts.
--
-- Cancelled shifts are excluded from all window calculations so that
-- voided assignments never create phantom rest-window violations.

CREATE OR REPLACE FUNCTION enforce_anti_fatigue_rules()
RETURNS TRIGGER AS $$
DECLARE
    v_nearest_end   TIMESTAMPTZ;
    v_nearest_start TIMESTAMPTZ;
    v_gap_before    INTERVAL;
    v_gap_after     INTERVAL;
    v_duration      INTERVAL;
BEGIN
    -- Cancelled shifts are inert; skip all checks
    IF NEW.status = 'cancelled' THEN
        RETURN NEW;
    END IF;

    -- ── Rule 1: shift duration ─────────────────────────────────────────────────
    v_duration := NEW.shift_end - NEW.shift_start;
    IF v_duration > INTERVAL '16 hours' THEN
        RAISE EXCEPTION
            'ANTI_FATIGUE: Shift duration of % exceeds the 16-hour maximum.', v_duration
            USING ERRCODE = 'check_violation';
    END IF;

    -- ── Rule 2: no overlapping active shifts ───────────────────────────────────
    IF EXISTS (
        SELECT 1 FROM shifts
        WHERE  officer_id = NEW.officer_id
          AND  status     != 'cancelled'
          AND  (TG_OP = 'INSERT' OR id != NEW.id)
          AND  tstzrange(shift_start, shift_end, '[)')
            && tstzrange(NEW.shift_start, NEW.shift_end, '[)')
    ) THEN
        RAISE EXCEPTION
            'ANTI_FATIGUE: Proposed shift overlaps an existing active assignment.'
            USING ERRCODE = 'exclusion_violation';
    END IF;

    -- ── Rule 3: 8-hour rest window before new shift ────────────────────────────
    SELECT MAX(shift_end) INTO v_nearest_end
    FROM   shifts
    WHERE  officer_id = NEW.officer_id
      AND  status     != 'cancelled'
      AND  (TG_OP = 'INSERT' OR id != NEW.id)
      AND  shift_end  <= NEW.shift_start;

    IF v_nearest_end IS NOT NULL THEN
        v_gap_before := NEW.shift_start - v_nearest_end;
        IF v_gap_before < INTERVAL '8 hours' THEN
            RAISE EXCEPTION
                'ANTI_FATIGUE: Only % of rest before shift start (minimum 8 hours required). Last shift ended at %.',
                v_gap_before, v_nearest_end
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    -- ── Rule 4: 8-hour rest window after new shift ─────────────────────────────
    SELECT MIN(shift_start) INTO v_nearest_start
    FROM   shifts
    WHERE  officer_id  = NEW.officer_id
      AND  status      != 'cancelled'
      AND  (TG_OP = 'INSERT' OR id != NEW.id)
      AND  shift_start >= NEW.shift_end;

    IF v_nearest_start IS NOT NULL THEN
        v_gap_after := v_nearest_start - NEW.shift_end;
        IF v_gap_after < INTERVAL '8 hours' THEN
            RAISE EXCEPTION
                'ANTI_FATIGUE: Only % of rest after shift end (minimum 8 hours required). Next shift starts at %.',
                v_gap_after, v_nearest_start
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_anti_fatigue
    BEFORE INSERT OR UPDATE ON shifts
    FOR EACH ROW EXECUTE FUNCTION enforce_anti_fatigue_rules();

-- ─── Audit: updated_at maintenance ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_personnel_updated_at
    BEFORE UPDATE ON personnel
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_shifts_updated_at
    BEFORE UPDATE ON shifts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Call Log ─────────────────────────────────────────────────────────────────
-- Tracks each overtime offer made to an eligible officer for a given shift.
-- Used for union call-order compliance (inverse seniority) and grievance defense.

CREATE TABLE call_log (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id     UUID        NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    officer_id   UUID        NOT NULL REFERENCES personnel(id),
    call_order   SMALLINT    NOT NULL,            -- 1 = first officer offered
    called_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    called_by    TEXT        NOT NULL,            -- display name of supervisor
    response     TEXT        CHECK (response IN ('accepted','declined','no_answer')),
    responded_at TIMESTAMPTZ,
    notes        TEXT,
    UNIQUE (shift_id, officer_id)                 -- each officer offered at most once per shift
);

CREATE INDEX idx_call_log_shift ON call_log (shift_id, call_order);

-- ─── Audit Log ───────────────────────────────────────────────────────────────
-- Immutable record of every write action performed in the application.
-- Used for union grievance defense, accountability, and compliance reporting.

CREATE TABLE audit_log (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_name   TEXT        NOT NULL,
    actor_email  TEXT,
    action       TEXT        NOT NULL,   -- e.g. 'shift.created', 'call.declined'
    entity_type  TEXT        NOT NULL,   -- 'shift' | 'call_log'
    entity_id    UUID        NOT NULL,
    payload      JSONB       NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_created_at  ON audit_log (created_at DESC);
CREATE INDEX idx_audit_log_entity      ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_log_actor_email ON audit_log (actor_email);

-- Auth columns (added via migration; listed here for fresh installs)
ALTER TABLE personnel
    ADD COLUMN IF NOT EXISTS email         TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS password_hash TEXT;
