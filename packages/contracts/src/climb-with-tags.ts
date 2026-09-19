// Hand-composed to match `apps/api/src/routes/climbs.ts`'s `GET /api/climbs/:id` response shape
// exactly: it returns the climb row spread with a `tags` array of `{ id, name }` rows (i.e.
// `Tag[]`, not bare names) - see the `climbTagRows`/`{ ...climb, tags: climbTagRows }` handler.
import { z } from "zod";
import { Climb, Tag } from "./entities.js";

export const ClimbWithTags = Climb.extend({
  tags: z.array(Tag),
});
