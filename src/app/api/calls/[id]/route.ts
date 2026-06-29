import { NextRequest, NextResponse } from "next/server";
import { updateCallResponse } from "@/lib/calls";
import { updateShiftStatus, getShiftById } from "@/lib/shifts";
import { auth, isSupervisor } from "@/auth";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

const VALID_RESPONSES = new Set(["accepted", "declined", "no_answer"]);

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupervisor(session.user.rank)) {
    return NextResponse.json({ error: "Supervisor role required" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { response, notes } = body as { response?: string; notes?: string };

  if (!response || !VALID_RESPONSES.has(response)) {
    return NextResponse.json({ error: "response must be accepted | declined | no_answer" }, { status: 422 });
  }

  const entry = await updateCallResponse(
    id,
    response as "accepted" | "declined" | "no_answer",
    notes ?? null
  );
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const shift = await getShiftById(entry.shift_id);

  // Auto-approve the shift when an officer accepts
  if (response === "accepted" && shift?.status === "pending") {
    await updateShiftStatus(shift.id, "approved", session.user.personnelId ?? null);
    logAudit({
      actorName:  session.user.name ?? "Unknown",
      actorEmail: session.user.email,
      action:     "shift.approved",
      entityType: "shift",
      entityId:   shift.id,
      payload: {
        shift_id: shift.id,
        post:     shift.post,
        officer:  `${entry.last_name}, ${entry.first_name}`,
        new_status: "approved",
      },
    }).catch(() => {});
  }

  const auditAction =
    response === "accepted"  ? "call.accepted"  :
    response === "declined"  ? "call.declined"  :
    "call.no_answer";

  logAudit({
    actorName:  session.user.name ?? "Unknown",
    actorEmail: session.user.email,
    action:     auditAction,
    entityType: "call_log",
    entityId:   id,
    payload: {
      shift_id:   entry.shift_id,
      post:       shift?.post ?? "",
      officer:    `${entry.last_name}, ${entry.first_name}`,
      call_order: entry.call_order,
      notes:      notes ?? null,
    },
  }).catch(() => {});

  return NextResponse.json(entry);
}
