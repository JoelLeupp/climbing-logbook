// Hand-written to match `apps/api/src/lib/problem-details.ts`'s `ProblemDetailsBody` shape
// exactly (RFC 9457 Problem Details, `application/problem+json`): `type`/`title`/`status` are
// required, `detail`/`instance`/`errors` are optional, with `errors` being the one sanctioned
// extension for validation failures (`{ path, message }[]`).
import { z } from "zod";

export const ProblemDetailsFieldError = z.object({
  path: z.string(),
  message: z.string(),
});

export const ProblemDetails = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  errors: z.array(ProblemDetailsFieldError).optional(),
});
