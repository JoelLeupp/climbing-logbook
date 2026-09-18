import { Hono, type Context } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { db, users, hashPassword, verifyPassword } from "@climbing-logbook/db";
import type { AppEnv } from "../context.js";
import { SESSION_COOKIE, createSession, deleteSession } from "../lib/session.js";

const auth = new Hono<AppEnv>();

function setSessionCookie(c: Context, token: string, expiresAt: Date) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

auth.post("/register", async (c) => {
  const body = await c.req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  const password = String(body.password ?? "");

  if (!email || !name || password.length < 8) {
    return c.json({ error: "email, name, and a password of at least 8 characters are required" }, 400);
  }

  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    return c.json({ error: "An account with this email already exists" }, 409);
  }

  const [user] = await db
    .insert(users)
    .values({ email, name, passwordHash: hashPassword(password) })
    .returning();

  const { token, expiresAt } = await createSession(user.id);
  setSessionCookie(c, token, expiresAt);
  return c.json({ id: user.id, email: user.email, name: user.name }, 201);
});

auth.post("/login", async (c) => {
  const body = await c.req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const { token, expiresAt } = await createSession(user.id);
  setSessionCookie(c, token, expiresAt);
  return c.json({ id: user.id, email: user.email, name: user.name });
});

auth.post("/logout", async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await deleteSession(token);
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.body(null, 204);
});

// Session probe: called unconditionally on every page load to check whether there's a logged-in
// user. "No session" is an expected, routine result here (not a failed request against a
// protected resource), so it returns 200 with `null` rather than 401 - a 401 here would still make
// the browser log a "Failed to load resource" console error for every anonymous page load, even
// though the app already handles it gracefully in JS. Actual protected endpoints/actions
// (login, mutations) correctly keep using 401/403 for real auth failures.
auth.get("/me", (c) => {
  const user = c.get("user");
  if (!user) return c.json(null);
  return c.json({ id: user.id, email: user.email, name: user.name });
});

export { auth };
