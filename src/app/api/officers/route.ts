import { NextRequest, NextResponse } from "next/server";
import { getOfficers, getEligibleOfficers } from "@/lib/officers";
import { ShiftPostEnum } from "@/types";

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const post       = p.get("post");
  const shiftStart = p.get("shiftStart");
  const shiftEnd   = p.get("shiftEnd");
  const isActive   = p.get("isActive");

  try {
    // Eligibility-filtered list when all three scheduling params are present
    if (post && shiftStart && shiftEnd) {
      const postParsed = ShiftPostEnum.safeParse(post);
      if (!postParsed.success) {
        return NextResponse.json({ error: "Invalid post value" }, { status: 422 });
      }
      const officers = await getEligibleOfficers(
        postParsed.data,
        new Date(shiftStart),
        new Date(shiftEnd)
      );
      return NextResponse.json(officers);
    }

    const officers = await getOfficers({
      isActive: isActive !== null ? isActive === "true" : undefined,
    });
    return NextResponse.json(officers);
  } catch {
    return NextResponse.json({ error: "Failed to fetch officers" }, { status: 500 });
  }
}
