import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (!req.auth) {
    // API routes: return 401 instead of redirecting
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  // Protect everything except NextAuth endpoints, the login page, and Next.js internals
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)"],
};
