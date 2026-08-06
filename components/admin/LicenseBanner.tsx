"use client";

/**
 * LicenseBanner — displays full domain license info with expiration countdown.
 *
 * Displays:
 *  - License Key with 1-click copy
 *  - Project Name & Domain URL
 *  - Status (Active / Expiring Soon / Expired / Disabled)
 *  - Start Date & Expiration Date
 *  - Live countdown remaining
 */

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

export interface DomainInfo {
    projectName?: string;
    domainName?: string;
    domainURL?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
}

interface LicenseBannerProps {
    domain?: DomainInfo | null;
    licenseKey?: string;
    // Backward compatibility props
    projectName?: string;
    endDate?: string;
}

export default function LicenseBanner({
    domain,
    licenseKey,
    projectName: legacyProjectName,
    endDate: legacyEndDate,
}: LicenseBannerProps) {
    const key = licenseKey || process.env.NEXT_PUBLIC_LICENSE_KEY || "";
    const pName = domain?.projectName || legacyProjectName || "CMS Project";
    const dURL = domain?.domainURL || (domain?.domainName ? `https://${domain.domainName}` : "");
    const dName = domain?.domainName || "";
    const startDateStr = domain?.startDate;
    const endDateStr = domain?.endDate || legacyEndDate;
    const domainStatus = domain?.status || "active";

    const [copied, setCopied] = useState(false);
    const [showFullKey, setShowFullKey] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState("");
    const [status, setStatus] = useState<"ok" | "warning" | "expired" | "disabled">("ok");

    const maskedKey = key
        ? showFullKey
            ? key
            : key.length > 10
                ? `${key.slice(0, 6)}••••••••${key.slice(-4)}`
                : key
        : "N/A";

    useEffect(() => {
        if (domainStatus === "disabled") {
            setStatus("disabled");
            setTimeRemaining("License Disabled");
            return;
        }

        if (!endDateStr) {
            setTimeRemaining("No Expiration Set");
            setStatus("ok");
            return;
        }

        const updateCountdown = () => {
            const now = Date.now();
            const end = new Date(endDateStr).getTime();
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
                setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
            } else if (hours > 0) {
                setTimeRemaining(`${hours}h ${minutes}m`);
            } else {
                setTimeRemaining(`${minutes}m`);
            }

            setStatus(days < 7 ? "warning" : "ok");
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [endDateStr, domainStatus]);

    const copyLicenseKey = () => {
        if (!key) return;
        navigator.clipboard.writeText(key);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "N/A";
        try {
            return new Date(dateStr).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        } catch {
            return dateStr;
        }
    };

    const config = {
        ok: {
            bg: "bg-emerald-50/80 border-emerald-200/80 shadow-emerald-50",
            headerText: "text-emerald-950",
            iconBg: "bg-emerald-600 text-white shadow-emerald-200",
            badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
            badgeDot: "bg-emerald-500",
            statusLabel: "Active License",
            clockColor: "text-emerald-700",
            cardBg: "bg-white/80 border-emerald-100",
        },
        warning: {
            bg: "bg-amber-50/80 border-amber-200/80 shadow-amber-50",
            headerText: "text-amber-950",
            iconBg: "bg-amber-500 text-white shadow-amber-200",
            badge: "bg-amber-100 text-amber-800 border-amber-200",
            badgeDot: "bg-amber-500",
            statusLabel: "Expiring Soon",
            clockColor: "text-amber-700",
            cardBg: "bg-white/80 border-amber-100",
        },
        expired: {
            bg: "bg-red-50/80 border-red-200/80 shadow-red-50",
            headerText: "text-red-950",
            iconBg: "bg-red-600 text-white shadow-red-200",
            badge: "bg-red-100 text-red-800 border-red-200",
            badgeDot: "bg-red-500",
            statusLabel: "License Expired",
            clockColor: "text-red-700",
            cardBg: "bg-white/80 border-red-100",
        },
        disabled: {
            bg: "bg-gray-50 border-gray-200 shadow-gray-50",
            headerText: "text-gray-900",
            iconBg: "bg-gray-600 text-white shadow-gray-200",
            badge: "bg-gray-200 text-gray-800 border-gray-300",
            badgeDot: "bg-gray-500",
            statusLabel: "Disabled",
            clockColor: "text-gray-700",
            cardBg: "bg-white/80 border-gray-200",
        },
    }[status];

    return (
        <div className={`rounded-2xl border shadow-sm p-6 transition-all ${config.bg}`}>
            {/* Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-black/5">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-3 rounded-xl shadow-sm shrink-0 ${config.iconBg}`}>
                        <Icon icon="solar:shield-keyhole-bold-duotone" width={24} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`text-base font-bold truncate ${config.headerText}`}>
                                {pName}
                            </h3>
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${config.badge}`}>
                                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${config.badgeDot}`} />
                                {config.statusLabel}
                            </span>
                        </div>
                        {dURL && (
                            <a
                                href={dURL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 transition mt-0.5"
                            >
                                <Icon icon="solar:link-bold" width={13} />
                                {dName || dURL}
                                <Icon icon="solar:export-bold" width={11} className="opacity-60" />
                            </a>
                        )}
                    </div>
                </div>

                {/* Countdown pill */}
                <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/90 border border-black/5 shadow-2xs ${config.clockColor}`}>
                    <Icon icon="solar:clock-circle-bold-duotone" width={20} />
                    <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider font-bold opacity-60">Time Remaining</p>
                        <p className="text-sm font-bold leading-none">{timeRemaining}</p>
                    </div>
                </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* License Key Card */}
                <div className={`p-3.5 rounded-xl border ${config.cardBg} flex flex-col justify-between gap-1`}>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        License Key
                    </p>
                    <div className="flex items-center justify-between gap-2">
                        <code className="text-xs font-mono font-bold text-gray-800 tracking-tight truncate">
                            {maskedKey}
                        </code>
                        {key && (
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowFullKey((v) => !v)}
                                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                                    title={showFullKey ? "Hide License Key" : "Show License Key"}
                                >
                                    <Icon
                                        icon={showFullKey ? "solar:eye-closed-bold" : "solar:eye-bold"}
                                        width={16}
                                    />
                                </button>
                                <button
                                    type="button"
                                    onClick={copyLicenseKey}
                                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                                    title="Copy License Key"
                                >
                                    <Icon
                                        icon={copied ? "solar:check-circle-bold" : "solar:copy-bold"}
                                        width={16}
                                        className={copied ? "text-emerald-600" : ""}
                                    />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Card */}
                <div className={`p-3.5 rounded-xl border ${config.cardBg} flex flex-col justify-between gap-1`}>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        License Status
                    </p>
                    <div className="flex items-center gap-2">
                        <Icon icon="solar:verified-check-bold" width={16} className={config.clockColor} />
                        <span className="text-xs font-bold text-gray-800 capitalize">
                            {domainStatus}
                        </span>
                    </div>
                </div>

                {/* Start Date Card */}
                <div className={`p-3.5 rounded-xl border ${config.cardBg} flex flex-col justify-between gap-1`}>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        Start Date
                    </p>
                    <div className="flex items-center gap-2">
                        <Icon icon="solar:calendar-minimalistic-bold" width={16} className="text-gray-400" />
                        <span className="text-xs font-bold text-gray-800">
                            {formatDate(startDateStr)}
                        </span>
                    </div>
                </div>

                {/* Expiry Date Card */}
                <div className={`p-3.5 rounded-xl border ${config.cardBg} flex flex-col justify-between gap-1`}>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        Expiration Date
                    </p>
                    <div className="flex items-center gap-2">
                        <Icon icon="solar:calendar-mark-bold" width={16} className="text-gray-400" />
                        <span className="text-xs font-bold text-gray-800">
                            {formatDate(endDateStr)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
