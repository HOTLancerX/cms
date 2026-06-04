/**
 * lib/express.ts
 *
 * Shared helper for calling the Express multi-tenant API from the browser
 * (client components) or from Next.js server code.
 *
 * Every request automatically includes:
 *   x-license-key — identifies and validates this domain's license
 *   Content-Type  — application/json
 *   credentials   — include (sends the auth_token HttpOnly cookie)
 */

export const EXPRESS_API =
    process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";

export const LICENSE_KEY =
    process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";

/** Base headers for every Express request */
export const xHeaders = {
    "Content-Type": "application/json",
    "x-license-key": LICENSE_KEY,
} as const;

/**
 * Thin fetch wrapper — returns the raw Response so callers can check .ok.
 *
 * @param path     Express route, e.g. "/post" or "/cat?id=xxx"
 * @param init     Standard RequestInit (method, body, cache, etc.)
 */
export function xFetch(path: string, init: RequestInit = {}): Promise<Response> {
    return fetch(`${EXPRESS_API}${path}`, {
        credentials: "include",
        ...init,
        headers: {
            ...xHeaders,
            ...((init.headers as Record<string, string>) ?? {}),
        },
    });
}
