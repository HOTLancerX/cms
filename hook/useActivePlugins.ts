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

export function useActivePlugins(): string[] | null {
    const [activePlugins, setActivePlugins] = useState<string[] | null>(null);

    useEffect(() => {
        fetch("/api/plugin", { cache: "no-store" })
            .then((r) => r.json())
            .then((data: { nx: string; status: string }[]) => {
                const ids = data
                    .filter((p) => p.status === "active")
                    .map((p) => p.nx);
                // Always re-registers core hooks + active plugin hooks
                reregisterHooks(ids);
                setActivePlugins(ids);
            })
            .catch(() => {
                // Fall back: no active plugins, but core hooks still run
                reregisterHooks([]);
                setActivePlugins([]);
            });
    }, []);

    return activePlugins;
}
