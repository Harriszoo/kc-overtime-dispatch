import { NextRequest, NextResponse } from "next/server";
import { getShifts, createShift } from "@/lib/shifts";
import { getOfficerById } from "@/lib/officers";
import { CreateShiftSchema, ShiftAssignmentRequestSchema, checkAntiFatigueWindow } from "@/types";
import type { ShiftPost } from "@/types";

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  try {
    const shifts = await getShifts({
      officerId: p.get("officerId") ?? undefined,
      status:    p.get("status")   ?? undefined,
      post:      (p.get("post") ?? undefined) as ShiftPost | undefined,
    });
    return NextResponse.json(shifts);
  } catch {
    return NextResponse.json({ error: "Failed to fetch shifts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateShiftSchema.safeParse((body as Record<string, unknown>)?.shift);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const officer = await getOfficerById(parsed.data.officer_id);
  if (!officer) {
    return NextResponse.json({ error: "Officer not found" }, { status: 404 });
  }

  // Cross-field: active status + certification check
  const assignment = ShiftAssignmentRequestSchema.safeParse({ officer, shift: parsed.data });
  if (!assignment.success) {
    return NextResponse.json({ error: assignment.error.flatten() }, { status: 422 });
  }

  // Pre-insert fatigue window check (DB trigger is the final backstop)
  const existing = await getShifts({ officerId: officer.id });
  const fatigue = checkAntiFatigueWindow(existing, {
    officer_id:  officer.id,
    post:        parsed.data.post,
    shift_start: parsed.data.shift_start,
    shift_end:   parsed.data.shift_end,
  });
  if (!fatigue.pass) {
    return NextResponse.json(
      { error: fatigue.error, violationType: fatigue.violationType },
      { status: 409 }
    );
  }

  try {
    const shift = await createShift(parsed.data);
    return NextResponse.json(shift, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("ANTI_FATIGUE")) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create shift" }, { status: 500 });
  }
}
