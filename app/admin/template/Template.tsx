"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { getHooks } from "@/hook";
import { reregisterHooks } from "@/hook/PluginList";
import { xFetch } from "@/lib/express";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplateEntry {
    // Identity — from hook registry
    key: string;
    type: string;
    label: string;
    position: number;
    pluginNx: string;
    active: boolean; // plugin-declared first-boot hint
    // State — resolved from DB
    isDefault: boolean;
    dbId: string | null; // null until the record has been saved to DB
}

// DB record shape returned by GET /template
interface DbRecord {
    _id: string;
    type: string;
    label: string;
    pluginNx: string;
    isDefault: boolean;
}

const CORE_NX = "com.system.core";

const TYPE_ICON: Record<string, string> = {
    cat: "solar:folder-bold",
    post: "solar:document-bold",
    header: "solar:sidebar-minimalistic-bold",
    footer: "solar:list-bold",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TemplateManager() {
    const [templates, setTemplates] = useState<TemplateEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null); // label of busy card
    const [activeTab, setActiveTab] = useState<string>("all");

    useEffect(() => {
        (async () => {
            setLoading(true);

            // 1. Get active plugin nx IDs from DB
            const pluginRes = await xFetch("/plugin/installed", { cache: "no-store" });
            const pluginData: { plugins: { nx: string; status: string }[] } =
                await pluginRes.json();
            const activeNxIds = (pluginData.plugins ?? [])
                .filter((p) => p.status === "active")
                .map((p) => p.nx);
            const activeNxSet = new Set(activeNxIds);

            // 2. Re-register hooks so the in-memory registry is up to date
            reregisterHooks(activeNxIds);

            // 3. Read templates directly from the hook registry — no DB write
            const hookEntries = getHooks("root.pages").filter((p) => !!p.type);

            // 4. Filter to only core + active-plugin templates
            const visible = hookEntries.filter(
                (p) => p.pluginNx === CORE_NX || activeNxSet.has(p.pluginNx ?? "")
            );

            // 5. Fetch the DB list once — only to know which isDefault
            const dbRes = await xFetch("/template", { cache: "no-store" });
            const dbRecords: DbRecord[] = await dbRes.json();

            // Build lookup: "type::label::pluginNx" → { _id, isDefault }
            const dbMap = new Map<string, { id: string; isDefault: boolean }>();
            dbRecords.forEach((r) => {
                dbMap.set(`${r.type}::${r.label}::${r.pluginNx}`, {
                    id: r._id,
                    isDefault: r.isDefault,
                });
            });

            // 6. Merge registry entries with DB state
            const merged: TemplateEntry[] = visible
                .map((p) => {
                    const dbEntry = dbMap.get(`${p.type}::${p.label}::${p.pluginNx}`);
                    return {
                        key: p.key ?? "",
                        type: p.type!,
                        label: p.label,
                        position: p.position ?? 0,
                        pluginNx: p.pluginNx ?? "",
                        active: p.active === true,
                        isDefault: dbEntry?.isDefault ?? false,
                        dbId: dbEntry?.id ?? null,
                    };
                })
                .sort((a, b) => a.type.localeCompare(b.type) || a.position - b.position);

            setTemplates(merged);
            setLoading(false);
        })();
    }, []);

    // ── Derived ───────────────────────────────────────────────────────────────

    const types = ["all", ...Array.from(new Set(templates.map((t) => t.type)))];
    const visibleTemplates =
        activeTab === "all" ? templates : templates.filter((t) => t.type === activeTab);

    // ── Set Default ───────────────────────────────────────────────────────────
    // 1. Upsert the record into the DB (creates it if it was never saved)
    // 2. PUT to set it as the default for its type
    // 3. Update local state

    const handleSetDefault = async (tpl: TemplateEntry) => {
        const busyKey = `${tpl.type}::${tpl.label}`;
        setProcessing(busyKey);

        try {
            // Step 1 — upsert so the DB row definitely exists, get back the _id
            const upsertRes = await xFetch("/template", {
                method: "POST",
                body: JSON.stringify({
                    type: tpl.type,
                    key: tpl.key,
                    label: tpl.label,
                    position: tpl.position,
                    pluginNx: tpl.pluginNx,
                    active: false, // explicit save — not a first-boot hint
                }),
            });

            // The upsert response may include the record; if not, re-fetch to get the id
            let dbId = tpl.dbId;
            if (!dbId) {
                const listRes = await xFetch("/template", { cache: "no-store" });
                const records: DbRecord[] = await listRes.json();
                const match = records.find(
                    (r) =>
                        r.type === tpl.type &&
                        r.label === tpl.label &&
                        r.pluginNx === tpl.pluginNx
                );
                dbId = match?._id ?? null;
            }

            if (!dbId) {
                console.error("Could not resolve DB id for template", tpl.label);
                return;
            }

            // Step 2 — set as default
            await xFetch("/template", {
                method: "PUT",
                body: JSON.stringify({ id: dbId, type: tpl.type }),
            });

            // Step 3 — reflect in local state
            setTemplates((prev) =>
                prev.map((t) =>
                    t.type === tpl.type
                        ? {
                            ...t,
                            isDefault: t.label === tpl.label && t.pluginNx === tpl.pluginNx,
                            dbId: t.label === tpl.label && t.pluginNx === tpl.pluginNx
                                ? dbId
                                : t.dbId,
                        }
                        : t
                )
            );
        } finally {
            setProcessing(null);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24 text-gray-400">
                <Icon icon="svg-spinners:ring-resize" width={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Templates</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Choose the default design template for each content type.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 flex-wrap border-b border-gray-200">
                {types.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium capitalize rounded-t-lg transition border-b-2 -mb-px ${activeTab === tab
                                ? "border-indigo-500 text-indigo-600 bg-white"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        <span className="flex items-center gap-1.5">
                            <Icon
                                icon={
                                    tab === "all"
                                        ? "solar:widget-bold"
                                        : (TYPE_ICON[tab] ?? "solar:file-bold")
                                }
                                width={15}
                            />
                            {tab}
                        </span>
                    </button>
                ))}
            </div>

            {/* Grid */}
            {visibleTemplates.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <Icon icon="solar:layers-bold" width={48} className="mx-auto mb-3 opacity-40" />
                    <p>No templates registered for active plugins.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {visibleTemplates.map((tpl) => {
                        const busyKey = `${tpl.type}::${tpl.label}`;
                        const isBusy = processing === busyKey;
                        const icon = TYPE_ICON[tpl.type] ?? "solar:file-bold";

                        return (
                            <div
                                key={busyKey}
                                className={`rounded-2xl overflow-hidden shadow-md border flex flex-col transition ${tpl.isDefault
                                        ? "border-indigo-400 ring-2 ring-indigo-300"
                                        : "border-gray-200"
                                    }`}
                            >
                                {/* Card header */}
                                <div className="bg-linear-to-br from-indigo-500 to-violet-600 p-5 flex items-center gap-4">
                                    <div className="bg-white/20 rounded-xl p-2.5">
                                        <Icon icon={icon} width={26} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-bold text-base leading-tight truncate">
                                            {tpl.label}
                                        </h3>
                                        <p className="text-white/60 text-xs font-mono truncate mt-0.5">
                                            {tpl.pluginNx}
                                        </p>
                                    </div>
                                    {tpl.isDefault && (
                                        <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-white text-indigo-600">
                                            Default
                                        </span>
                                    )}
                                </div>

                                {/* Card body */}
                                <div className="bg-white flex-1 p-5 flex flex-col gap-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 capitalize">
                                            {tpl.type}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            position {tpl.position}
                                        </span>
                                        {!tpl.dbId && (
                                            <span className="text-xs text-amber-500 font-medium">
                                                not saved yet
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-auto pt-3 border-t border-gray-100">
                                        {tpl.isDefault ? (
                                            <div className="inline-flex items-center gap-2 text-indigo-600 font-semibold text-sm">
                                                <Icon icon="solar:check-circle-bold" width={18} />
                                                Active template
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleSetDefault(tpl)}
                                                disabled={isBusy}
                                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition disabled:opacity-50"
                                            >
                                                {isBusy ? (
                                                    <Icon icon="svg-spinners:ring-resize" width={16} />
                                                ) : (
                                                    <Icon icon="solar:star-bold" width={16} />
                                                )}
                                                {isBusy ? "Saving…" : "Set Default"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
