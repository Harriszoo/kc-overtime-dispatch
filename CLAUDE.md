# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

King County DAJD Overtime Dispatch System — a Next.js 15 (App Router) scheduling tool for corrections officers at the King County Department of Adult and Juvenile Detention.

## Commands

```bash
npm install          # install dependencies
npm run dev          # start dev server (http://localhost:3000)
npm run build        # production build
npm run typecheck    # tsc --noEmit (no build output)
npm run lint         # eslint
```

Before running: set `DATABASE_URL` in `.env.local` and apply `overtime.sql` to a Postgres instance.

## Repository Layout

```
overtime.sql          # Postgres DDL — run once against the DB
overtime.schema.ts    # Zod schemas + cert validation (no framework dependency)
overtime-core.ts      # checkAntiFatigueWindow() pure TS function
README-overtime.md    # design rationale and cert code reference

src/
  app/               # Next.js App Router pages + API routes
  components/
    dispatch/        # AssignmentForm, FatigueAlert, EligibleOfficerList
    schedule/        # TimelineView, PostCoverageGrid
    roster/          # OfficerCard, CertBadge
    ui/              # Button, Badge, Modal, Toast
  lib/
    db.ts            # postgres.js client (DATABASE_URL)
    shifts.ts        # all DB queries for the shifts table; exports ShiftRow type
    officers.ts      # all DB queries for personnel; exports getEligibleOfficers
  types/
    index.ts         # single re-export surface for overtime.schema + overtime-core
```

## Key Domain Rules

**Anti-fatigue (enforced at every layer):**
- No single shift > 16 consecutive hours
- Minimum 8-hour rest window between any two shifts for the same officer
- No overlapping active assignments

**Certification lock-out per post** (source of truth: `POST_CERTIFICATION_REQUIREMENTS` in `overtime.schema.ts`):
- `Central Control` → `CENTRAL_CONTROL_CERT`
- `Gun Position / Court Detail / Transport` → `FIREARMS_CERT` + `TRANSPORT_CERT`
- `Hospital Watch` → `MEDICAL_WATCH_CERT`
- `Intake & Releases` → `INTAKE_CERT`
- `Response and Movement Officer` → `FIREARMS_CERT`

**Enforcement layers (innermost → outermost):**
1. PostgreSQL trigger `trg_anti_fatigue` — hard backstop; raises `ANTI_FATIGUE:` prefixed exceptions
2. `checkAntiFatigueWindow()` in `overtime-core.ts` — pre-INSERT server check; returns typed `violationType`
3. `ShiftAssignmentRequestSchema` (Zod) — API boundary; validates certs + active status cross-field
4. `AssignmentForm` client-side — calls `checkAntiFatigueWindow` on every input change before submit

## Architecture Notes

- All app code imports from `@/types` (re-exports `overtime.schema` + `overtime-core`). Never import root files directly from `src/`.
- `@core/*` path alias resolves to the repo root for use in `src/types/index.ts` only.
- `ShiftRow` (from `src/lib/shifts.ts`) extends `Shift` with `first_name`, `last_name`, `badge_number` joined from `personnel`. Use `ShiftRow` in components; use `Shift` from `@/types` in schema logic.
- API route `params` are `Promise<{ id: string }>` (Next.js 15 async params) — always `await params`.
- `cancelled` shifts are excluded from all fatigue window calculations in both the trigger and `checkAntiFatigueWindow`.
- `seniority_date` is separate from `hire_date` — lateral transfers can reset seniority without resetting tenure.
- `getEligibleOfficers()` in `officers.ts` runs the cert + rest-window check in a single SQL query (mirrors trigger logic). Use this for the officer picker, not a client-side filter.
