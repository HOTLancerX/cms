"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * useSettings
 *
 * Client-side hook. Reads settings directly from the database
 * via the Next.js /api/settings route.
 * Has nothing to do with the Express server.
 *
 * Returns:
 *   settings — flat map { [title]: content }
 *   loading  — true while the first fetch is in flight
 *   error    — error message or null
 *   refresh  — re-fetch on demand
 */
export default function useSettings() {
    const [settings, setSettings] = useState<Record<string, any>>({});
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState<string | null>(null);

    const fetchSettings = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res  = await fetch("/api/settings", { cache: "no-store" });
            if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
            const data = await res.json();
            setSettings(data);
        } catch (err) {
            console.error("Settings fetch error:", err);
            setError(err instanceof Error ? err.message : "Failed to load settings");
            setSettings({});
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    return { settings, loading, error, refresh: fetchSettings };
}
