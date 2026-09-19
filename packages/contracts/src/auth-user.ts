// Hand-composed to match `apps/api/src/routes/auth.ts`'s actual response shapes exactly
// (`register`/`login`/`me` all return `{ id, email, name }` when there's a user). Never includes
// `passwordHash` - this is the only sanctioned shape for user data; there is no exported
// schema for the raw `users` table.
import { z } from "zod";

export const AuthUser = z.object({
  id: z.uuid(),
  email: z.string(),
  name: z.string(),
});

// GET /api/auth/me specifically returns bare `null` when there's no session (see auth.ts) -
// AuthUser alone doesn't capture that; this is the schema that endpoint's response actually needs.
export const MeResponse = AuthUser.nullable();

// POST /api/auth/register additionally returns the new group's invite code, but only when
// registering created a new group (never when joining an existing one via a valid code - the
// caller already has that code). Without this, a group's creator would have no way to find or
// share their own code (caught by review; Story 1.6 is still where you view/regenerate it later).
export const RegisterResponse = AuthUser.extend({
  groupInviteCode: z.string().optional(),
});
