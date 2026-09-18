import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { db, logEntries, logStatusValues } from "@climbing-logbook/db";
import type { AppEnv } from "../context.js";
import { requireAuth } from "../middleware/auth.js";

const logs = new Hono<AppEnv>();

logs.get("/", async (c) => {
  const climbId = c.req.query("climbId");
  const userId = c.req.query("userId");

  const conditions = [];
  if (climbId) conditions.push(eq(logEntries.climbId, climbId));
  if (userId) conditions.push(eq(logEntries.userId, userId));

  const rows = conditions.length
    ? await db.select().from(logEntries).where(and(...conditions))
    : await db.select().from(logEntries);

  return c.json(rows);
});

logs.post("/", requireAuth, async (c) => {
  const body = await c.req.json();
  if (!body.climbId || !logStatusValues.includes(body.status)) {
    return c.json({ error: `climbId and status (one of ${logStatusValues.join(", ")}) are required` }, 400);
  }

  const [entry] = await db
    .insert(logEntries)
    .values({
      climbId: body.climbId,
      userId: c.get("user")!.id,
      status: body.status,
      attempts: body.attempts ?? null,
      notes: body.notes ?? null,
      climbedAt: body.climbedAt ?? null,
    })
    .returning();

  return c.json(entry, 201);
});

logs.patch("/:id", requireAuth, async (c) => {
  const body = await c.req.json();
  const [entry] = await db
    .update(logEntries)
    .set({
      status: body.status,
      attempts: body.attempts,
      notes: body.notes,
      climbedAt: body.climbedAt,
    })
    .where(and(eq(logEntries.id, c.req.param("id")), eq(logEntries.userId, c.get("user")!.id)))
    .returning();

  if (!entry) return c.json({ error: "Log entry not found" }, 404);
  return c.json(entry);
});

logs.delete("/:id", requireAuth, async (c) => {
  const [entry] = await db
    .delete(logEntries)
    .where(and(eq(logEntries.id, c.req.param("id")), eq(logEntries.userId, c.get("user")!.id)))
    .returning();

  if (!entry) return c.json({ error: "Log entry not found" }, 404);
  return c.body(null, 204);
});

export { logs };
