import { NextRequest, NextResponse } from "next/server";
import { getOfficerById } from "@/lib/officers";
import { getShiftsByOfficer } from "@/lib/shifts";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const [officer, shifts] = await Promise.all([
    getOfficerById(id),
    getShiftsByOfficer(id),
  ]);
  if (!officer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...officer, shifts });
}
