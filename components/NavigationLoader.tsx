"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";

export interface NavigationLoaderProps {
    settings?: Record<string, any>;
}

export type LoaderStyle = "top_bar" | "center_popup" | "bottom_bar" | "minimal_spinner" | "full_overlay";

function NavigationLoaderInner({ settings: initialSettings = {} }: NavigationLoaderProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Live settings state — can update dynamically when settings are saved in admin
    const [settings, setSettings] = useState<Record<string, any>>(initialSettings);

    useEffect(() => {
        setSettings(initialSettings);
    }, [initialSettings]);

    // Listen for live cms_settings_updated event
    useEffect(() => {
        const handleSettingsUpdated = async () => {
            try {
                const res = await fetch("/api/settings", { cache: "no-store" });
                if (res.ok) {
                    const data = await res.json();
                    setSettings(data);
                }
            } catch {
                // ignore
            }
        };
        window.addEventListener("cms_settings_updated", handleSettingsUpdated);
        return () => window.removeEventListener("cms_settings_updated", handleSettingsUpdated);
    }, []);

    // Configuration flags
    const enabled = settings.loader_enabled !== "false" && settings.loader_enabled !== false;
    const style: LoaderStyle = (settings.loader_style as LoaderStyle) || "top_bar";
    const primaryColor = settings.loader_color || settings.color_main || "#00aaa6";
    const secondaryColor = settings.loader_secondary_color || settings.color_secondary || "#ffc800";
    const barHeight = parseInt(String(settings.loader_height || "3"), 10) || 3;
    const showSpinner = settings.loader_show_spinner !== "false" && settings.loader_show_spinner !== false;
    const loadingText = settings.loader_text || "Loading page...";
    const scope = settings.loader_scope || "all"; // 'all' | 'public' | 'admin'

    // Check scope against current path
    const isAdmin = pathname?.startsWith("/admin");
    const isPublic = !isAdmin;
    const isScopeActive =
        scope === "all" ||
        (scope === "admin" && isAdmin) ||
        (scope === "public" && isPublic);

    // Loader active state & progress (0-100)
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);
    const currentUrlRef = useRef<string>("");

    useEffect(() => {
        currentUrlRef.current = window.location.href;
    }, [pathname, searchParams]);

    const startLoader = useCallback(() => {
        if (!enabled || !isScopeActive) return;

        if (timerRef.current) clearInterval(timerRef.current);
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);

        setVisible(true);
        setIsLoading(true);
        setProgress(15);

        // Incremental progress simulation (runs like a true browser navigation progress bar)
        let currentProgress = 15;
        timerRef.current = setInterval(() => {
            currentProgress += Math.random() * (currentProgress < 50 ? 12 : currentProgress < 80 ? 5 : 1.5);
            if (currentProgress > 92) {
                currentProgress = 92;
            }
            setProgress(currentProgress);
        }, 120);

        // Safety timeout — auto finish after 8 seconds in case navigation is cancelled or slow
        safetyTimerRef.current = setTimeout(() => {
            completeLoader();
        }, 8000);
    }, [enabled, isScopeActive]);

    const completeLoader = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);

        setProgress(100);
        setIsLoading(false);

        // Smooth fade out delay
        const fadeTimer = setTimeout(() => {
            setVisible(false);
            setProgress(0);
        }, 300);

        return () => clearTimeout(fadeTimer);
    }, []);

    // Route change completed: when pathname or searchParams changes
    useEffect(() => {
        if (isLoading) {
            completeLoader();
        }
    }, [pathname, searchParams]);

    // Global Link Click Listener & Event Listeners
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (e.defaultPrevented) return;
            if (e.button !== 0) return; // Only left click
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // Ignore modifier keys

            const target = e.target as HTMLElement | null;
            const anchor = target?.closest("a") as HTMLAnchorElement | null;
            if (!anchor) return;

            // Check target
            const linkTarget = anchor.getAttribute("target");
            if (linkTarget && linkTarget !== "_self") return;

            // Check download
            if (anchor.hasAttribute("download")) return;

            const href = anchor.getAttribute("href");
            if (!href) return;

            // Ignore non-http links or page anchors
            if (
                href.startsWith("#") ||
                href.startsWith("mailto:") ||
                href.startsWith("tel:") ||
                href.startsWith("javascript:")
            ) {
                return;
            }

            try {
                const targetUrl = new URL(anchor.href, window.location.href);
                const currentUrl = new URL(window.location.href);

                // Ignore external origins
                if (targetUrl.origin !== currentUrl.origin) return;

                // Ignore exact same page and query (e.g. hash changes)
                if (
                    targetUrl.pathname === currentUrl.pathname &&
                    targetUrl.search === currentUrl.search
                ) {
                    return;
                }

                // Internal navigation detected! Start loader
                startLoader();
            } catch {
                // Ignore invalid URLs
            }
        };

        const handlePopState = () => {
            startLoader();
        };

        const handleCustomStart = () => startLoader();
        const handleCustomStop = () => completeLoader();

        document.addEventListener("click", handleClick, { capture: true });
        window.addEventListener("popstate", handlePopState);
        window.addEventListener("cms:loader-start", handleCustomStart);
        window.addEventListener("cms:loader-stop", handleCustomStop);

        return () => {
            document.removeEventListener("click", handleClick, { capture: true });
            window.removeEventListener("popstate", handlePopState);
            window.removeEventListener("cms:loader-start", handleCustomStart);
            window.removeEventListener("cms:loader-stop", handleCustomStop);
            if (timerRef.current) clearInterval(timerRef.current);
            if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
        };
    }, [startLoader, completeLoader]);

    if (!visible || !enabled || !isScopeActive) {
        return null;
    }

    return (
        <div
            id="cms-navigation-loader"
            className="pointer-events-none transition-opacity duration-300"
            style={{ opacity: isLoading ? 1 : 0 }}
            aria-live="polite"
            aria-busy={isLoading}
        >
            {/* ── STYLE 1: TOP RUNNER BAR (Navigation runner across top of viewport) ── */}
            {style === "top_bar" && (
                <div
                    className="fixed top-0 left-0 right-0 z-999999 overflow-hidden"
                    style={{ height: `${barHeight}px` }}
                >
                    {/* Background track */}
                    <div className="absolute inset-0 bg-black/5" />

                    {/* Progress fill */}
                    <div
                        className="h-full transition-all duration-150 ease-out relative"
                        style={{
                            width: `${progress}%`,
                            background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor || primaryColor})`,
                            boxShadow: `0 0 12px ${primaryColor}, 0 0 6px ${primaryColor}`,
                        }}
                    >
                        {/* Glowing Runner Head / Peg */}
                        <div
                            className="absolute top-0 right-0 h-full w-24 opacity-100"
                            style={{
                                background: `linear-gradient(90deg, transparent, #ffffff)`,
                                transform: "rotate(3deg) translate(0px, -2px)",
                                filter: "blur(2px)",
                            }}
                        />
                    </div>

                    {/* Optional discreet spinner at top right */}
                    {showSpinner && (
                        <div
                            className="fixed top-4 right-4 z-999999 flex items-center justify-center p-2 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-gray-200/80 animate-spin"
                            style={{ color: primaryColor }}
                        >
                            <Icon icon="solar:refresh-circle-bold" width={22} height={22} />
                        </div>
                    )}
                </div>
            )}

            {/* ── STYLE 2: CENTER POPUP / MODAL OVERLAY ── */}
            {style === "center_popup" && (
                <div className="fixed inset-0 z-999999 flex items-center justify-center bg-black/20 backdrop-blur-xs">
                    <div className="flex flex-col items-center justify-center gap-3.5 px-7 py-5 rounded-2xl bg-white/95 text-gray-800 shadow-2xl border border-white/60 transform transition-all duration-200 scale-100 animate-in fade-in zoom-in-95">
                        <div className="relative flex items-center justify-center">
                            {/* Outer pulsing ring */}
                            <div
                                className="w-12 h-12 rounded-full animate-ping opacity-25"
                                style={{ backgroundColor: primaryColor }}
                            />
                            {/* Inner spinning ring */}
                            <div className="absolute inset-0 flex items-center justify-center animate-spin">
                                <Icon icon="svg-spinners:ring-resize" width={32} height={32} style={{ color: primaryColor }} />
                            </div>
                        </div>

                        <div className="text-center">
                            <p className="text-xs font-bold text-gray-800 tracking-wide">{loadingText}</p>
                            <div className="w-32 h-1.5 bg-gray-100 rounded-full mt-2.5 overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-150"
                                    style={{
                                        width: `${progress}%`,
                                        background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor || primaryColor})`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── STYLE 3: BOTTOM / FOOTER FLOATING INDICATOR ── */}
            {style === "bottom_bar" && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-999999">
                    <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-gray-900/95 text-white shadow-xl backdrop-blur-md border border-white/15 animate-in slide-in-from-bottom-3 duration-200">
                        <Icon
                            icon="svg-spinners:180-ring-with-bg"
                            width={18}
                            height={18}
                            style={{ color: secondaryColor || primaryColor }}
                        />
                        <span className="text-xs font-semibold tracking-wide pr-1">{loadingText}</span>
                        <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-150"
                                style={{
                                    width: `${progress}%`,
                                    backgroundColor: primaryColor,
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── STYLE 4: MINIMAL CORNER SPINNER ── */}
            {style === "minimal_spinner" && (
                <div className="fixed top-5 right-5 z-999999 pointer-events-none">
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/95 shadow-lg border border-gray-200/80 backdrop-blur-md">
                        <Icon
                            icon="svg-spinners:ring-resize"
                            width={20}
                            height={20}
                            style={{ color: primaryColor }}
                        />
                        <span className="text-xs font-bold text-gray-700">{loadingText}</span>
                    </div>
                </div>
            )}

            {/* ── STYLE 5: FULL SCREEN ELEGANT OVERLAY ── */}
            {style === "full_overlay" && (
                <div className="fixed inset-0 z-999999 flex flex-col items-center justify-center bg-white/85 backdrop-blur-md">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <div
                                className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-transparent animate-spin"
                                style={{ borderTopColor: primaryColor }}
                            />
                        </div>
                        <p className="text-sm font-bold text-gray-800">{loadingText}</p>
                        <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-150"
                                style={{
                                    width: `${progress}%`,
                                    background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor || primaryColor})`,
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function NavigationLoader(props: NavigationLoaderProps) {
    return (
        <Suspense fallback={null}>
            <NavigationLoaderInner {...props} />
        </Suspense>
    );
}
