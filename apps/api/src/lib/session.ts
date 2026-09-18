import { randomBytes, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, sessions, users } from "@climbing-logbook/db";
import type { User } from "../context.js";

export const SESSION_COOKIE = "session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  return { token, expiresAt };
}

export async function validateSession(token: string): Promise<User | null> {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, hashToken(token)));
  if (!session || session.expiresAt < new Date()) return null;

  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  return user ?? null;
}

export async function deleteSession(token: string) {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}
