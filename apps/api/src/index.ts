import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./context.js";
import { attachUser } from "./middleware/auth.js";
import { readUploadedFile } from "./lib/storage.js";
import { auth } from "./routes/auth.js";
import { areas } from "./routes/areas.js";
import { sectors } from "./routes/sectors.js";
import { climbs } from "./routes/climbs.js";
import { tags } from "./routes/tags.js";
import { logs } from "./routes/logs.js";
import { media } from "./routes/media.js";

try {
  process.loadEnvFile("../../.env");
} catch {
  // .env not present (e.g. CI) - rely on process env instead
}

const app = new Hono<AppEnv>();

app.use(
  "*",
  cors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:4200",
    credentials: true,
  }),
);
app.use("*", attachUser);

app.get("/uploads/:filename", async (c) => {
  const file = await readUploadedFile(c.req.param("filename"));
  if (!file) return c.notFound();
  return new Response(new Uint8Array(file.data), { headers: { "Content-Type": file.contentType } });
});

app.route("/api/auth", auth);
app.route("/api/areas", areas);
app.route("/api/sectors", sectors);
app.route("/api/climbs", climbs);
app.route("/api/tags", tags);
app.route("/api/logs", logs);
app.route("/api/media", media);

app.get("/health", (c) => c.json({ ok: true }));

const port = Number(process.env.API_PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API listening on http://localhost:${info.port}`);
});
