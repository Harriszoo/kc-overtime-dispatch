import { NextRequest, NextResponse } from "next/server";
import { getShiftById, updateShiftStatus, cancelShift } from "@/lib/shifts";
import { ShiftStatusEnum } from "@/types";
import { auth, isSupervisor } from "@/auth";

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

  const shift = await updateShiftStatus(id, status.data, session.user.name ?? null);
  if (!shift) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(shift);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupervisor(session.user.rank)) {
    return NextResponse.json({ error: "Supervisor role required" }, { status: 403 });
  }

  const { id } = await params;
  await cancelShift(id);
  return new NextResponse(null, { status: 204 });
}
