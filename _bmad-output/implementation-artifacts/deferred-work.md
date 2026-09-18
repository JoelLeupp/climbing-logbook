- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-frontend-scaffold.md`
  summary: No story in epics.md is explicitly assigned to set up AD-9's Playwright two-tier test strategy for apps/web; vitest/jsdom were removed with the Angular scaffold and nothing has replaced them yet.
  evidence: Story 1.1's review found apps/web has zero automated test coverage post-scaffold. Real gap, but adding a full Playwright setup wasn't in this story's frozen intent (scaffold + health-check shell only) and doesn't fit any single existing Epic 1-6 story cleanly - needs its own story or an explicit home before Epic 3+'s e2e tier is expected to exist.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-frontend-scaffold.md`
  summary: No lint/format tooling (prettier/eslint equivalent) is configured for the new SvelteKit apps/web stack.
  evidence: The old Angular app's .prettierrc/.editorconfig were deleted as part of the framework replacement; nothing SvelteKit-specific was added. Not blocking (shadcn-svelte's own generated files carry their own style regardless), but worth a deliberate decision before the codebase grows across Epics 2-6.
