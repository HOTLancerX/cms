"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

type PluginStatus = "active" | "inactive" | "install" | "update" | "delete";

interface PluginRecord {
    _id: string | null;
    nx: string;
    name: string;
    version: string;
    description: string;
    author: string;
    icon: string;
    color: string;
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
};

function resolveGradient(color: string): string {
    return COLOR_MAP[color] ?? "linear-gradient(to bottom right, #6366f1, #7c3aed)";
}

const STATUS_CONFIG: Record<PluginStatus, { label: string; cls: string }> = {
    active: { label: "Active", cls: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300" },
    inactive: { label: "Inactive", cls: "bg-gray-100 text-gray-500 ring-1 ring-gray-300" },
    install: { label: "Install", cls: "bg-blue-100 text-blue-700 ring-1 ring-blue-300" },
    update: { label: "Update", cls: "bg-orange-100 text-orange-700 ring-1 ring-orange-300" },
    delete: { label: "Delete", cls: "bg-red-100 text-red-700 ring-1 ring-red-300" },
};

export default function PluginList({ initialPlugins }: { initialPlugins: PluginRecord[] }) {
    const [plugins, setPlugins] = useState<PluginRecord[]>(initialPlugins);
    // keyed by nx — the canonical unique identifier
    const [processing, setProcessing] = useState<string | null>(null);

    const updateLocal = (nx: string, patch: Partial<PluginRecord>) =>
        setPlugins((prev) => prev.map((p) => (p.nx === nx ? { ...p, ...patch } : p)));

    const apiPut = async (id: string, status: PluginStatus) => {
        const res = await fetch("/api/plugin", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status }),
        });
        return res.ok;
    };

    const handleToggle = async (plugin: PluginRecord) => {
        if (!plugin._id) return;
        const next: PluginStatus = plugin.status === "active" ? "inactive" : "active";
        setProcessing(plugin.nx);
        const ok = await apiPut(plugin._id, next);
        if (ok) updateLocal(plugin.nx, { status: next });
        setProcessing(null);
    };

    const handleDelete = async (plugin: PluginRecord) => {
        if (!plugin._id) return;
        setProcessing(plugin.nx);
        const res = await fetch(`/api/plugin?id=${plugin._id}`, { method: "DELETE" });
        if (res.ok) updateLocal(plugin.nx, { _id: null, status: "inactive" });
        setProcessing(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Installed Plugins</h1>

                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        {plugins.filter((p) => p.status === "active").length} of {plugins.length} plugins active
                    </p>
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
                        const isBusy = processing === plugin.nx;
                        const hasId = !!plugin._id;
                        const statusCfg = STATUS_CONFIG[plugin.status] ?? STATUS_CONFIG.inactive;

                        return (
                            <div
                                key={plugin.nx}
                                className="rounded-2xl overflow-hidden shadow-md border border-white/20 flex flex-col"
                            >
                                {/* Coloured header — inline style avoids Tailwind purge */}
                                <div
                                    className="p-5 flex items-center gap-4"
                                    style={{ background: resolveGradient(plugin.color) }}
                                >
                                    <div className="bg-white/20 rounded-xl p-2.5">
                                        <Icon icon={plugin.icon} width={28} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-bold text-lg capitalize leading-tight truncate">
                                            {plugin.name}
                                        </h3>
                                        <p className="text-white text-xs font-mono truncate">{plugin.nx}</p>
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

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        {hasId ? (
                                            <>
                                                {/* Activate / Deactivate */}
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

                                                {/* Delete */}
                                                <button
                                                    onClick={() => handleDelete(plugin)}
                                                    disabled={isBusy}
                                                    className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm bg-red-50 text-red-500 hover:bg-red-100 transition disabled:opacity-40"
                                                >
                                                    <Icon icon="solar:trash-bin-trash-bold" width={20} />
                                                </button>
                                            </>
                                        ) : (
                                            /* Not in DB — direct to store to install */
                                            <Link
                                                href="/admin/plugin/list"
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition hover:opacity-90"
                                                style={{ background: resolveGradient(plugin.color) }}
                                            >
                                                <Icon icon="solar:download-bold" width={16} />
                                                Install from Store
                                            </Link>
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
            </p>
        </div>
    );
}
