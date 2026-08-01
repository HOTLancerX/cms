"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import useSettings from "@/lib/useSettings";

export interface PWAProps {
    title?: string;
    icon?: string;
    variant?: "playstore" | "desktop" | "iphone" | "auto" | string;
    showOnlyOnRestart?: boolean;
    className?: string;
    settings?: Record<string, any>;
}

export default function PWA({
    title = "Download Official App",
    settings: propSettings,
}: PWAProps) {
    const { settings: hookSettings } = useSettings();
    const settings = propSettings && Object.keys(propSettings).length > 0 ? propSettings : hookSettings;

    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        if (
            typeof window !== "undefined" &&
            (window.matchMedia("(display-mode: standalone)").matches ||
             (window.navigator as any).standalone === true)
        ) {
            setIsInstalled(true);
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleAppInstalled);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === "accepted") {
                setIsInstalled(true);
            }
            setDeferredPrompt(null);
        } else if (isInstalled) {
            alert("App is already installed on your device!");
        } else {
            alert("To install the app, tap your browser's menu button (or share icon) and select 'Add to Home Screen' or 'Install App'.");
        }
    };

    if (isInstalled) return null;

    const appName = settings.site_title || settings.siteName || "Official App";

    return (
        <div className="flex items-center gap-3">
            <span className="text-xs font-normal whitespace-nowrap">{title || appName}</span>
            <button
                onClick={handleInstallClick}
                className="px-5 py-2 border bg-white border-main hover:bg-main/80 hover:text-white text-main rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
            >
                <Icon icon="simple-icons:pwa" width={30} />
                Install
            </button>
        </div>
    );
}
