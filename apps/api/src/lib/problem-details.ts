import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

// RFC 9457 Problem Details ("application/problem+json") - the one shared shape every error
// response in this API uses. Body fields per RFC 9457: type/title/status/detail/instance, plus
// one sanctioned extension for validation failures: `errors: [{path, message}]`.

export const PROBLEM_JSON_CONTENT_TYPE = "application/problem+json";

export interface ProblemDetailsFieldError {
  path: string;
  message: string;
}

export interface ProblemDetailsInput {
  status: ContentfulStatusCode;
  title?: string;
  detail?: string;
  type?: string;
  instance?: string;
  errors?: ProblemDetailsFieldError[];
}

export interface ProblemDetailsBody {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: ProblemDetailsFieldError[];
}

// Standard reason phrases for the status codes this API actually returns. `problemDetails`
// defaults `title` to this when the caller doesn't supply one.
const REASON_PHRASES: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  409: "Conflict",
  415: "Unsupported Media Type",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
};

function reasonPhrase(status: number): string {
  return REASON_PHRASES[status] ?? "Error";
}

// Builds a Problem Details body. Pure - does not touch the response, just the data.
export function problemDetails(input: ProblemDetailsInput): ProblemDetailsBody {
  const { status, title, detail, type, instance, errors } = input;
  return {
    type: type ?? "about:blank",
    title: title ?? reasonPhrase(status),
    status,
    ...(detail !== undefined ? { detail } : {}),
    ...(instance !== undefined ? { instance } : {}),
    ...(errors !== undefined ? { errors } : {}),
  };
}

// Sends a Problem Details body as `application/problem+json`, with the given status. This is
// what routes and the global error handler actually call.
export function sendProblem(c: Context, input: ProblemDetailsInput) {
  return c.json(problemDetails(input), input.status, {
    "Content-Type": PROBLEM_JSON_CONTENT_TYPE,
  });
}
