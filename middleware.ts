import { NextRequest, NextResponse } from "next/server";

// Whole-site password gate via HTTP Basic Auth.
// Set SITE_PASSWORD (and optionally SITE_USER) in your Vercel env vars.
// Username defaults to "smallhands" — only the password really matters.
export function middleware(req: NextRequest) {
  const user = process.env.SITE_USER ?? "smallhands";
  const password = process.env.SITE_PASSWORD;

  // If no password configured, fail open (e.g. local dev without env).
  if (!password) return NextResponse.next();

  const header = req.headers.get("authorization");
  if (header) {
    const [scheme, encoded] = header.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const idx = decoded.indexOf(":");
      const givenUser = decoded.slice(0, idx);
      const givenPass = decoded.slice(idx + 1);
      if (givenUser === user && givenPass === password) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="smallhands", charset="UTF-8"' },
  });
}

export const config = {
  // Gate everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
