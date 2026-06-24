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
 *
 * Plugin-scoped requests should pass `nx` as a query param or body field.
 * The Express server will return 403 with `error: "plugin_expired"`,
 * `"plugin_not_started"`, or `"plugin_inactive"` when the plugin is no
 * longer allowed to serve data. Use `isPluginBlockedResponse` to detect
 * these errors and surface them to the UI.
 */

export const API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";

const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";

/** Base headers sent with every request to Express */
const baseHeaders: HeadersInit = {
    "Content-Type": "application/json",
    "x-license-key": LICENSE_KEY,
};

// ── Plugin-block error types ───────────────────────────────────────────────────
export type PluginBlockError = "plugin_expired" | "plugin_not_started" | "plugin_inactive";

export interface PluginBlockedResult {
    blocked: true;
    error: PluginBlockError;
    message: string;
}

/**
 * User-facing messages for plugin block states.
 */
export const pluginBlockMessages: Record<PluginBlockError, string> = {
    plugin_expired:
        "Your plugin subscription has expired. Data transfer from this plugin has been suspended. Please renew your subscription to restore access.",
    plugin_not_started:
        "This plugin is not yet active. Access will be available once the plugin's start date is reached.",
    plugin_inactive:
        "This plugin has been deactivated or suspended by the administrator. No data is being transferred. Please contact support or reactivate the plugin.",
};

/**
 * Check whether a non-ok response is a plugin block (expired / inactive / not started).
 * Returns the structured block result or null if it is a different error.
 */
export async function isPluginBlockedResponse(
    res: Response
): Promise<PluginBlockedResult | null> {
    if (res.status !== 403) return null;
    try {
        const clone = res.clone();
        const data = await clone.json() as { error?: string; message?: string };
        const knownErrors: PluginBlockError[] = [
            "plugin_expired",
            "plugin_not_started",
            "plugin_inactive",
        ];
        if (data.error && knownErrors.includes(data.error as PluginBlockError)) {
            return {
                blocked: true,
                error: data.error as PluginBlockError,
                message:
                    pluginBlockMessages[data.error as PluginBlockError] ??
                    data.message ??
                    "Plugin access blocked.",
            };
        }
    } catch {
        // ignore parse errors
    }
    return null;
}

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
