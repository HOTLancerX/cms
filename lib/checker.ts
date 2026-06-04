/**
 * lib/checker.ts
 *
 * Single source of truth for all Express API communication from Next.js.
 *
 * Every request automatically includes:
 *  • x-license-key  — identifies and validates this domain's license
 *  • Content-Type   — JSON
 *  • credentials    — include (sends the HttpOnly auth_token cookie)
 *
 * The Express server's resolveTenant middleware reads x-license-key,
 * looks up the Domain record, checks active/expired status, and attaches
 * the correct tenant Mongoose connection before any route runs.
 */

export const API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";

const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";

/** Base headers sent with every request to Express */
const baseHeaders: HeadersInit = {
    "Content-Type": "application/json",
    "x-license-key": LICENSE_KEY,
};

// ── SWR-compatible fetcher ────────────────────────────────────────────────────
/**
 * Drop-in fetcher for SWR.
 * Usage: useSWR("/auth/me", fetcher)
 */
export const fetcher = (path: string): Promise<unknown> =>
    fetch(`${API}/${path}`, {
        credentials: "include",
        headers: baseHeaders,
    }).then((r) => {
        if (!r.ok) throw new Error(`Request failed: ${r.status}`);
        return r.json();
    });

// ── General-purpose fetch wrapper ─────────────────────────────────────────────
/**
 * apiFetch — typed wrapper for all Express API calls.
 *
 * Returns { res, data } so callers can check res.ok before using data.
 *
 * @param path     Express route path, e.g. "auth/signup"
 * @param method   HTTP method (default: "GET")
 * @param payload  Request body (ignored for GET / DELETE)
 */
export async function apiFetch<T = unknown>(
    path: string,
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
    payload?: unknown
): Promise<{ res: Response; data: T }> {
    const res = await fetch(`${API}/${path}`, {
        method,
        credentials: "include",
        headers: baseHeaders,
        body:
            method !== "GET" && method !== "DELETE" && payload !== undefined
                ? JSON.stringify(payload)
                : undefined,
    });

    const data = (await res.json()) as T;
    return { res, data };
}
