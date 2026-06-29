import sql from "./db";
import type { Shift, ShiftPost } from "@/types";

// Shift row as returned by join queries (includes officer name fields)
export type ShiftRow = Shift & {
  first_name: string;
  last_name: string;
  badge_number: string;
};

type GetShiftsOptions = {
  officerId?: string;
  after?: Date;
  before?: Date;
  status?: string;
  post?: ShiftPost;
};

export async function getShifts(opts: GetShiftsOptions = {}): Promise<ShiftRow[]> {
  return sql<ShiftRow[]>`
    SELECT s.*, p.first_name, p.last_name, p.badge_number
    FROM   shifts s
    JOIN   personnel p ON p.id = s.officer_id
    WHERE  TRUE
      ${opts.officerId ? sql`AND s.officer_id = ${opts.officerId}` : sql``}
      ${opts.after     ? sql`AND s.shift_start >= ${opts.after}`   : sql``}
      ${opts.before    ? sql`AND s.shift_end   <= ${opts.before}`  : sql``}
      ${opts.status    ? sql`AND s.status = ${opts.status}`        : sql``}
      ${opts.post      ? sql`AND s.post = ${opts.post}`            : sql``}
    ORDER BY s.shift_start ASC
  `;
}

export async function getShiftById(id: string): Promise<ShiftRow | null> {
  const rows = await sql<ShiftRow[]>`
    SELECT s.*, p.first_name, p.last_name, p.badge_number
    FROM   shifts s
    JOIN   personnel p ON p.id = s.officer_id
    WHERE  s.id = ${id}
    LIMIT  1
  `;
  return rows[0] ?? null;
}

export async function getShiftsByOfficer(officerId: string): Promise<ShiftRow[]> {
  return getShifts({ officerId });
}

export async function createShift(data: {
  officer_id: string;
  post: string;
  shift_type: string;
  shift_start: Date;
  shift_end: Date;
  notes?: string | null;
  created_by?: string | null;
}): Promise<Shift> {
  const rows = await sql<Shift[]>`
    INSERT INTO shifts (officer_id, post, shift_type, shift_start, shift_end, notes, created_by)
    VALUES (
      ${data.officer_id},
      ${data.post},
      ${data.shift_type},
      ${data.shift_start},
      ${data.shift_end},
      ${data.notes ?? null},
      ${data.created_by ?? null}
    )
    RETURNING *
  `;
  return rows[0];
}

export async function updateShiftStatus(
  id: string,
  status: string,
  approvedBy?: string | null
): Promise<Shift | null> {
  const rows = await sql<Shift[]>`
    UPDATE shifts
    SET    status      = ${status},
           approved_by = ${approvedBy ?? null},
           approved_at = ${status === "approved" ? sql`NOW()` : sql`NULL`}
    WHERE  id = ${id}
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function cancelShift(id: string): Promise<void> {
  await sql`UPDATE shifts SET status = 'cancelled' WHERE id = ${id}`;
}
