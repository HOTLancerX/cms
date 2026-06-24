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
 *
 * Plugin-scoped requests should pass `nx` as a query param or body field.
 * If the plugin is expired, inactive, or not yet started, the Express server
 * returns HTTP 403 with a structured `error` field. Use `xFetchPlugin` or
 * check the response with `isPluginBlocked` to surface the correct message.
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

// ── Plugin-block helpers ───────────────────────────────────────────────────────
export type PluginBlockError = "plugin_expired" | "plugin_not_started" | "plugin_inactive";

/**
 * User-facing messages shown when a plugin is blocked.
 * Expired / inactive → subscription or admin action required.
 */
export const pluginBlockMessages: Record<PluginBlockError, string> = {
    plugin_expired:
        "Your plugin subscription has expired. No data is being transferred from this plugin. Please renew your subscription to restore access.",
    plugin_not_started:
        "This plugin is not yet active. Access will be available once the plugin's start date is reached.",
    plugin_inactive:
        "This plugin has been suspended or deactivated by the administrator. No data is being transferred. Please contact support or reactivate the plugin from the admin panel.",
};

export interface PluginBlockResult {
    blocked: true;
    error: PluginBlockError;
    message: string;
}

/**
 * After receiving a Response from xFetch, call this to check whether the
 * server blocked the request due to plugin expiry / inactivity.
 *
 * Returns a PluginBlockResult when blocked, or null otherwise.
 * Safe to call on any response — returns null for non-403 or unknown errors.
 */
export async function isPluginBlocked(res: Response): Promise<PluginBlockResult | null> {
    if (res.status !== 403) return null;
    try {
        const data = await res.clone().json() as { error?: string; message?: string };
        const known: PluginBlockError[] = [
            "plugin_expired",
            "plugin_not_started",
            "plugin_inactive",
        ];
        if (data.error && known.includes(data.error as PluginBlockError)) {
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
