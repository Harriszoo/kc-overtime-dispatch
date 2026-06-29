import sql from "./db";

export type AuditAction =
  | "shift.created"
  | "shift.approved"
  | "shift.cancelled"
  | "shift.status_changed"
  | "call.offered"
  | "call.accepted"
  | "call.declined"
  | "call.no_answer";

export type AuditEntry = {
  id:          string;
  actor_name:  string;
  actor_email: string | null;
  action:      AuditAction;
  entity_type: "shift" | "call_log";
  entity_id:   string;
  payload:     Record<string, unknown>;
  created_at:  string;
};

export async function logAudit(params: {
  actorName:   string;
  actorEmail?: string | null;
  action:      AuditAction;
  entityType:  "shift" | "call_log";
  entityId:    string;
  payload:     Record<string, unknown>;
}): Promise<void> {
  await sql`
    INSERT INTO audit_log (actor_name, actor_email, action, entity_type, entity_id, payload)
    VALUES (
      ${params.actorName},
      ${params.actorEmail ?? null},
      ${params.action},
      ${params.entityType},
      ${params.entityId},
      ${sql.json(params.payload as unknown as Record<string, string>)}
    )
  `;
}

export async function getAuditLog(limit = 200): Promise<AuditEntry[]> {
  return sql<AuditEntry[]>`
    SELECT * FROM audit_log
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}
