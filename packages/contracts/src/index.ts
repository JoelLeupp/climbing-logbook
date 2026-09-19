// Shared, side-effect-free Zod contract layer between apps/api and apps/web (AD-6/AD-7).
//
// Base entity schemas are generated via drizzle-zod against `@climbing-logbook/db/schema`
// only - never the default `@climbing-logbook/db` barrel, which opens a live Postgres
// connection at import time. `ClimbWithTags`, `AuthUser`, and `ProblemDetails` are hand-composed
// to match their respective routes' actual response shapes exactly.
//
// Not wired into any apps/api route or apps/web component yet - see Story 1.3's spec.
export * from "./entities.js";
export * from "./climb-with-tags.js";
export * from "./auth-user.js";
export * from "./problem-details.js";
