import { randomInt } from "node:crypto";
import { Hono, type Context } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { db, users, groups, groupMemberships, hashPassword, verifyPassword } from "@climbing-logbook/db";
import type { AppEnv } from "../context.js";
import { SESSION_COOKIE, createSession, deleteSession } from "../lib/session.js";
import { sendProblem } from "../lib/problem-details.js";

// Shareable invite code: crypto-random (node:crypto's randomInt, same security class as the
// randomBytes used for session tokens in lib/session.ts), drawn from a restricted alphabet that
// excludes visually-ambiguous characters (0/O, 1/I/L) since this is typed/shared by hand, not a
// bearer secret copy-pasted verbatim.
const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_CODE_LENGTH = 8;

function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)];
  }
  return code;
}

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
  // Normalize case: the generated alphabet is uppercase-only, but someone transcribing a code by
  // hand may type it in lowercase out of habit - accept either without weakening the code space
  // (the stored/generated value is always uppercase, so this can't create a collision).
  const inviteCode = typeof body.inviteCode === "string" ? body.inviteCode.trim().toUpperCase() : "";

  if (!email || !name || password.length < 8) {
    return sendProblem(c, {
      status: 400,
      detail: "email, name, and a password of at least 8 characters are required",
    });
  }

  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    return sendProblem(c, { status: 409, detail: "An account with this email already exists" });
  }

  // Resolve the invite code (if any) *before* creating the user, so an invalid code never leaves
  // a dangling user row behind - a 400 here means nothing was written.
  let existingGroup: { id: string } | undefined;
  if (inviteCode) {
    const [matchedGroup] = await db.select().from(groups).where(eq(groups.inviteCode, inviteCode));
    if (!matchedGroup) {
      return sendProblem(c, { status: 400, detail: "Invalid invite code" });
    }
    existingGroup = matchedGroup;
  }

  // User creation, group resolution/creation, and the membership row are one atomic unit: a
  // failure partway through (e.g. a vanishingly-unlikely invite-code collision hitting the unique
  // constraint) must never leave a user row with no group at all.
  const { user, newGroupInviteCode } = await db.transaction(async (tx) => {
    const [insertedUser] = await tx
      .insert(users)
      .values({ email, name, passwordHash: hashPassword(password) })
      .returning();

    let targetGroup = existingGroup;
    let createdInviteCode: string | undefined;

    // No invite code: the registrant starts their own group (auto-named, since the lean register
    // form has no group-name field) and becomes its sole member.
    if (!targetGroup) {
      createdInviteCode = generateInviteCode();
      [targetGroup] = await tx
        .insert(groups)
        .values({ name: `${name}'s Group`.slice(0, 100), inviteCode: createdInviteCode })
        .returning();
    }
    await tx.insert(groupMemberships).values({ userId: insertedUser.id, groupId: targetGroup.id });

    return { user: insertedUser, newGroupInviteCode: createdInviteCode };
  });

  const { token, expiresAt } = await createSession(user.id);
  setSessionCookie(c, token, expiresAt);
  // Only present when this call created a new group - never when joining an existing one via a
  // valid code (the caller already has that code). See RegisterResponse in packages/contracts.
  return c.json(
    { id: user.id, email: user.email, name: user.name, ...(newGroupInviteCode ? { groupInviteCode: newGroupInviteCode } : {}) },
    201,
  );
});

auth.post("/login", async (c) => {
  const body = await c.req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return sendProblem(c, { status: 401, detail: "Invalid email or password" });
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

// Gated on NODE_ENV (AD-10) - the exact same check `setSessionCookie` above already uses for the
// cookie's `secure` flag, no new env var. In production this route is never registered at all, so
// a request to it is a plain 404, not a runtime-rejected 403/503.
if (process.env.NODE_ENV !== "production") {
  // Picks from the fixed set of named test users `packages/db/src/seed.ts` bootstraps into "Dev
  // Group" - defaults to the first of them when no email is given.
  const DEFAULT_DEV_LOGIN_EMAIL = "alice@dev.local";

  auth.post("/dev-login", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const requestedEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const email = requestedEmail || DEFAULT_DEV_LOGIN_EMAIL;

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
      return sendProblem(c, { status: 400, detail: `No seeded test user found for email "${email}"` });
    }

    const { token, expiresAt } = await createSession(user.id);
    setSessionCookie(c, token, expiresAt);
    return c.json({ id: user.id, email: user.email, name: user.name });
  });
}

export { auth };
