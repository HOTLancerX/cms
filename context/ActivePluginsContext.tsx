"use client";

/**
 * ActivePluginsContext
 *
 * Fetches /api/admin-init ONCE at the admin layout level, calls
 * reregisterHooks(), then exposes the active nx ID list to every
 * descendant via context — no component ever needs to fetch again.
 *
 * Usage:
 *   // In layout (already done):
 *   <ActivePluginsProvider>...</ActivePluginsProvider>
 *
 *   // In any child component (replaces useActivePlugins()):
 *   const activePlugins = useActivePluginsCtx();
 */

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { reregisterHooks } from "@/hook/PluginList";

type ActivePluginsCtxValue = string[] | null; // null = still loading

const ActivePluginsContext = createContext<ActivePluginsCtxValue>(null);

export function ActivePluginsProvider({ children }: { children: ReactNode }) {
    const [activePlugins, setActivePlugins] = useState<string[] | null>(null);

    useEffect(() => {
        fetch("/api/admin-init", { cache: "no-store" })
            .then((r) => r.json())
            .then((data: { plugins: { nx: string; status: string }[] }) => {
                const ids = (data.plugins ?? [])
                    .filter((p) => p.status === "active")
                    .map((p) => p.nx);
                reregisterHooks(ids);
                setActivePlugins(ids);
            })
            .catch(() => {
                reregisterHooks([]);
                setActivePlugins([]);
            });
    }, []);

    return (
        <ActivePluginsContext.Provider value={activePlugins}>
            {children}
        </ActivePluginsContext.Provider>
    );
}

/**
 * Returns the active plugin nx IDs, or null while the first fetch is in flight.
 * Drop-in replacement for useActivePlugins() — reads from context, no fetch.
 */
export function useActivePluginsCtx(): string[] | null {
    return useContext(ActivePluginsContext);
}
