import { NextRequest, NextResponse } from "next/server";
import { getCallLog, createCallEntry } from "@/lib/calls";
import { auth, isSupervisor } from "@/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  return NextResponse.json(await getCallLog(id));
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupervisor(session.user.rank)) {
    return NextResponse.json({ error: "Supervisor role required" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const officerId = body?.officerId as string | undefined;
  if (!officerId) {
    return NextResponse.json({ error: "officerId required" }, { status: 422 });
  }

  try {
    const entry = await createCallEntry(id, officerId, session.user.name ?? "Unknown");
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    // unique constraint = officer already in log for this shift
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "Officer already in call log for this shift" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to log call" }, { status: 500 });
  }
}
