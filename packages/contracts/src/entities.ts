// Base entity schemas, generated via drizzle-zod against the side-effect-free
// `@climbing-logbook/db/schema` subpath only (never the default barrel, which opens a live
// Postgres connection at import time - see packages/db/package.json's `exports` map).
//
// Entity names are singular PascalCase per the architecture's naming convention. The select
// schema is the primary export per entity; each also gets an `{Entity}Insert` variant for
// request validation.
//
// `users`/`sessions` (raw) and the `climb_tags` join table are intentionally not exported here -
// user data is represented only by the sanctioned `AuthUser` shape (see auth.ts), and the
// climb/tag relationship is expressed through `ClimbWithTags.tags` (see climb-with-tags.ts).
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  climbingAreas,
  sectors,
  climbs,
  tags,
  logEntries,
  media,
  climbKindValues,
  logStatusValues,
  mediaEntityTypeValues,
  mediaKindValues,
} from "@climbing-logbook/db/schema";
import { z } from "zod";

// Shared discriminator enums - one source of truth for valid kind/status/entityType values,
// mirroring packages/db/src/schema.ts's `as const` arrays.
export const ClimbKind = z.enum(climbKindValues);
export const LogStatus = z.enum(logStatusValues);
export const MediaEntityType = z.enum(mediaEntityTypeValues);
export const MediaKind = z.enum(mediaKindValues);

// Insert schemas omit server-controlled columns (id, createdAt, and whichever ownership column
// the route derives from the session) - a route must never trust these from the client body, even
// though no route validates against these schemas yet (that lands per-route, in later epics).
export const Area = createSelectSchema(climbingAreas);
export const AreaInsert = createInsertSchema(climbingAreas).omit({ id: true, createdAt: true, createdBy: true });

export const Sector = createSelectSchema(sectors);
export const SectorInsert = createInsertSchema(sectors).omit({ id: true, createdAt: true, createdBy: true });

// List endpoints (e.g. GET /api/climbs) return this bare shape; GET /api/climbs/:id returns
// ClimbWithTags instead (see climb-with-tags.ts) - both are real, distinct response shapes.
export const Climb = createSelectSchema(climbs);
export const ClimbInsert = createInsertSchema(climbs).omit({ id: true, createdAt: true, createdBy: true });

export const Tag = createSelectSchema(tags);
export const TagInsert = createInsertSchema(tags).omit({ id: true });

export const LogEntry = createSelectSchema(logEntries);
export const LogEntryInsert = createInsertSchema(logEntries).omit({ id: true, createdAt: true, userId: true });

export const Media = createSelectSchema(media);
export const MediaInsert = createInsertSchema(media).omit({ id: true, createdAt: true, uploadedBy: true });
