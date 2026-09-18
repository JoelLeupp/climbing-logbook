# 🧗 Climbing Logbook

A self-hosted, open-source logbook for tracking your boulder and route sends on climbing trips —
mark climbing areas and sectors on a map, log flashes, redpoints, projects, and routes you've
spotted but haven't tried yet, and attach your own photos and videos along the way.

## Why

Most climbing logging tools are either large crowd-sourced crag databases (thecrag, 27crags,
Mountain Project) or gym-focused tick lists. This is a small, personal alternative: a place for
you and your climbing partners to keep a private trip journal — organized the way an actual trip
is organized (area → sector → route/boulder → ascent) — without handing your data to a platform
or dealing with a community database you don't need.

## Features

- 🗺️ Mark climbing areas and sectors on a map (OpenStreetMap/Leaflet), with directions, notes,
  and personal ratings for each
- 🧗 Log routes and boulders per sector, with difficulty, tags (crimpy, slab, powerful, sketchy,
  endurance, ...), and your own rating
- ✅ Track sends by type — flash, redpoint, project, or "spotted but not tried" — with attempt
  counts and notes
- 📸 Attach photos and videos to areas, sectors, climbs, or individual log entries
- 👥 Built for a small group of friends, not a public community — self-host it and invite who you want
- 🔓 Fully open source, built entirely on free and open-source tools

## Tech stack

- **Frontend:** [Angular 22](https://angular.dev/) (standalone components, Signal Forms) +
  [spartan/ui](https://www.spartan.ng/) + [Tailwind CSS v4](https://tailwindcss.com/) + [Leaflet](https://leafletjs.com/)
- **Backend:** [Hono](https://hono.dev/) on Node.js (`@hono/node-server`)
- **Database:** PostgreSQL, via [Drizzle ORM](https://orm.drizzle.team/) (area/sector locations are
  plain lat/lng columns for now — see `packages/db/src/schema.ts`; the Postgres image ships with
  PostGIS so geometry columns can be added later without a new container)
- **Media storage:** local disk for now; MinIO (S3-compatible) runs in Docker Compose for when the
  storage layer grows into it
- **Auth:** hand-rolled email/password + session cookie, hashed with Node's built-in `crypto.scrypt`
  — no auth library needed for a handful of users
- **Package manager:** npm workspaces (monorepo)
- **Infra:** Docker Compose for local development

## Status

🚧 Early development — first working draft of the full stack (schema, API, frontend shell) is in
place. Not yet ready for general use.

## Getting started

```bash
git clone https://github.com/<your-username>/climbing-logbook.git
cd climbing-logbook
npm install
docker compose up -d       # starts Postgres and MinIO
cp env.example .env
npm run db:migrate
npm run db:seed             # optional demo data
npm run dev:api             # terminal 1
npm run dev:web             # terminal 2
```

## License

[MIT](LICENSE) — use it, fork it, self-host it.
