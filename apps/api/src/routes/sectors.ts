import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, sectors as sectorsTable } from "@climbing-logbook/db";
import type { AppEnv } from "../context.js";
import { requireAuth } from "../middleware/auth.js";

const sectors = new Hono<AppEnv>();

sectors.get("/", async (c) => {
  const areaId = c.req.query("areaId");
  const rows = areaId
    ? await db.select().from(sectorsTable).where(eq(sectorsTable.areaId, areaId))
    : await db.select().from(sectorsTable);
  return c.json(rows);
});

sectors.get("/:id", async (c) => {
  const [sector] = await db.select().from(sectorsTable).where(eq(sectorsTable.id, c.req.param("id")));
  if (!sector) return c.json({ error: "Sector not found" }, 404);
  return c.json(sector);
});

sectors.post("/", requireAuth, async (c) => {
  const body = await c.req.json();
  if (!body.areaId || !body.name) {
    return c.json({ error: "areaId and name are required" }, 400);
  }

  const [sector] = await db
    .insert(sectorsTable)
    .values({
      areaId: body.areaId,
      name: body.name,
      description: body.description ?? null,
      notes: body.notes ?? null,
      rating: body.rating ?? null,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      createdBy: c.get("user")!.id,
    })
    .returning();

  return c.json(sector, 201);
});

sectors.patch("/:id", requireAuth, async (c) => {
  const body = await c.req.json();
  const [sector] = await db
    .update(sectorsTable)
    .set({
      name: body.name,
      description: body.description,
      notes: body.notes,
      rating: body.rating,
      latitude: body.latitude,
      longitude: body.longitude,
    })
    .where(eq(sectorsTable.id, c.req.param("id")))
    .returning();

  if (!sector) return c.json({ error: "Sector not found" }, 404);
  return c.json(sector);
});

sectors.delete("/:id", requireAuth, async (c) => {
  const [sector] = await db.delete(sectorsTable).where(eq(sectorsTable.id, c.req.param("id"))).returning();
  if (!sector) return c.json({ error: "Sector not found" }, 404);
  return c.body(null, 204);
});

export { sectors };
