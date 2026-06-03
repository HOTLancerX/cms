"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { getHooks } from "@/hook";
import { reregisterHooks } from "@/hook/PluginList";

interface TemplateRecord {
    _id: string;
    type: string;
    key: string;
    label: string;
    position: number;
    pluginNx: string;
    isDefault: boolean;
}

const TYPE_ICON: Record<string, string> = {
    cat: "solar:folder-bold",
    post: "solar:document-bold",
};

export default function TemplateManager() {
    const [templates, setTemplates] = useState<TemplateRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>("all");

    // ── Load: fetch active plugins → reregister hooks → sync to DB → fetch list ──
    useEffect(() => {
        (async () => {
            setLoading(true);

            // 1. Get active plugin nx IDs from DB
            const pluginRes = await fetch("/api/plugin", { cache: "no-store" });
            const pluginData: { nx: string; status: string }[] = await pluginRes.json();
            const activeNxIds = pluginData
                .filter((p) => p.status === "active")
                .map((p) => p.nx);

            // 2. Arm gate + re-register all hooks for active plugins
            reregisterHooks(activeNxIds);

            // 3. Collect root.pages hooks that have a type (templates)
            const rootPages = getHooks("root.pages").filter((p) => !!p.type);

            // 4. Sync discovered templates to DB (upsert)
            //    Pass `active` so the API can use it as a first-boot default hint
            await Promise.all(
                rootPages.map((p) =>
                    fetch("/api/template", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        cache: "no-store",
                        body: JSON.stringify({
                            type: p.type,
                            key: p.key,
                            label: p.label,
                            position: p.position,
                            pluginNx: p.pluginNx ?? "",
                            active: p.active === true,
                        }),
                    })
                )
            );

            // 5. Fetch the authoritative list from DB
            const listRes = await fetch("/api/template", { cache: "no-store" });
            const dbTemplates: TemplateRecord[] = await listRes.json();

            // 6. Sort and display only templates whose plugin is still active
            //    Core templates (CORE_NX) are always visible regardless of plugin status
            const CORE_NX = "com.system.core";
            const activePluginSet = new Set(activeNxIds);
            const visible = dbTemplates
                .filter((t) => t.pluginNx === CORE_NX || activePluginSet.has(t.pluginNx))
                .sort((a, b) => a.type.localeCompare(b.type) || a.position - b.position);

            setTemplates(visible);
            setLoading(false);
        })();
    }, []);

    const types = ["all", ...Array.from(new Set(templates.map((t) => t.type)))];
    const visible = activeTab === "all"
        ? templates
        : templates.filter((t) => t.type === activeTab);

    const handleSetDefault = async (tpl: TemplateRecord) => {
        setProcessing(tpl._id);

        await fetch("/api/template", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: tpl._id, type: tpl.type }),
        });

        // Reflect change locally
        setTemplates((prev) =>
            prev.map((t) =>
                t.type === tpl.type ? { ...t, isDefault: t._id === tpl._id } : t
            )
        );

        setProcessing(null);
    };

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
                                icon={tab === "all" ? "solar:widget-bold" : (TYPE_ICON[tab] ?? "solar:file-bold")}
                                width={15}
                            />
                            {tab}
                        </span>
                    </button>
                ))}
            </div>

            {/* Grid */}
            {visible.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <Icon icon="solar:layers-bold" width={48} className="mx-auto mb-3 opacity-40" />
                    <p>No templates registered for active plugins.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {visible.map((tpl) => {
                        const isBusy = processing === tpl._id;
                        const icon = TYPE_ICON[tpl.type] ?? "solar:file-bold";

                        return (
                            <div
                                key={tpl._id}
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
