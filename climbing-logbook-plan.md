# Climbing Trip Logbook — Setup Plan for Claude Code

Personal/friends climbing logbook webapp. Log climbing areas, sectors, boulders/routes,
and personal ascent history (flash/redpoint/project/todo) with photos & videos, on a map.

## Stack

- **Frontend:** SvelteKit + Tailwind CSS v4 + Leaflet (OpenStreetMap tiles)
- **Backend:** Hono (TypeScript)
- **DB/ORM:** PostgreSQL + PostGIS extension, Drizzle ORM + drizzle-kit
- **Media storage:** local disk (dev) / MinIO (prod-ready, S3-compatible) — paths stored in Postgres
- **Package manager:** pnpm, monorepo via pnpm workspaces
- **Dev infra:** Docker Compose (Postgres+PostGIS, MinIO)

## Repo layout

```
climbing-logbook/
├── pnpm-workspace.yaml
├── docker-compose.yml
├── .env.example
├── apps/
│   ├── web/            # SvelteKit frontend
│   └── api/            # Hono backend
└── packages/
    └── db/             # Drizzle schema, migrations, shared DB client
```

`packages/db` is imported by `apps/api` (and optionally by SvelteKit server routes)
so schema/types are shared.

## Step-by-step tasks for Claude Code

### 1. Scaffold monorepo
- Init pnpm workspace with the three packages above.
- Root `package.json` with workspace scripts: `dev`, `db:generate`, `db:migrate`, `db:studio`.

### 2. Docker Compose for local infra
- `postgis/postgis:16-3.4` image (Postgres 16 + PostGIS 3.4), exposed on 5432, volume for persistence.
- `minio/minio` service, exposed on 9000/9001, volume for persistence.
- `.env.example` with `DATABASE_URL`, `MINIO_*` vars.

### 3. `packages/db` — Drizzle setup
- Install `drizzle-orm`, `drizzle-kit`, `postgres` (or `pg`) driver.
- `drizzle.config.ts` pointing at Postgres, schema in `src/schema/*.ts`.
- Enable PostGIS extension in an initial migration (`CREATE EXTENSION IF NOT EXISTS postgis;`).
- Define schema (see **Data model** below).
- Export a typed `db` client for use by `apps/api`.

### 4. `apps/api` — Hono setup
- Hono app with `@hono/node-server` (simplest for self-hosting; swap to Cloudflare Workers adapter later if desired).
- Middleware: CORS, JSON body parsing, simple auth (session cookie or JWT — see **Auth** below).
- Route modules: `/api/areas`, `/api/sectors`, `/api/climbs`, `/api/logs`, `/api/tags`, `/api/media`, `/api/auth`.
- File upload endpoint using multipart parsing, writes to MinIO (or local `/uploads` in dev), returns a media record.

### 5. `apps/web` — SvelteKit setup
- `npx sv create` (SvelteKit), TypeScript, Tailwind v4 via `@tailwindcss/vite`.
- Install `leaflet` + types; wrap it in a small Svelte component (Leaflet isn't SSR-safe — mount it in `onMount` only).
- Pages (minimal v1):
  - `/` — map of all climbing areas (Leaflet, markers from `/api/areas`)
  - `/areas/[id]` — area detail: description, personal rating, comment, photos, list of sectors, mini-map of sector markers
  - `/areas/[id]/sectors/[sectorId]` — sector detail: description, notes, rating, list of climbs (routes+boulders)
  - `/climbs/[id]` — climb detail: difficulty, tags, rating, your log entries (send type, attempts, notes, media)
  - `/log/new` — form to add a log entry for a climb (ascent type, attempts, notes, photo/video upload)
  - `/login`, `/register` — basic auth

### 6. Auth (kept minimal since it's for you + friends)
- Simple email+password with sessions (e.g. `lucia`-style pattern or a hand-rolled session cookie + `oslo`/`bcrypt` for hashing) — no need for a full OAuth provider for a small group.
- `users` table holds accounts; every area/sector/climb/log records `created_by` for attribution.

### 7. Seed script
- `packages/db` seed script inserting a demo area/sector/climb/tags so the frontend has data to render immediately.

## Data model (Drizzle schema, v1)

Grades/difficulty stored as plain text (e.g. `"7a"`, `"V5"`) rather than a numeric scale, since
routes and boulders use different grading systems (French, V-scale, Font, etc.) — normalize/compare
in the frontend, not the DB.

```
users
  id            uuid pk
  email         text unique
  name          text
  password_hash text
  created_at    timestamptz

climbing_area
  id                uuid pk
  name              text
  description       text          -- general description
  how_to_get_there  text
  comment           text          -- free-form personal notes
  personal_rating   smallint      -- e.g. 1-5
  geom              geometry(Point, 4326)   -- PostGIS point
  created_by        uuid fk -> users.id
  created_at        timestamptz

sector
  id            uuid pk
  area_id       uuid fk -> climbing_area.id
  name          text
  description   text
  notes         text
  rating        smallint
  geom          geometry(Point, 4326)
  created_by    uuid fk -> users.id
  created_at    timestamptz

climb                       -- unifies "route" and "boulder" (see note below)
  id            uuid pk
  sector_id     uuid fk -> sector.id
  kind          text          -- enum: 'route' | 'boulder'
  name          text
  difficulty    text          -- e.g. "7a", "V5"
  rating         smallint
  description   text
  created_by    uuid fk -> users.id
  created_at    timestamptz

tags
  id    uuid pk
  name  text unique          -- crimpy, pockets, slab, sketchy, power, endurance, ...

climb_tags                  -- join table, many-to-many
  climb_id  uuid fk -> climb.id
  tag_id    uuid fk -> tags.id
  primary key (climb_id, tag_id)

log_entry
  id            uuid pk
  user_id       uuid fk -> users.id
  climb_id      uuid fk -> climb.id
  status        text          -- enum: 'flash' | 'redpoint' | 'project' | 'todo'
  attempts      integer
  notes         text
  climbed_at    date
  created_at    timestamptz

media
  id            uuid pk
  entity_type   text          -- 'area' | 'sector' | 'climb' | 'log_entry'
  entity_id     uuid          -- polymorphic reference, no FK constraint
  kind          text          -- 'image' | 'video'
  url           text          -- storage path/URL (MinIO/local)
  uploaded_by   uuid fk -> users.id
  created_at    timestamptz
```

**Note on `route` vs `boulder`:** you described them as identical in structure, so v1 unifies
them into one `climb` table with a `kind` discriminator column instead of two duplicate tables.
This avoids duplicating schema/queries/UI components for two things that only differ by label.
If they diverge later (e.g. routes need rope length, gear notes), split them then — easy to do
with a migration once there's a real reason.

**Note on `media`:** using a polymorphic `entity_type` + `entity_id` pair (rather than a FK) lets
one table serve area/sector/climb/log photos without four near-identical tables. Drizzle can't
enforce a FK across a polymorphic reference, so validate `entity_type` in the API layer.

**Note on PostGIS:** Drizzle doesn't have first-class geometry column types built in, so define
the `geom` columns via a small custom column type (`customType` helper) that maps to
`geometry(Point,4326)`, or fall back to raw SQL in migrations for these columns. Store lat/lng
as PostGIS points from day one so "areas near me" / bounding-box queries are trivial later —
plain float columns would work too for v1 if you want to skip PostGIS setup friction initially
and add it in a later migration.

## Suggested order of work for Claude Code

1. Scaffold monorepo + docker-compose, confirm `docker compose up` gives a working Postgres+PostGIS and MinIO.
2. Build `packages/db` schema + run first migration, confirm tables exist.
3. Seed script + confirm data is queryable via `drizzle-kit studio`.
4. Build Hono API CRUD routes for areas → sectors → climbs → tags → log_entry → media, in that order.
5. Build SvelteKit shell + Tailwind, then the map page (`/`) reading from the areas API.
6. Build area/sector/climb detail pages.
7. Build log entry form + media upload flow.
8. Add auth last, once the core flows work with a hardcoded/dev user — retrofitting auth after
   the data model is proven is easier than blocking on it up front.
