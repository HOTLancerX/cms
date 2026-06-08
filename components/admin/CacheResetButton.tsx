"use client";

/**
 * CacheResetButton
 *
 * Triggers the "cms-root" Next.js Data Cache invalidation via a Server Action.
 * The actual revalidateTag() call happens server-side — no secret is sent to
 * the browser.
 *
 * Only rendered when NEXT_PUBLIC_CACHE=production; invisible otherwise.
 */

import { useState } from "react";
import { Icon } from "@iconify/react";
import { revalidateCache } from "@/app/admin/actions/revalidateCache";

export default function CacheResetButton() {
    const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

    // Only show when caching is active
    if (process.env.NEXT_PUBLIC_CACHE !== "production") return null;

    const handleReset = async () => {
        setStatus("loading");
        try {
            const result = await revalidateCache();
            setStatus(result.ok ? "ok" : "error");
        } catch {
            setStatus("error");
        }
        setTimeout(() => setStatus("idle"), 3000);
    };

    const labels: Record<typeof status, string> = {
        idle: "Reset Cache",
        loading: "Resetting…",
        ok: "Cache Cleared!",
        error: "Failed — Retry",
    };

    const icons: Record<typeof status, string> = {
        idle: "mdi:refresh",
        loading: "svg-spinners:ring-resize",
        ok: "mdi:check-circle",
        error: "mdi:alert-circle",
    };

    const colours: Record<typeof status, string> = {
        idle: "bg-amber-500 hover:bg-amber-600 text-white",
        loading: "bg-amber-400 text-white cursor-wait",
        ok: "bg-green-500 text-white",
        error: "bg-red-500 text-white",
    };

    return (
        <button
            onClick={handleReset}
            disabled={status === "loading"}
            title="Invalidate the 24-hour data cache and fetch fresh content from the database"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm ${colours[status]}`}
        >
            <Icon icon={icons[status]} width={16} />
            <span className="hidden sm:inline">{labels[status]}</span>
        </button>
    );
}
