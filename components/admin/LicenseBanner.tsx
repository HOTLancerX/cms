"use client";

/**
 * LicenseBanner — displays domain license info with expiration countdown.
 *
 * Props:
 *  - projectName  — name of the project
 *  - endDate      — ISO date string
 *
 * Behavior:
 *  - Shows remaining time in days/hours/minutes
 *  - If expired, shows "Expired" in red
 *  - If less than 7 days, shows warning (amber)
 *  - Otherwise green/normal
 */

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

interface LicenseBannerProps {
    projectName: string;
    endDate: string;
}

export default function LicenseBanner({ projectName, endDate }: LicenseBannerProps) {
    const [timeRemaining, setTimeRemaining] = useState("");
    const [status, setStatus] = useState<"ok" | "warning" | "expired">("ok");

    useEffect(() => {
        const updateCountdown = () => {
            const now = Date.now();
            const end = new Date(endDate).getTime();
            const diff = end - now;

            if (diff <= 0) {
                setTimeRemaining("Expired");
                setStatus("expired");
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            if (days > 0) {
                setTimeRemaining(`${days}d ${hours}h`);
            } else if (hours > 0) {
                setTimeRemaining(`${hours}h ${minutes}m`);
            } else {
                setTimeRemaining(`${minutes}m`);
            }

            setStatus(days < 7 ? "warning" : "ok");
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 60_000);
        return () => clearInterval(interval);
    }, [endDate]);

    const bgColor = {
        ok: "bg-emerald-50 border-emerald-200",
        warning: "bg-amber-50 border-amber-200",
        expired: "bg-red-50 border-red-200",
    }[status];

    const textColor = {
        ok: "text-emerald-700",
        warning: "text-amber-700",
        expired: "text-red-700",
    }[status];

    const iconColor = {
        ok: "text-emerald-600",
        warning: "text-amber-600",
        expired: "text-red-600",
    }[status];

    const badgeColor = {
        ok: "bg-emerald-100 text-emerald-700",
        warning: "bg-amber-100 text-amber-700",
        expired: "bg-red-100 text-red-700",
    }[status];

    return (
        <div className={`rounded-2xl border shadow-sm p-5 ${bgColor}`}>
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl bg-white/60 shrink-0 ${iconColor}`}>
                        <Icon icon="solar:shield-keyhole-bold" width={22} />
                    </div>
                    <h3 className={`text-sm font-semibold ${textColor}`}>
                        {projectName}
                    </h3>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${badgeColor}`}>
                        {status === "expired" ? "Expired" : "Active"}
                    </span>
                    <div className={`text-xs font-medium ${textColor} flex items-center gap-1`}>
                        <Icon icon="solar:clock-circle-bold" width={12} />
                        {timeRemaining}
                    </div>
                </div>
            </div>
        </div>
    );
}
