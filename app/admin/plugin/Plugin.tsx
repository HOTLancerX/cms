"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { xFetch } from "@/lib/express";

type PluginStatus = "active" | "inactive" | "new" | "install" | "update" | "delete";

interface PluginRecord {
    _id: string | null;
    nx: string;
    name: string;
    version: string;
    description: string;
    author: string;
    icon: string;
    color: string;
    startDate?: string | null;
    endDate?: string | null;
    /** True when the domain's date window for this plugin has elapsed — display only */
    isExpired?: boolean;
    /** True when the domain's date window hasn't started yet — display only */
    isNotStarted?: boolean;
    status: PluginStatus;
}

// Maps Tailwind gradient class pairs → actual CSS gradient.
// Dynamic Tailwind classes are purged at build time, so we resolve them here.
const COLOR_MAP: Record<string, string> = {
    "from-sky-500 to-blue-600": "linear-gradient(to bottom right, #0ea5e9, #2563eb)",
    "from-violet-500 to-purple-600": "linear-gradient(to bottom right, #8b5cf6, #9333ea)",
    "from-indigo-500 to-violet-600": "linear-gradient(to bottom right, #6366f1, #7c3aed)",
    "from-emerald-500 to-teal-600": "linear-gradient(to bottom right, #10b981, #0d9488)",
    "from-orange-500 to-red-600": "linear-gradient(to bottom right, #f97316, #dc2626)",
    "from-pink-500 to-rose-600": "linear-gradient(to bottom right, #ec4899, #e11d48)",
    "from-amber-500 to-orange-600": "linear-gradient(to bottom right, #f59e0b, #ea580c)",
    "from-cyan-500 to-sky-600": "linear-gradient(to bottom right, #06b6d4, #0284c7)",
    "from-lime-500 to-green-600": "linear-gradient(to bottom right, #84cc16, #16a34a)",
    "from-fuchsia-500 to-pink-600": "linear-gradient(to bottom right, #d946ef, #db2777)",
    "from-violet-600 to-indigo-600": "linear-gradient(to right, #7c3aed, #4f46e5)",
    "from-indigo-500 to-purple-600": "linear-gradient(to bottom right, #6366f1, #9333ea)",
};

function resolveGradient(color: string): string {
    return COLOR_MAP[color] ?? "linear-gradient(to bottom right, #6366f1, #7c3aed)";
}

const STATUS_CONFIG: Record<PluginStatus, { label: string; cls: string }> = {
    active:   { label: "Active",   cls: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300" },
    inactive: { label: "Inactive", cls: "bg-gray-100 text-gray-500 ring-1 ring-gray-300" },
    new:      { label: "New",      cls: "bg-violet-100 text-violet-700 ring-1 ring-violet-300" },
    install:  { label: "Install",  cls: "bg-blue-100 text-blue-700 ring-1 ring-blue-300" },
    update:   { label: "Update",   cls: "bg-orange-100 text-orange-700 ring-1 ring-orange-300" },
    delete:   { label: "Delete",   cls: "bg-red-100 text-red-700 ring-1 ring-red-300" },
};

export default function PluginList({ initialPlugins }: { initialPlugins: PluginRecord[] }) {
    const [plugins, setPlugins] = useState<PluginRecord[]>(initialPlugins);
    const [processing, setProcessing] = useState<string | null>(null);

    const updateLocal = (nx: string, patch: Partial<PluginRecord>) =>
        setPlugins((prev) => prev.map((p) => (p.nx === nx ? { ...p, ...patch } : p)));

    const apiPut = async (id: string, status: PluginStatus) => {
        const res = await xFetch("/plugin/installed", {
            method: "PUT",
            body: JSON.stringify({ id, status }),
        });
        return res.ok;
    };

    // For plugins already in DB: toggle active ↔ inactive
    const handleToggle = async (plugin: PluginRecord) => {
        if (!plugin._id) return;
        const next: PluginStatus = plugin.status === "active" ? "inactive" : "active";
        setProcessing(plugin.nx);
        const ok = await apiPut(plugin._id, next);
        if (ok) updateLocal(plugin.nx, { status: next });
        setProcessing(null);
    };

    // For plugins NOT yet in DB (status "new"): POST to create + activate in one step
    const handleActivateNew = async (plugin: PluginRecord) => {
        setProcessing(plugin.nx);
        try {
            const res = await xFetch("/plugin/installed", {
                method: "POST",
                body: JSON.stringify({
                    nx: plugin.nx,
                    name: plugin.name,
                    version: plugin.version,
                    icon: plugin.icon,
                    color: plugin.color,
                    status: "active",
                }),
            });
            if (res.ok) {
                const data = await res.json();
                // data may include the created record's _id
                const newId = data?._id ?? data?.plugin?._id ?? null;
                updateLocal(plugin.nx, { status: "active", _id: newId });
            }
        } finally {
            setProcessing(null);
        }
    };

    const handleDelete = async (plugin: PluginRecord) => {
        if (!plugin._id) return;
        setProcessing(plugin.nx);
        const res = await xFetch(`/plugin/installed?id=${plugin._id}`, { method: "DELETE" });
        if (res.ok) updateLocal(plugin.nx, { _id: null, status: "new" });
        setProcessing(null);
    };

    const activeCount = plugins.filter((p) => p.status === "active").length;
    const newCount = plugins.filter((p) => p.status === "new").length;
    const expiredCount = plugins.filter((p) => p.isExpired).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Installed Plugins</h1>
                <div className="flex items-center justify-between mt-1 flex-wrap gap-3">
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>{activeCount} of {plugins.length} active</span>
                        {newCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold ring-1 ring-violet-300">
                                {newCount} new discovered
                            </span>
                        )}
                        {expiredCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-semibold ring-1 ring-red-300">
                                {expiredCount} expired
                            </span>
                        )}
                    </div>
                    <Link
                        href="/admin/plugin/list"
                        className="inline-flex items-center gap-2 text-white px-4 py-2 rounded-xl font-medium hover:opacity-90 transition text-sm shadow"
                        style={{ background: resolveGradient("from-violet-600 to-indigo-600") }}
                    >
                        <Icon icon="solar:shop-bold" width={18} />
                        Plugin Store
                    </Link>
                </div>
            </div>

            {/* Grid */}
            {plugins.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <Icon icon="solar:box-minimalistic-bold" width={48} className="mx-auto mb-3 opacity-40" />
                    <p>No plugins found in the codebase.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {plugins.map((plugin) => {
                        const isActive = plugin.status === "active";
                        const isNew = plugin.status === "new";
                        const isExpired = plugin.isExpired ?? false;
                        const isNotStarted = plugin.isNotStarted ?? false;
                        const isBusy = processing === plugin.nx;
                        const statusCfg = STATUS_CONFIG[plugin.status] ?? STATUS_CONFIG.inactive;

                        return (
                            <div
                                key={plugin.nx}
                                className={`rounded-2xl overflow-hidden shadow-md border flex flex-col transition ${
                                    isNew
                                        ? "border-violet-300 ring-2 ring-violet-200"
                                        : isExpired
                                        ? "border-amber-200 ring-2 ring-amber-100"
                                        : "border-white/20"
                                }`}
                            >
                                {/* Coloured header */}
                                <div
                                    className={`p-5 flex items-center gap-4 ${isExpired ? "opacity-60" : ""}`}
                                    style={{ background: resolveGradient(plugin.color) }}
                                >
                                    <div className="bg-white/20 rounded-xl p-2.5">
                                        <Icon icon={plugin.icon} width={28} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-bold text-lg capitalize leading-tight truncate">
                                            {plugin.name}
                                        </h3>
                                        <p className="text-white/70 text-xs font-mono truncate">{plugin.nx}</p>
                                    </div>
                                    <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.cls}`}>
                                        {statusCfg.label}
                                    </span>
                                </div>

                                {/* Body */}
                                <div className="bg-white flex-1 p-5 flex flex-col gap-3">
                                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                                        {plugin.description}
                                    </p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                            v{plugin.version}
                                        </span>
                                        <span className="text-xs text-gray-400">by {plugin.author}</span>
                                    </div>

                                    {/* Date-based warnings — display only, do not affect plugin operation */}
                                    {(isExpired || isNotStarted) && (
                                        <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                                            isExpired
                                                ? "bg-amber-50 text-amber-700"
                                                : "bg-yellow-50 text-yellow-700"
                                        }`}>
                                            <Icon
                                                icon="solar:clock-circle-bold"
                                                width={14}
                                                className="shrink-0 mt-0.5"
                                            />
                                            <span>
                                                {isExpired
                                                    ? `Subscription period ended${plugin.endDate ? ` on ${new Date(plugin.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : ""}. Please renew to extend access.`
                                                    : `Subscription starts on ${new Date(plugin.startDate!).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}.`
                                                }
                                            </span>
                                        </div>
                                    )}
                                    {!isActive && !isNew && plugin.status === "inactive" && (
                                        <div className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs bg-gray-50 text-gray-500 border border-gray-200">
                                            <Icon
                                                icon="solar:lock-keyhole-minimalistic-bold"
                                                width={14}
                                                className="shrink-0 mt-0.5"
                                            />
                                            <span>
                                                This plugin has been deactivated or suspended. No data is being transferred. Reactivate it to restore functionality.
                                            </span>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-100">
                                        {isNew ? (
                                            // Not in DB yet — one-click activate saves + activates
                                            <button
                                                onClick={() => handleActivateNew(plugin)}
                                                disabled={isBusy}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-40 hover:opacity-90"
                                                style={{ background: "#10b981" }}
                                            >
                                                {isBusy ? (
                                                    <Icon icon="svg-spinners:ring-resize" width={16} />
                                                ) : (
                                                    <><Icon icon="solar:play-bold" width={16} />Activate</>
                                                )}
                                            </button>
                                        ) : (
                                            <>
                                                {/* Toggle active ↔ inactive — always available */}
                                                <button
                                                    onClick={() => handleToggle(plugin)}
                                                    disabled={isBusy}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-40 hover:opacity-90"
                                                    style={{ background: isActive ? "#f97316" : "#10b981" }}
                                                >
                                                    {isBusy ? (
                                                        <Icon icon="svg-spinners:ring-resize" width={16} />
                                                    ) : isActive ? (
                                                        <><Icon icon="solar:pause-bold" width={16} />Deactivate</>
                                                    ) : (
                                                        <><Icon icon="solar:play-bold" width={16} />Activate</>
                                                    )}
                                                </button>

                                                {/* Delete from DB (returns card to "new" state) */}
                                                <button
                                                    onClick={() => handleDelete(plugin)}
                                                    disabled={isBusy}
                                                    className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm bg-red-50 text-red-500 hover:bg-red-100 transition disabled:opacity-40"
                                                    title="Remove from database"
                                                >
                                                    <Icon icon="solar:trash-bin-trash-bold" width={20} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <p className="text-xs text-gray-400 text-center">
                Only <strong>active</strong> plugins inject their hooks into the application.
                Newly discovered plugins (shown with a <span className="text-violet-600 font-semibold">New</span> badge) are not saved until you activate them.
            </p>
        </div>
    );
}
