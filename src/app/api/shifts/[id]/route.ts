import { NextRequest, NextResponse } from "next/server";
import { getShiftById, updateShiftStatus, cancelShift } from "@/lib/shifts";
import { ShiftStatusEnum } from "@/types";
import { auth, isSupervisor } from "@/auth";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const shift = await getShiftById(id);
  if (!shift) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(shift);
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupervisor(session.user.rank)) {
    return NextResponse.json({ error: "Supervisor role required" }, { status: 403 });
  }

  const { id } = await params;
  const body   = await request.json();

  const status = ShiftStatusEnum.safeParse(body.status);
  if (!status.success) {
    return NextResponse.json({ error: "Invalid status value" }, { status: 422 });
  }

  // Fetch before update so we have post + officer name for the audit payload
  const before = await getShiftById(id);
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const shift = await updateShiftStatus(id, status.data, session.user.personnelId ?? null);
  if (!shift) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const action =
    status.data === "approved"  ? "shift.approved"  :
    status.data === "cancelled" ? "shift.cancelled"  :
    "shift.status_changed";

  logAudit({
    actorName:  session.user.name ?? "Unknown",
    actorEmail: session.user.email,
    action,
    entityType: "shift",
    entityId:   id,
    payload: {
      shift_id:   id,
      post:       before.post,
      officer:    `${before.last_name}, ${before.first_name}`,
      new_status: status.data,
    },
  }).catch(() => {});

  return NextResponse.json(shift);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupervisor(session.user.rank)) {
    return NextResponse.json({ error: "Supervisor role required" }, { status: 403 });
  }

  const { id } = await params;

  const before = await getShiftById(id);
  await cancelShift(id);

  if (before) {
    logAudit({
      actorName:  session.user.name ?? "Unknown",
      actorEmail: session.user.email,
      action:     "shift.cancelled",
      entityType: "shift",
      entityId:   id,
      payload: {
        shift_id: id,
        post:     before.post,
        officer:  `${before.last_name}, ${before.first_name}`,
      },
    }).catch(() => {});
  }

  return new NextResponse(null, { status: 204 });
}
