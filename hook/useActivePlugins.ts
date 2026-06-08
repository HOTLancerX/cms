"use client";

/**
 * useActivePlugins
 *
 * Fetches the active plugin list from /api/plugin and calls reregisterHooks()
 * (which always includes core hooks from components/admin/index.ts).
 *
 * Returns:
 *   - activePlugins: string[] | null  — null while the first fetch is in flight
 *
 * Usage:
 *
 *   const activePlugins = useActivePlugins();
 *   if (activePlugins === null) return null; // still loading
 */

import { useState, useEffect } from "react";
import { reregisterHooks } from "@/hook/PluginList";
import { xFetch } from "@/lib/express";

export function useActivePlugins(): string[] | null {
    const [activePlugins, setActivePlugins] = useState<string[] | null>(null);

    useEffect(() => {
        xFetch("/plugin/installed", { cache: "no-store" })
            .then((r) => r.json())
            .then((data: { plugins: { nx: string; status: string }[] }) => {
                const ids = (data.plugins ?? [])
                    .filter((p) => p.status === "active") // "expired" / "not_started" are excluded automatically
                    .map((p) => p.nx);
                reregisterHooks(ids);
                setActivePlugins(ids);
            })
            .catch(() => {
                reregisterHooks([]);
                setActivePlugins([]);
            });
    }, []);

    return activePlugins;
}
