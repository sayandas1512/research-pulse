import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/src/lib/auth";

const PROTECTED_PAGE_PREFIXES = ["/settings", "/log", "/runs", "/backtest"];
const PROTECTED_API_PREFIX = "/api/admin";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isProtectedApi = pathname.startsWith(PROTECTED_API_PREFIX);
  if (!isProtectedPage && !isProtectedApi) return NextResponse.next();

  const sessionSecret = process.env.SESSION_SECRET;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const valid = sessionSecret ? await verifySessionToken(token, sessionSecret) : false;

  if (valid) return NextResponse.next();

  if (isProtectedApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/settings/:path*", "/log/:path*", "/runs/:path*", "/backtest/:path*", "/api/admin/:path*"],
};
