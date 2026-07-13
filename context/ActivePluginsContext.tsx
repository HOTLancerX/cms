"use client";

/**
 * ActivePluginsContext
 *
 * If `initialPlugins` is provided by the server (via layout.tsx), calls
 * reregisterHooks() synchronously on first render — zero delay, no flash.
 *
 * Falls back to fetching /api/admin-init client-side only when
 * initialPlugins is not provided (e.g. admin layout).
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

interface ActivePluginsProviderProps {
    children: ReactNode;
    /** Active plugin nx IDs resolved server-side. When provided, no client fetch is needed. */
    initialPlugins?: string[];
}

export function ActivePluginsProvider({ children, initialPlugins }: ActivePluginsProviderProps) {
    const [activePlugins, setActivePlugins] = useState<string[] | null>(() => {
        if (initialPlugins) {
            // Synchronous — runs during first render, before any paint.
            reregisterHooks(initialPlugins);
            return initialPlugins;
        }
        return null;
    });

    useEffect(() => {
        // Skip the fetch entirely when the server already provided the list.
        if (initialPlugins) return;

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
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <ActivePluginsContext.Provider value={activePlugins}>
            {children}
        </ActivePluginsContext.Provider>
    );
}

/**
 * Returns the active plugin nx IDs, or null while the first fetch is in flight.
 * When initialPlugins was provided this is never null — populated synchronously.
 */
export function useActivePluginsCtx(): string[] | null {
    return useContext(ActivePluginsContext);
}
