# Brainstorm Intent: Frontend Stack

Goal: pick the lightest-weight frontend fit for a small self-hosted personal climbing-logbook project.

## Decided

- Replace the Angular 22 frontend (`apps/web`) entirely with SvelteKit + shadcn-svelte. Not "run alongside" — a full swap.
- `apps/web` today is only a draft, no working app yet, so there is no working Angular app being thrown away.
- Sequencing: spec-first, then (re)write the frontend against the spec — not the other way around.
- Primary selection criterion for the frontend stack: AI-coding-agent codegen friendliness. The whole project is built by an AI agent, not hand-coded, so this outweighs framework merits evaluated in isolation.
- Offline-first (local queue-and-sync for new sectors/images while offline) is descoped for v1 as overengineering — deferred, not rejected forever. Online-only is fine for v1; entries can be logged when signal returns.
- No native app, no PWA-as-native. Plain web app for v1. The only motivation for "native" was on-site GPS capture, and browser geolocation in a normal web app already covers that — no app-store/Capacitor/Tauri path needed.
- v1 bias: keep the frontend as simple as possible — resolve remaining scope questions (below) toward the simplest option unless a real requirement says otherwise.

## Open Questions

- Offline-first / local-queue-and-sync for new sectors and images should be revisited post-v1 — confirm scope and design once core spec and frontend rewrite land.
