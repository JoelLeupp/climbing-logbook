import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import type { AppEnv } from "../context.js";
import { SESSION_COOKIE, validateSession } from "../lib/session.js";
import { sendProblem } from "../lib/problem-details.js";

// Attaches the current user (or null) to context for every request.
export const attachUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  const user = token ? await validateSession(token) : null;
  c.set("user", user);
  await next();
};

// Guard for routes that require a logged-in user.
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.get("user")) {
    return sendProblem(c, { status: 401, detail: "Authentication required" });
  }
  await next();
};
