import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { db, media as mediaTable, mediaEntityTypeValues, type MediaEntityType } from "@climbing-logbook/db";
import type { AppEnv } from "../context.js";
import { requireAuth } from "../middleware/auth.js";
import { saveUploadedFile } from "../lib/storage.js";
import { sendProblem } from "../lib/problem-details.js";

const media = new Hono<AppEnv>();

function isMediaEntityType(value: string): value is MediaEntityType {
  return (mediaEntityTypeValues as readonly string[]).includes(value);
}

media.get("/", async (c) => {
  const entityType = c.req.query("entityType");
  const entityId = c.req.query("entityId");
  if (!entityType || !entityId) {
    return sendProblem(c, { status: 400, detail: "entityType and entityId query params are required" });
  }
  if (!isMediaEntityType(entityType)) {
    return sendProblem(c, { status: 400, detail: `entityType must be one of ${mediaEntityTypeValues.join(", ")}` });
  }

  const rows = await db
    .select()
    .from(mediaTable)
    .where(and(eq(mediaTable.entityType, entityType), eq(mediaTable.entityId, entityId)));

  return c.json(rows);
});

media.post("/", requireAuth, async (c) => {
  const body = await c.req.parseBody();
  const file = body.file;
  const entityType = body.entityType;
  const entityId = body.entityId;

  if (!(file instanceof File) || typeof entityType !== "string" || typeof entityId !== "string") {
    return sendProblem(c, { status: 400, detail: "file, entityType, and entityId are required" });
  }
  if (!isMediaEntityType(entityType)) {
    return sendProblem(c, { status: 400, detail: `entityType must be one of ${mediaEntityTypeValues.join(", ")}` });
  }

  const kind = file.type.startsWith("video/") ? "video" : "image";
  const { url } = await saveUploadedFile(file);

  const [record] = await db
    .insert(mediaTable)
    .values({
      entityType,
      entityId,
      kind,
      url,
      uploadedBy: c.get("user")!.id,
    })
    .returning();

  return c.json(record, 201);
});

media.delete("/:id", requireAuth, async (c) => {
  const [record] = await db
    .delete(mediaTable)
    .where(and(eq(mediaTable.id, c.req.param("id")), eq(mediaTable.uploadedBy, c.get("user")!.id)))
    .returning();

  if (!record) return sendProblem(c, { status: 404, detail: "Media not found" });
  return c.body(null, 204);
});

export { media };
