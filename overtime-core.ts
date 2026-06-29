import type { Shift, ShiftPost } from "./overtime.schema";

const EIGHT_HOURS_MS    = 8  * 60 * 60 * 1000;
const SIXTEEN_HOURS_MS  = 16 * 60 * 60 * 1000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProposedShift = {
  officer_id:  string;
  post:        ShiftPost;
  shift_start: Date | string;
  shift_end:   Date | string;
};

export type FatigueViolationType =
  | "SHIFT_TOO_LONG"
  | "SHIFT_OVERLAP"
  | "INSUFFICIENT_REST_BEFORE"
  | "INSUFFICIENT_REST_AFTER";

export type FatigueCheckResult =
  | { pass: true }
  | { pass: false; violationType: FatigueViolationType; error: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const hours        = Math.floor(totalMinutes / 60);
  const minutes      = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString("en-US", {
    month:        "short",
    day:          "numeric",
    hour:         "2-digit",
    minute:       "2-digit",
    timeZoneName: "short",
  });
}

// ─── Core Function ────────────────────────────────────────────────────────────

/**
 * Validates a proposed shift against an officer's existing schedule.
 *
 * Rules enforced (mirrors the database trigger in overtime.sql):
 *   1. A single shift cannot exceed 16 consecutive hours.
 *   2. No proposed shift may overlap an existing active shift.
 *   3. At least 8 hours of rest must separate consecutive shifts (both directions).
 *
 * @param existingShifts  All shifts currently on record for any officers.
 *                        The function filters to the relevant officer internally.
 * @param proposedShift   The shift being evaluated before database insertion.
 * @returns               { pass: true } on success, or a typed failure with a
 *                        human-readable error message suitable for display in the UI.
 */
export function checkAntiFatigueWindow(
  existingShifts: Shift[],
  proposedShift:  ProposedShift
): FatigueCheckResult {
  const proposedStart = new Date(proposedShift.shift_start).getTime();
  const proposedEnd   = new Date(proposedShift.shift_end).getTime();

  // ── Rule 1: duration cap ───────────────────────────────────────────────────
  const duration = proposedEnd - proposedStart;
  if (duration > SIXTEEN_HOURS_MS) {
    return {
      pass:          false,
      violationType: "SHIFT_TOO_LONG",
      error:         `Shift duration of ${formatDuration(duration)} exceeds the 16-hour maximum. Shorten the shift before assigning.`,
    };
  }

  // Active shifts for this officer only
  const activeShifts = existingShifts.filter(
    (s) => s.officer_id === proposedShift.officer_id && s.status !== "cancelled"
  );

  for (const existing of activeShifts) {
    const existingStart = new Date(existing.shift_start).getTime();
    const existingEnd   = new Date(existing.shift_end).getTime();

    // ── Rule 2: overlap check ────────────────────────────────────────────────
    const overlaps = proposedStart < existingEnd && proposedEnd > existingStart;
    if (overlaps) {
      return {
        pass:          false,
        violationType: "SHIFT_OVERLAP",
        error:         `Proposed shift overlaps an existing "${existing.post}" assignment (${formatTimestamp(new Date(existingStart))} – ${formatTimestamp(new Date(existingEnd))}).`,
      };
    }

    // ── Rule 3: 8-hour rest before proposed shift ────────────────────────────
    // An existing shift ends before the proposed shift starts
    if (existingEnd <= proposedStart) {
      const gap = proposedStart - existingEnd;
      if (gap < EIGHT_HOURS_MS) {
        return {
          pass:          false,
          violationType: "INSUFFICIENT_REST_BEFORE",
          error:         `Only ${formatDuration(gap)} of rest before proposed shift start. 8 hours required after "${existing.post}" ending at ${formatTimestamp(new Date(existingEnd))}.`,
        };
      }
    }

    // ── Rule 4: 8-hour rest after proposed shift ─────────────────────────────
    // An existing shift starts after the proposed shift ends
    if (existingStart >= proposedEnd) {
      const gap = existingStart - proposedEnd;
      if (gap < EIGHT_HOURS_MS) {
        return {
          pass:          false,
          violationType: "INSUFFICIENT_REST_AFTER",
          error:         `Only ${formatDuration(gap)} of rest after proposed shift end. 8 hours required before "${existing.post}" starting at ${formatTimestamp(new Date(existingStart))}.`,
        };
      }
    }
  }

  return { pass: true };
}
