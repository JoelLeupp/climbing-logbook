import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { db, climbs as climbsTable, climbTags, tags as tagsTable } from "@climbing-logbook/db";
import type { AppEnv } from "../context.js";
import { requireAuth } from "../middleware/auth.js";
import { sendProblem } from "../lib/problem-details.js";

const climbs = new Hono<AppEnv>();

climbs.get("/", async (c) => {
  const sectorId = c.req.query("sectorId");
  const rows = sectorId
    ? await db.select().from(climbsTable).where(eq(climbsTable.sectorId, sectorId))
    : await db.select().from(climbsTable);
  return c.json(rows);
});

climbs.get("/:id", async (c) => {
  const [climb] = await db.select().from(climbsTable).where(eq(climbsTable.id, c.req.param("id")));
  if (!climb) return sendProblem(c, { status: 404, detail: "Climb not found" });

  const climbTagRows = await db
    .select({ id: tagsTable.id, name: tagsTable.name })
    .from(climbTags)
    .innerJoin(tagsTable, eq(climbTags.tagId, tagsTable.id))
    .where(eq(climbTags.climbId, climb.id));

  return c.json({ ...climb, tags: climbTagRows });
});

climbs.post("/", requireAuth, async (c) => {
  const body = await c.req.json();
  if (!body.sectorId || !body.name || !body.kind) {
    return sendProblem(c, { status: 400, detail: "sectorId, name, and kind are required" });
  }

  const [climb] = await db
    .insert(climbsTable)
    .values({
      sectorId: body.sectorId,
      kind: body.kind,
      name: body.name,
      difficulty: body.difficulty ?? null,
      rating: body.rating ?? null,
      description: body.description ?? null,
      createdBy: c.get("user")!.id,
    })
    .returning();

  return c.json(climb, 201);
});

climbs.patch("/:id", requireAuth, async (c) => {
  const body = await c.req.json();
  const [climb] = await db
    .update(climbsTable)
    .set({
      name: body.name,
      kind: body.kind,
      difficulty: body.difficulty,
      rating: body.rating,
      description: body.description,
    })
    .where(eq(climbsTable.id, c.req.param("id")))
    .returning();

  if (!climb) return sendProblem(c, { status: 404, detail: "Climb not found" });
  return c.json(climb);
});

climbs.delete("/:id", requireAuth, async (c) => {
  const [climb] = await db.delete(climbsTable).where(eq(climbsTable.id, c.req.param("id"))).returning();
  if (!climb) return sendProblem(c, { status: 404, detail: "Climb not found" });
  return c.body(null, 204);
});

// Tag assignment lives here (not in routes/tags.ts) since it's climb-scoped.
climbs.post("/:id/tags", requireAuth, async (c) => {
  const body = await c.req.json();
  if (!body.tagId) return sendProblem(c, { status: 400, detail: "tagId is required" });

  await db.insert(climbTags).values({ climbId: c.req.param("id"), tagId: body.tagId }).onConflictDoNothing();
  return c.body(null, 204);
});

climbs.delete("/:id/tags/:tagId", requireAuth, async (c) => {
  await db
    .delete(climbTags)
    .where(and(eq(climbTags.climbId, c.req.param("id")), eq(climbTags.tagId, c.req.param("tagId"))));
  return c.body(null, 204);
});

export { climbs };
