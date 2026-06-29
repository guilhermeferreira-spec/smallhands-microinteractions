import { NextRequest, NextResponse } from "next/server";

// Cookie-based, password-only gate (no username). Two independent gates:
//   - whole site  -> SITE_PASSWORD       (cookie sh_site)
//   - /present    -> PRESENTER_PASSWORD  (cookie sh_present)
// A gate with no password set falls open (e.g. local dev without env vars).

const COOKIE_SITE = "sh_site";
const COOKIE_PRESENT = "sh_present";
const MAX_AGE = 60 * 60 * 12; // 12h

// Stateless cookie value: SHA-256 of the password. Unguessable without the
// password, and we never store the raw password in the cookie.
async function tokenFor(password: string): Promise<string> {
  const data = new TextEncoder().encode(`smallhands:${password}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function loginPage(action: string, error: boolean): NextResponse {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>smallhands</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center;
    justify-content: center; background: #000; color: #fff;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  form {
    display: flex; flex-direction: column; gap: 16px;
    width: min(90vw, 320px); text-align: center;
  }
  .title { font-size: 14px; letter-spacing: 0.2em; color: rgba(255,255,255,0.5); text-transform: uppercase; }
  input {
    width: 100%; padding: 14px 16px; border-radius: 9999px;
    border: 1px solid rgba(255,255,255,0.2); background: transparent;
    color: #fff; font: inherit; text-align: center; outline: none;
  }
  input:focus { border-color: rgba(255,255,255,0.6); }
  button {
    width: 100%; padding: 14px 16px; border-radius: 9999px;
    border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.06);
    color: #fff; font: inherit; cursor: pointer; transition: all .2s;
  }
  button:hover { border-color: rgba(255,255,255,0.6); }
  .error { color: #ff6b6b; font-size: 12px; min-height: 14px; }
</style>
</head>
<body>
  <form method="POST" action="${action}">
    <div class="title">smallhands</div>
    <input type="password" name="password" placeholder="password" autofocus autocomplete="current-password" />
    <div class="error">${error ? "wrong password" : ""}</div>
    <button type="submit">enter</button>
  </form>
</body>
</html>`;
  return new NextResponse(html, {
    status: error ? 401 : 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPresent = path === "/present" || path.startsWith("/present/");

  const password = isPresent
    ? process.env.PRESENTER_PASSWORD
    : process.env.SITE_PASSWORD;
  const cookieName = isPresent ? COOKIE_PRESENT : COOKIE_SITE;

  if (!password) return NextResponse.next(); // gate not configured → open

  const expected = await tokenFor(password);

  // Already authenticated?
  if (req.cookies.get(cookieName)?.value === expected) {
    return NextResponse.next();
  }

  // Login form submission.
  if (req.method === "POST") {
    const form = await req.formData();
    const entered = String(form.get("password") ?? "");
    if (entered === password) {
      const res = NextResponse.redirect(new URL(path, req.url), 303);
      res.cookies.set(cookieName, expected, {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: MAX_AGE,
      });
      return res;
    }
    return loginPage(path, true);
  }

  // Not authenticated → show the password form.
  return loginPage(path, false);
}

export const config = {
  // Gate everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
