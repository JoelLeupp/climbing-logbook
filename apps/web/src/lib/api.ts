// The one shared API client module (AD-8). Every request apps/web makes to apps/api goes through
// `apiFetch`/`apiPost` here - no component may call `fetch` against apps/api directly.
//
// Same-origin only: relative paths (e.g. `/api/auth/register`) are proxied to apps/api by Vite's
// dev-server proxy in dev (see vite.config.ts) and served same-origin in prod.
import { z } from 'zod';
import { ProblemDetails } from '@climbing-logbook/contracts';

export type ProblemDetailsBody = z.infer<typeof ProblemDetails>;

// Thrown by apiFetch/apiPost whenever the API responds with a non-2xx status. Callers catch this
// and read `.problem.detail` for the user-facing message (never `.problem.type`, which is a
// stable machine identifier - see epic-1-context.md's i18n note).
export class ApiError extends Error {
	readonly problem: ProblemDetailsBody;

	constructor(problem: ProblemDetailsBody) {
		super(problem.detail ?? problem.title);
		this.problem = problem;
	}
}

// Used when the API's error body doesn't parse as Problem Details at all (e.g. a network-level
// failure surfaced by the proxy) - keeps callers from having to special-case a missing body.
function fallbackProblem(status: number, statusText: string): ProblemDetailsBody {
	return { type: 'about:blank', title: statusText || 'Error', status };
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
	const response = await fetch(path, { ...init, credentials: 'include' });

	if (!response.ok) {
		const body = await response.json().catch(() => null);
		const parsed = ProblemDetails.safeParse(body);
		throw new ApiError(
			parsed.success ? parsed.data : fallbackProblem(response.status, response.statusText)
		);
	}

	if (response.status === 204) return undefined as T;
	// Every current apps/api 2xx route returns real JSON, but this client is meant to outlive
	// every route that will ever exist - fail loudly with a clear error rather than an opaque
	// SyntaxError if a future response is ever empty/non-JSON despite a 2xx status.
	return await response.json().catch(() => {
		throw new Error(`Expected a JSON response from ${path}, got none`);
	});
}

// JSON POST helper - the shape every mutating call in this app needs (register, login, ...).
export function apiPost<T>(path: string, body?: unknown): Promise<T> {
	return apiFetch<T>(path, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: body !== undefined ? JSON.stringify(body) : undefined
	});
}
