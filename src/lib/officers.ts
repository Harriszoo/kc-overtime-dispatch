import sql from "./db";
import type { Personnel, ShiftPost } from "@/types";
import { POST_CERTIFICATION_REQUIREMENTS } from "@/types";

type GetOfficersOptions = {
  isActive?: boolean;
  certifications?: string[];
  unit?: string;
};

export async function getOfficers(opts: GetOfficersOptions = {}): Promise<Personnel[]> {
  return sql<Personnel[]>`
    SELECT * FROM personnel
    WHERE  TRUE
      ${opts.isActive !== undefined ? sql`AND is_active = ${opts.isActive}` : sql``}
      ${opts.certifications?.length  ? sql`AND certifications @> ${opts.certifications}` : sql``}
      ${opts.unit                    ? sql`AND unit = ${opts.unit}` : sql``}
    ORDER BY last_name ASC, first_name ASC
  `;
}

export async function getOfficerById(id: string): Promise<Personnel | null> {
  const rows = await sql<Personnel[]>`
    SELECT * FROM personnel WHERE id = ${id} LIMIT 1
  `;
  return rows[0] ?? null;
}

// Returns active officers who hold all required certifications for the given post
// AND have a clear 8-hour rest window around the proposed shift window.
// Mirrors the anti-fatigue logic in the DB trigger and overtime-core.ts.
export async function getEligibleOfficers(
  post: ShiftPost,
  shiftStart: Date,
  shiftEnd: Date
): Promise<Personnel[]> {
  const requiredCerts = POST_CERTIFICATION_REQUIREMENTS[post];

  return sql<Personnel[]>`
    SELECT p.*
    FROM   personnel p
    WHERE  p.is_active = TRUE
      ${requiredCerts.length > 0 ? sql`AND p.certifications @> ${requiredCerts}` : sql``}
      AND NOT EXISTS (
        SELECT 1 FROM shifts s
        WHERE  s.officer_id = p.id
          AND  s.status != 'cancelled'
          AND (
            tstzrange(s.shift_start, s.shift_end, '[)') && tstzrange(${shiftStart}, ${shiftEnd}, '[)')
            OR (s.shift_end   <= ${shiftStart} AND ${shiftStart} - s.shift_end   < INTERVAL '8 hours')
            OR (s.shift_start >= ${shiftEnd}   AND s.shift_start - ${shiftEnd}   < INTERVAL '8 hours')
          )
      )
    ORDER BY p.seniority_date ASC
  `;
}
