# KC Overtime Dispatch — Standalone Core Files

This directory contains the foundational logic layer for the King County Department of Adult and Juvenile Detention (DAJD) Overtime Dispatch system. These four files are intentionally self-contained and framework-agnostic — they can be consumed by any web, API, or CLI layer built on top.

---

## Directory Layout

```
kc-overtime-dispatch/
├── overtime.sql          # PostgreSQL DDL — tables, enums, indexes, triggers
├── overtime.schema.ts    # Zod validation schemas — types, rules, cert checks
├── overtime-core.ts      # Pure TypeScript fatigue logic — no DB dependency
└── README-overtime.md    # This file
```

A full web application will add directories alongside these files (e.g. `src/`, `app/`, `api/`). The four files here remain stable regardless of what UI framework is chosen.

---

## File Descriptions

### `overtime.sql`

Defines the complete PostgreSQL schema:

**`personnel`** — One row per DAJD corrections officer.
- `employee_id` and `badge_number` are both unique, matching existing HR identifiers.
- `seniority_date` is tracked separately from `hire_date` because lateral transfers and contract reclassifications can reset seniority without resetting tenure.
- `certifications` is a `TEXT[]` array using short certification codes (e.g. `FIREARMS_CERT`, `CENTRAL_CONTROL_CERT`). Arrays were chosen over a separate join table because certification lists are small, read-frequently, and updated infrequently; the GIN index on the column makes `certifications @> ARRAY['X']` queries fast.

**`shifts`** — One row per scheduled shift slot.
- `post` is a `ENUM` type hard-coded to the seven DAJD operational posts, preventing free-text drift.
- The `status` lifecycle is `pending → approved → active → completed`, with `cancelled` as a terminal state that removes the record from all fatigue calculations.
- A GiST index on `tstzrange(shift_start, shift_end)` enables efficient overlap queries without a full table scan.

**Anti-fatigue trigger (`trg_anti_fatigue`)** — Runs `BEFORE INSERT OR UPDATE` on every non-cancelled shift row:
1. Rejects any shift whose duration exceeds 16 hours.
2. Rejects any shift that overlaps an existing active assignment for the same officer.
3. Rejects any shift where the incoming officer has less than 8 hours of rest from their previous shift.
4. Rejects any shift where the next scheduled shift leaves less than 8 hours of rest after it ends.

Cancelled shifts are skipped in all window calculations so that voided records never create phantom constraint violations when re-scheduling.

---

### `overtime.schema.ts`

Zod schemas that mirror the database types exactly, used for validation at the API boundary (server-side) and optionally in the UI (client-side, tree-shakeable).

Key exports:

| Export | Purpose |
|---|---|
| `ShiftPostEnum` | The seven DAJD post names as a Zod enum |
| `POST_CERTIFICATION_REQUIREMENTS` | Authoritative map of post → required cert codes |
| `validatePostCertifications()` | Returns `{ valid, missing }` for a given post + officer cert list |
| `PersonnelSchema` / `CreatePersonnelSchema` | Full and insert-only personnel shapes |
| `ShiftSchema` / `CreateShiftSchema` | Full and insert-only shift shapes; `CreateShiftSchema` enforces 16-hour cap inline |
| `ShiftAssignmentRequestSchema` | Cross-field schema that validates certs and active status together |

`ShiftAssignmentRequestSchema` is the main entry point for the assignment flow. It receives the full officer object alongside the proposed shift so it can reject the request with specific missing-certification names before anything reaches the database.

---

### `overtime-core.ts`

A single exported function with no runtime dependencies (no database, no HTTP, no framework):

```typescript
checkAntiFatigueWindow(existingShifts: Shift[], proposedShift: ProposedShift): FatigueCheckResult
```

**Why a separate file from the Zod schemas?** The fatigue logic needs to run in two contexts:
1. **Pre-submit validation in the UI** — before the API call is made, giving the scheduler immediate feedback without a round-trip.
2. **Server-side double-check** — after the Zod parse, before the INSERT, as a final guard. The database trigger is the hard backstop, but surfacing the error here gives the API layer a structured `violationType` to return.

**Return shape:**
```typescript
{ pass: true }
// or
{ pass: false; violationType: FatigueViolationType; error: string }
```

`violationType` is a typed discriminant (`SHIFT_TOO_LONG | SHIFT_OVERLAP | INSUFFICIENT_REST_BEFORE | INSUFFICIENT_REST_AFTER`) that the UI can use to highlight the specific conflict — for example, scrolling to and visually flagging the offending existing shift on a timeline view.

The function only ever operates on the officer's own existing shifts (it filters by `officer_id` internally) and ignores `cancelled` shifts, matching the trigger's behavior exactly.

---

## Anti-Fatigue Logic — Design Rationale

Officer fatigue is a direct operational security risk in detention environments. The rules encoded in this system are:

| Rule | Value | Enforcement Layer |
|---|---|---|
| Maximum consecutive shift length | 16 hours | DB check constraint + trigger + Zod schema + `checkAntiFatigueWindow` |
| Minimum rest between shifts | 8 hours | DB trigger + `checkAntiFatigueWindow` |
| No overlapping assignments | — | DB trigger (GiST exclusion) + `checkAntiFatigueWindow` |
| Certification lock-out per post | varies | Zod `ShiftAssignmentRequestSchema` + `validatePostCertifications` |

The four-layer approach (UI pre-check → Zod → core function → DB trigger) is intentional: each layer provides defense-in-depth so that no single failure (e.g. a bypassed API route, a direct DB connection) can result in an unsafe assignment being committed.

---

## Certification Codes Reference

| Code | Required For |
|---|---|
| `FIREARMS_CERT` | Gun Position / Court Detail / Transport; Response and Movement Officer |
| `TRANSPORT_CERT` | Gun Position / Court Detail / Transport |
| `CENTRAL_CONTROL_CERT` | Central Control |
| `MEDICAL_WATCH_CERT` | Hospital Watch |
| `INTAKE_CERT` | Intake & Releases |
| `COURT_DETAIL_CERT` | (Reserved — available for future Court Detail split-out) |

Certification codes are stored as plain strings in `personnel.certifications[]`. Adding a new cert requirement for a post requires updating `POST_CERTIFICATION_REQUIREMENTS` in `overtime.schema.ts` only — no schema migration needed.
