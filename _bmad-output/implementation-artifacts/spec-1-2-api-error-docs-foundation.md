---
title: 'Story 1.2: API Error & Docs Foundation'
type: 'feature'
created: '2026-09-18'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'f65854653c287413d6a4b89b37a0383514d06e91'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Every existing `apps/api` route returns ad-hoc `{ error: string }` JSON (see `areas.ts`, `sectors.ts`, `climbs.ts`, `tags.ts`, `logs.ts`, `media.ts`, `auth.ts`) with no OpenAPI docs at all — AD-4/AD-5 require RFC 9457 Problem Details everywhere and a documented, Zod-schema-backed API.

**Approach:** Add one shared Problem Details helper + a global `onError` handler, mechanically switch every existing route's error responses to it (a find/replace-level change, not a validation rewrite), adopt `OpenAPIHono` at the app level with `@hono/swagger-ui` mounted, and convert exactly one route (`/health`) to a real `createRoute`+Zod definition to prove the docs pipeline works end-to-end. Converting every *business* route's request validation to Zod (AD-5's fuller promise) is deliberately deferred, route by route, to whichever epic/story already rewrites that route for its own reasons (Epic 2 for areas/sectors/climbs/tags, Epic 3 for logs/media, Stories 1.4/1.5 for auth) — converting them twice here and again there would be wasted, riskier work for no near-term benefit.

## Boundaries & Constraints

**Always:** Every error response from every route (existing and new) is `application/problem+json` (RFC 9457: `type`/`title`/`status`/`detail`/`instance`, optional `errors: [{path, message}]` extension for validation failures). Exactly one global error handler (`app.onError`) produces the 500/unhandled-exception case; the shared helper produces every route-level 4xx case. `hono` bumps to `^4.10.0`, `zod` pins to `^4.0.0`. `/api/docs` (Swagger UI) and its backing OpenAPI JSON endpoint exist and render.

**Never:** Do not convert `areas.ts`/`sectors.ts`/`climbs.ts`/`tags.ts`/`logs.ts`/`media.ts`/`auth.ts` to `createRoute`+Zod in this story — their request validation stays as today's plain `if` checks; only their *error response shape* changes. Do not change any route's success-path behavior or status codes. Do not add `dev-login` (that's Story 1.5).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Existing 400 (e.g. `POST /api/areas` missing `name`) | Same request shape as today | `application/problem+json`, `status: 400`, same `detail` text as today's `error` string | N/A |
| Existing 404 (e.g. `GET /api/sectors/:id` unknown id) | Same request shape as today | `application/problem+json`, `status: 404` | N/A |
| Unhandled exception (e.g. a DB call throws) | Any route, backing call throws | Global `onError` returns `application/problem+json`, `status: 500`, no stack trace leaked | N/A |
| Docs endpoint | `GET /api/docs` | Swagger UI HTML renders, backed by a valid OpenAPI JSON document | N/A |
| Converted example route | `GET /health` | Unchanged `{ ok: true }` 200 response, now also described in the OpenAPI doc | N/A |

</frozen-after-approval>

## Code Map

- `apps/api/src/index.ts` -- currently `new Hono<AppEnv>()`; becomes `new OpenAPIHono<AppEnv>()` (a superset — existing `app.route("/api/x", x)` mounts of plain `Hono<AppEnv>()` sub-apps must keep working unchanged, verify this during implementation). Add `app.doc('/api/openapi.json', {...})` and mount `@hono/swagger-ui`'s `swaggerUI({ url: '/api/openapi.json' })` at `/api/docs`. Add `app.onError((err, c) => ...)` producing the 500 Problem Details case.
- `apps/api/src/routes/{areas,sectors,climbs,tags,logs,media}.ts` -- every `c.json({ error: "..." }, CODE)` call becomes `c.json(problemDetails({ status: CODE, detail: "..." }), CODE)` (same `CODE`, same message text as `detail`) via the new shared helper — mechanical, one-line-per-call substitution, no other logic touched.
- `apps/api/src/routes/auth.ts` -- same mechanical substitution for its existing `{error: ...}` responses (register/login 400/401/409); does not otherwise change (dev-login/invite-code logic is Stories 1.4/1.5).
- `apps/api/src/index.ts` -- `app.get("/health", (c) => c.json({ ok: true }))` becomes a `createRoute` + `.openapi()` definition with a Zod response schema (`{ ok: z.boolean() }`), same path, same response shape, now documented.
- `apps/api/package.json` -- add `@hono/zod-openapi`, `@hono/swagger-ui`, `zod`; bump `hono` to `^4.10.0`; check `@hono/node-server` (`^1.13.0`) still resolves/works against the bumped `hono` (flag if not, per the architecture's own noted risk).
- New `apps/api/src/lib/problem-details.ts` -- the shared helper: builds a Problem Details body from `{ status, title?, detail?, type?, errors? }`, defaulting `title` from the status code's standard reason phrase when omitted.

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/package.json` -- add `@hono/zod-openapi`, `@hono/swagger-ui`, `zod`; bump `hono` to `^4.10.0` -- AD-5
- [x] `apps/api/src/lib/problem-details.ts` -- new shared helper producing RFC 9457 bodies, with the `errors: [{path, message}]` extension supported (even if unused by any existing route yet) -- AD-4 (implemented as `problemDetails()` body-builder + `sendProblem()` response-sender, so the `application/problem+json` content-type header is guaranteed rather than relying on `c.json`'s default)
- [x] `apps/api/src/index.ts` -- switch to `OpenAPIHono`, add `app.onError` (500 case), mount `@hono/swagger-ui` at `/api/docs`, add the OpenAPI JSON doc endpoint -- AD-5
- [x] `apps/api/src/index.ts` -- convert `/health` to a `createRoute`+Zod-documented route, same behavior -- AD-5 proof-of-concept
- [x] `apps/api/src/routes/{areas,sectors,climbs,tags,logs,media,auth}.ts` -- mechanically switch every existing `c.json({error...}, CODE)` to the shared Problem Details helper, same `CODE` and message text -- AD-4
- [x] `apps/api/src/middleware/auth.ts` -- `requireAuth`'s 401 also converted (not in original Code Map, but the frozen "every error response from every route" boundary covers it — every protected route's 401 flows through this middleware)

**Acceptance Criteria:**
- Given any existing route's current 400/404/409 trigger, when hit the same way as today, then the response is `application/problem+json` with the same status code and equivalent message, now in `detail`.
- Given an unhandled exception anywhere in a route handler, when it propagates, then the global `onError` handler returns a `application/problem+json` 500, never a stack trace or Hono's default error page.
- Given `GET /api/docs`, then Swagger UI renders, backed by a valid OpenAPI document that includes `/health`.
- Given the `hono`/`zod` version bump, when the app builds and starts, then every existing route continues to function exactly as before (no behavior regression).

## Implementation Notes

## Review Triage Log

- **false** — blind-hunter: "OpenAPI conversion incomplete, only /health documented." Verified against frozen Intent: this story deliberately defers per-route Zod/createRoute conversion to whichever epic already rewrites that route; not a bug.
- **false** — blind-hunter: "zod/@hono/zod-openapi added but unused elsewhere," "errors: [{path,message}] extension defined but never populated." Same as above — the spec's own Boundaries explicitly anticipated and sanctioned this ("even if unused by any existing route yet").
- **false** — blind-hunter: "/api/docs and /api/openapi.json exposed without auth, no security scheme declared." Verified: no requirement anywhere in SPEC.md/architecture calls for hiding API docs; this is a small self-hosted app, not a public multi-tenant service. Documenting your own API shape publicly is normal, not a vulnerability.
- **false** — blind-hunter: "breaking API contract change with no consumer update." Verified: grepped the repo — no current code (old Angular app is deleted per Story 1.1, new SvelteKit app doesn't call these endpoints yet) reads `.error` from any response. Zero consumers exist to break.
- **false** — edge-case-hunter: "non-Error throws bypass onError per Hono's compose.js." Verified (reviewer's own confidence: medium): no code path in this diff or the existing codebase throws a non-Error value; framework-level edge case with no current trigger.
- **low** — blind-hunter + edge-case-hunter (same root cause): no `app.notFound()` registered, so unmatched paths return Hono's default 404 instead of Problem Details, contradicting the "every error response" claim. Verified. → patch.
- **low** — edge-case-hunter: `GET /uploads/:filename` (defined directly in `index.ts`, outside the routes/*.ts sweep) still calls `c.notFound()` on a missing file. Verified at index.ts:46 — genuinely missed by the mechanical conversion. → patch.
- **low** — blind-hunter: malformed JSON body (`c.req.json()` throwing `SyntaxError`) falls through to `onError` and returns 500, but it's a client error and should be 400. Verified: real misclassification. → patch.
- **low** — edge-case-hunter: `HTTPException` thrown anywhere would be flattened to a generic 500 instead of preserving its real status/message. Verified: no current call site throws one, but cheap and correctly future-proofs the "every unhandled exception" promise for any future middleware. → patch.
- **defer** — verification-gap (both findings, same root cause): no automated test exists for the app-class swap (Hono→OpenAPIHono), the onError Problem Details contract, or `problem-details.ts` itself. Real gap, but reinforces the existing Story 1.1 deferred-work.md entry rather than a new one: AD-9 already prescribes Playwright as the two-tier test strategy, so adding `vitest` now (as suggested) would contradict that decision, not fill the gap correctly. Verified manually instead (see Verification below).

## Verification

**Commands:**
- `npm run dev:api` -- verified: starts without error on the bumped `hono` version
- `curl http://localhost:8787/api/docs` -- verified: Swagger UI HTML
- `curl http://localhost:8787/health` -- verified: `{"ok":true}`, unchanged
- `curl http://localhost:8787/nonexistent-path` -- verified: `404 application/problem+json` (was Hono's default before the patch round)
- `curl http://localhost:8787/uploads/does-not-exist.jpg` -- verified: `404 application/problem+json` (was Hono's default `c.notFound()` before the patch round)
- `curl -X POST http://localhost:8787/api/auth/login -d '{not valid json' -H 'Content-Type: application/json'` -- verified: `400 application/problem+json` (was `500` before the patch round)
- Registration/login/area-creation happy and error paths -- verified by the implementation subagent (201/400/401/409 all now `application/problem+json`, success shapes unchanged)

**Manual checks (if no CLI):**
- `HTTPException`-preservation fix could not be triggered live (no current call site throws one) -- verified by type-check + code review only; correctly future-proofs the "every unhandled exception" guarantee for any future middleware.
- No automated test harness exists yet (see Review Triage Log's `defer` entry) -- all verification above is manual/live, matching Story 1.1's precedent.
