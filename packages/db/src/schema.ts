import {
  pgTable,
  uuid,
  text,
  smallint,
  integer,
  date,
  timestamp,
  doublePrecision,
  primaryKey,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Session id stored is a SHA-256 hash of the token in the cookie, so a leaked
// DB row can't be replayed as a session by itself.
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const climbingAreas = pgTable("climbing_areas", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  howToGetThere: text("how_to_get_there"),
  comment: text("comment"),
  personalRating: smallint("personal_rating"),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sectors = pgTable("sectors", {
  id: uuid("id").primaryKey().defaultRandom(),
  areaId: uuid("area_id").notNull().references(() => climbingAreas.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  notes: text("notes"),
  rating: smallint("rating"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Unifies routes and boulders behind a `kind` discriminator - they're
// identical in structure for v1, split into separate tables later if they
// diverge (e.g. routes need rope length / gear notes).
export const climbKindValues = ["route", "boulder"] as const;
export type ClimbKind = (typeof climbKindValues)[number];

export const climbs = pgTable("climbs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sectorId: uuid("sector_id").notNull().references(() => sectors.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: climbKindValues }).notNull(),
  name: text("name").notNull(),
  difficulty: text("difficulty"), // free text, e.g. "7a", "V5" - grading systems differ per kind
  rating: smallint("rating"),
  description: text("description"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
});

export const climbTags = pgTable(
  "climb_tags",
  {
    climbId: uuid("climb_id").notNull().references(() => climbs.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.climbId, table.tagId] })],
);

export const logStatusValues = ["flash", "redpoint", "project", "todo"] as const;
export type LogStatus = (typeof logStatusValues)[number];

export const logEntries = pgTable("log_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  climbId: uuid("climb_id").notNull().references(() => climbs.id, { onDelete: "cascade" }),
  status: text("status", { enum: logStatusValues }).notNull(),
  attempts: integer("attempts"),
  notes: text("notes"),
  climbedAt: date("climbed_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// entityType/entityId is a polymorphic reference (area/sector/climb/log_entry)
// instead of four near-identical media tables. Drizzle can't enforce a FK
// across it, so the API layer must validate entityType + that entityId exists.
export const mediaEntityTypeValues = ["area", "sector", "climb", "log_entry"] as const;
export type MediaEntityType = (typeof mediaEntityTypeValues)[number];
export const mediaKindValues = ["image", "video"] as const;
export type MediaKind = (typeof mediaKindValues)[number];

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: text("entity_type", { enum: mediaEntityTypeValues }).notNull(),
  entityId: uuid("entity_id").notNull(),
  kind: text("kind", { enum: mediaKindValues }).notNull(),
  url: text("url").notNull(),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
