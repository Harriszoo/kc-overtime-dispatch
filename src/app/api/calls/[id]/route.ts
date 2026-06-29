import { NextRequest, NextResponse } from "next/server";
import { updateCallResponse } from "@/lib/calls";
import { updateShiftStatus } from "@/lib/shifts";
import sql from "@/lib/db";
import { auth, isSupervisor } from "@/auth";

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

  // If accepted, auto-approve the shift
  if (response === "accepted") {
    const shiftRows = await sql<{ id: string; status: string }[]>`
      SELECT id, status FROM shifts WHERE id = ${entry.shift_id} LIMIT 1
    `;
    const shift = shiftRows[0];
    if (shift && shift.status === "pending") {
      await updateShiftStatus(shift.id, "approved", session.user.name ?? null);
    }
  }

  return NextResponse.json(entry);
}
