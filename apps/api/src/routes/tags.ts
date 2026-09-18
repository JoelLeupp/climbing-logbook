import { Hono } from "hono";
import { db, tags as tagsTable } from "@climbing-logbook/db";
import type { AppEnv } from "../context.js";
import { requireAuth } from "../middleware/auth.js";
import { sendProblem } from "../lib/problem-details.js";

const tags = new Hono<AppEnv>();

tags.get("/", async (c) => {
  const rows = await db.select().from(tagsTable);
  return c.json(rows);
});

tags.post("/", requireAuth, async (c) => {
  const body = await c.req.json();
  if (!body.name) return sendProblem(c, { status: 400, detail: "name is required" });

  const [tag] = await db.insert(tagsTable).values({ name: body.name }).onConflictDoNothing().returning();
  if (!tag) return sendProblem(c, { status: 409, detail: "Tag already exists" });
  return c.json(tag, 201);
});

export { tags };
