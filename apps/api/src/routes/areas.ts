import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, climbingAreas } from "@climbing-logbook/db";
import type { AppEnv } from "../context.js";
import { requireAuth } from "../middleware/auth.js";

const areas = new Hono<AppEnv>();

areas.get("/", async (c) => {
  const rows = await db.select().from(climbingAreas);
  return c.json(rows);
});

areas.get("/:id", async (c) => {
  const [area] = await db.select().from(climbingAreas).where(eq(climbingAreas.id, c.req.param("id")));
  if (!area) return c.json({ error: "Area not found" }, 404);
  return c.json(area);
});

areas.post("/", requireAuth, async (c) => {
  const body = await c.req.json();
  if (!body.name || typeof body.latitude !== "number" || typeof body.longitude !== "number") {
    return c.json({ error: "name, latitude, and longitude are required" }, 400);
  }

  const [area] = await db
    .insert(climbingAreas)
    .values({
      name: body.name,
      description: body.description ?? null,
      howToGetThere: body.howToGetThere ?? null,
      comment: body.comment ?? null,
      personalRating: body.personalRating ?? null,
      latitude: body.latitude,
      longitude: body.longitude,
      createdBy: c.get("user")!.id,
    })
    .returning();

  return c.json(area, 201);
});

areas.patch("/:id", requireAuth, async (c) => {
  const body = await c.req.json();
  const [area] = await db
    .update(climbingAreas)
    .set({
      name: body.name,
      description: body.description,
      howToGetThere: body.howToGetThere,
      comment: body.comment,
      personalRating: body.personalRating,
      latitude: body.latitude,
      longitude: body.longitude,
    })
    .where(eq(climbingAreas.id, c.req.param("id")))
    .returning();

  if (!area) return c.json({ error: "Area not found" }, 404);
  return c.json(area);
});

areas.delete("/:id", requireAuth, async (c) => {
  const [area] = await db.delete(climbingAreas).where(eq(climbingAreas.id, c.req.param("id"))).returning();
  if (!area) return c.json({ error: "Area not found" }, 404);
  return c.body(null, 204);
});

export { areas };
