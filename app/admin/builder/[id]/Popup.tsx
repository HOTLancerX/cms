"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";

const KNOWN_TYPES = ["header", "footer", "page", "post", "cat"];

const TYPE_ICON: Record<string, string> = {
    header: "solar:sidebar-minimalistic-bold",
    footer: "solar:list-bold",
    page: "solar:file-bold",
    post: "solar:document-bold",
    cat: "solar:folder-bold",
};

interface Props {
    open: boolean;
    title: string;
    templateType: string | null;
    onClose: () => void;
    onSave: (data: { title: string; templateType: string | null }) => Promise<void>;
}

export default function BuilderSettingsPopup({ open, title, templateType, onClose, onSave }: Props) {
    const [localTitle, setLocalTitle] = useState(title);
    const [localType, setLocalType] = useState<string>(templateType ?? "");
    const [availableTypes, setAvailableTypes] = useState<string[]>(KNOWN_TYPES);
    const [saving, setSaving] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Sync props → local state whenever the popup opens
    useEffect(() => {
        if (open) {
            setLocalTitle(title);
            setLocalType(templateType ?? "");
        }
    }, [open, title, templateType]);

    // Load extra types from the template registry
    useEffect(() => {
        if (!open) return;
        import("@/lib/express").then(({ xFetch }) => {
            xFetch("/template", { cache: "no-store" })
                .then((r) => r.json())
                .then((records: { type: string }[]) => {
                    if (Array.isArray(records)) {
                        const fromDb = records.map((r) => r.type).filter(Boolean);
                        const merged = Array.from(new Set([...KNOWN_TYPES, ...fromDb])).sort();
                        setAvailableTypes(merged);
                    }
                })
                .catch(() => {});
        });
    }, [open]);

    // Close on backdrop click
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
            onClose();
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave({
                title: localTitle.trim() || title,
                templateType: localType || null,
            });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            {/* Backdrop — only covers the canvas, not the left panel */}
            <div
                className={`fixed inset-0 z-1050 transition-opacity duration-200 ${
                    open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
                onClick={handleBackdropClick}
            />

            {/* Slide-in panel from the right */}
            <div
                ref={panelRef}
                className={`fixed top-0 right-0 h-full z-1051 w-80 bg-white shadow-2xl flex flex-col transition-transform duration-250 ease-in-out ${
                    open ? "translate-x-0" : "translate-x-full"
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 shrink-0">
                    <div className="flex items-center gap-2">
                        <Icon icon="solar:settings-bold" width={16} className="text-neutral-500" />
                        <span className="text-sm font-semibold text-neutral-800">Page Settings</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex items-center justify-center w-7 h-7 rounded hover:bg-neutral-100 cursor-pointer border-none bg-transparent"
                    >
                        <Icon icon="mdi:close" width={18} className="text-neutral-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                            Title
                        </label>
                        <input
                            type="text"
                            value={localTitle}
                            onChange={(e) => setLocalTitle(e.target.value)}
                            placeholder="Page title"
                            className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm outline-none focus:border-blue-400 transition-colors"
                        />
                    </div>

                    {/* Template Type */}
                    <div>
                        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
                            Template Type
                        </label>
                        <p className="text-xs text-neutral-400 mb-3 leading-relaxed">
                            Register this page as a layout template. Once set, it will appear in the
                            Template Manager where you can mark it as the site default.
                        </p>

                        {/* None option */}
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setLocalType("")}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                                    localType === ""
                                        ? "border-blue-400 bg-blue-50 text-blue-600 font-semibold"
                                        : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                                }`}
                            >
                                <Icon icon="solar:close-circle-linear" width={13} />
                                None
                            </button>

                            {availableTypes.map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setLocalType(type)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs capitalize transition-colors ${
                                        localType === type
                                            ? "border-indigo-400 bg-indigo-50 text-indigo-600 font-semibold"
                                            : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                                    }`}
                                >
                                    <Icon
                                        icon={TYPE_ICON[type] ?? "solar:file-bold"}
                                        width={13}
                                    />
                                    {type}
                                </button>
                            ))}
                        </div>

                        {/* Active type info */}
                        {localType && (
                            <div className="mt-3 flex items-start gap-2 p-3 bg-indigo-50 rounded-lg">
                                <Icon
                                    icon="solar:info-circle-bold"
                                    width={14}
                                    className="text-indigo-500 mt-0.5 shrink-0"
                                />
                                <p className="text-xs text-indigo-600 leading-relaxed">
                                    Listed under{" "}
                                    <span className="font-semibold capitalize">{localType}</span> in
                                    the Template Manager. Go there to set it as the default layout.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="shrink-0 flex items-center justify-end gap-2 px-4 py-3 border-t border-neutral-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg cursor-pointer border-none"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className={`px-4 py-2 text-xs font-medium text-white rounded-lg border-none cursor-pointer ${
                            saving
                                ? "bg-neutral-400 cursor-not-allowed"
                                : "bg-blue-500 hover:bg-blue-600"
                        }`}
                    >
                        {saving ? (
                            <span className="flex items-center gap-1.5">
                                <Icon icon="svg-spinners:ring-resize" width={12} />
                                Saving…
                            </span>
                        ) : (
                            "Save"
                        )}
                    </button>
                </div>
            </div>
        </>
    );
}
