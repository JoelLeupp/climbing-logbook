import { serve } from "@hono/node-server";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "./context.js";
import { attachUser } from "./middleware/auth.js";
import { readUploadedFile } from "./lib/storage.js";
import { sendProblem } from "./lib/problem-details.js";
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

// OpenAPIHono is a superset of Hono - plain Hono<AppEnv>() sub-apps mounted via app.route()
// below keep working unchanged.
const app = new OpenAPIHono<AppEnv>();

// Global error handler: the single place that produces the 500/unhandled-exception Problem
// Details response. Route-level 4xx Problem Details responses are produced by the routes
// themselves via the shared `sendProblem` helper.
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    // Preserve the exception's own status/message (e.g. thrown by Hono internals or future
    // middleware) instead of flattening everything to 500.
    return sendProblem(c, { status: err.status, detail: err.message });
  }
  if (err instanceof SyntaxError) {
    // A malformed JSON request body (c.req.json() throwing) is a client error, not a server one.
    return sendProblem(c, { status: 400, detail: "Malformed JSON body" });
  }
  console.error(err);
  return sendProblem(c, { status: 500, detail: "An unexpected error occurred" });
});

// Unmatched routes get the same Problem Details shape as every other error response.
app.notFound((c) => sendProblem(c, { status: 404, detail: "Not Found" }));

app.use(
  "*",
  cors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  }),
);
app.use("*", attachUser);

app.get("/uploads/:filename", async (c) => {
  const file = await readUploadedFile(c.req.param("filename"));
  if (!file) return sendProblem(c, { status: 404, detail: "File not found" });
  return new Response(new Uint8Array(file.data), { headers: { "Content-Type": file.contentType } });
});

app.route("/api/auth", auth);
app.route("/api/areas", areas);
app.route("/api/sectors", sectors);
app.route("/api/climbs", climbs);
app.route("/api/tags", tags);
app.route("/api/logs", logs);
app.route("/api/media", media);

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  responses: {
    200: {
      description: "Liveness check",
      content: {
        "application/json": {
          schema: z.object({ ok: z.boolean() }),
        },
      },
    },
  },
});

app.openapi(healthRoute, (c) => c.json({ ok: true }));

app.doc("/api/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "Climbing Logbook API",
    version: "0.1.0",
  },
});
app.get("/api/docs", swaggerUI({ url: "/api/openapi.json" }));

const port = Number(process.env.API_PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API listening on http://localhost:${info.port}`);
});
