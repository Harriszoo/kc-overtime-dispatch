import sql from "./db";

export type CallEntry = {
  id: string;
  shift_id: string;
  officer_id: string;
  call_order: number;
  called_at: string;
  called_by: string;
  response: "accepted" | "declined" | "no_answer" | null;
  responded_at: string | null;
  notes: string | null;
  // joined from personnel
  first_name: string;
  last_name: string;
  badge_number: string;
  rank: string;
  seniority_date: string;
};

export async function getCallLog(shiftId: string): Promise<CallEntry[]> {
  return sql<CallEntry[]>`
    SELECT cl.*, p.first_name, p.last_name, p.badge_number, p.rank, p.seniority_date
    FROM   call_log cl
    JOIN   personnel p ON p.id = cl.officer_id
    WHERE  cl.shift_id = ${shiftId}
    ORDER  BY cl.call_order ASC
  `;
}

export async function createCallEntry(
  shiftId: string,
  officerId: string,
  calledBy: string
): Promise<CallEntry> {
  const rows = await sql<CallEntry[]>`
    WITH next_order AS (
      SELECT COALESCE(MAX(call_order), 0) + 1 AS n
      FROM   call_log
      WHERE  shift_id = ${shiftId}
    )
    INSERT INTO call_log (shift_id, officer_id, call_order, called_by)
    SELECT ${shiftId}, ${officerId}, n, ${calledBy}
    FROM   next_order
    RETURNING
      call_log.*,
      (SELECT first_name FROM personnel WHERE id = ${officerId}) AS first_name,
      (SELECT last_name  FROM personnel WHERE id = ${officerId}) AS last_name,
      (SELECT badge_number FROM personnel WHERE id = ${officerId}) AS badge_number,
      (SELECT rank FROM personnel WHERE id = ${officerId}) AS rank,
      (SELECT seniority_date FROM personnel WHERE id = ${officerId}) AS seniority_date
  `;
  return rows[0];
}

export async function updateCallResponse(
  id: string,
  response: "accepted" | "declined" | "no_answer",
  notes?: string | null
): Promise<CallEntry | null> {
  const rows = await sql<CallEntry[]>`
    UPDATE call_log
    SET    response     = ${response},
           responded_at = NOW(),
           notes        = COALESCE(${notes ?? null}, notes)
    WHERE  id = ${id}
    RETURNING
      call_log.*,
      (SELECT first_name   FROM personnel WHERE id = call_log.officer_id) AS first_name,
      (SELECT last_name    FROM personnel WHERE id = call_log.officer_id) AS last_name,
      (SELECT badge_number FROM personnel WHERE id = call_log.officer_id) AS badge_number,
      (SELECT rank         FROM personnel WHERE id = call_log.officer_id) AS rank,
      (SELECT seniority_date FROM personnel WHERE id = call_log.officer_id) AS seniority_date
  `;
  return rows[0] ?? null;
}
