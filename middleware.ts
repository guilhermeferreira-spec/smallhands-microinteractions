import { NextRequest, NextResponse } from "next/server";

// Validate an HTTP Basic Auth header against expected user/pass.
function checkBasic(
  header: string | null,
  user: string,
  pass: string
): boolean {
  if (!header) return false;
  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) return false;
  const decoded = atob(encoded);
  const idx = decoded.indexOf(":");
  return decoded.slice(0, idx) === user && decoded.slice(idx + 1) === pass;
}

function deny(realm: string) {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${realm}", charset="UTF-8"` },
  });
}

export function middleware(req: NextRequest) {
  const header = req.headers.get("authorization");
  const path = req.nextUrl.pathname;

  // Presenter controls — separate, stronger password.
  // Different realm forces the browser to prompt again on /present.
  if (path === "/present" || path.startsWith("/present/")) {
    const user = process.env.PRESENTER_USER ?? "presenter";
    const pass = process.env.PRESENTER_PASSWORD;
    if (!pass) return NextResponse.next(); // unset → open (local dev)
    return checkBasic(header, user, pass)
      ? NextResponse.next()
      : deny("smallhands-present");
  }

  // Everything else — site-wide audience password.
  const user = process.env.SITE_USER ?? "smallhands";
  const pass = process.env.SITE_PASSWORD;
  if (!pass) return NextResponse.next(); // unset → open (local dev)
  return checkBasic(header, user, pass)
    ? NextResponse.next()
    : deny("smallhands");
}

export const config = {
  // Gate everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
