"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { xFetch } from "@/lib/express";

// Well-known template types that a builder page can register as.
// Loaded dynamically from the template API + these fallback defaults.
const KNOWN_TYPES = ["header", "footer", "page", "post", "cat"];

const TYPE_ICON: Record<string, string> = {
    header: "solar:sidebar-minimalistic-bold",
    footer: "solar:list-bold",
    page: "solar:file-bold",
    post: "solar:document-bold",
    cat: "solar:folder-bold",
};

export default function BuilderAddPage() {
    const [title, setTitle] = useState("");
    const [templateType, setTemplateType] = useState<string>("");
    const [availableTypes, setAvailableTypes] = useState<string[]>(KNOWN_TYPES);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Load available template types from the registry
    useEffect(() => {
        xFetch("/template", { cache: "no-store" })
            .then((r) => r.json())
            .then((records: { type: string }[]) => {
                if (Array.isArray(records)) {
                    const fromDb = records.map((r) => r.type).filter(Boolean);
                    const merged = Array.from(new Set([...KNOWN_TYPES, ...fromDb])).sort();
                    setAvailableTypes(merged);
                }
            })
            .catch(() => {
                // fallback to KNOWN_TYPES already set
            });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setLoading(true);
        try {
            const body: Record<string, unknown> = { title: title.trim() };
            if (templateType) body.templateType = templateType;

            const res = await xFetch("/builder", {
                method: "POST",
                body: JSON.stringify(body),
            });
            const doc = await res.json();
            if (doc._id) {
                router.push(`/admin/builder/${doc._id}`);
            }
        } catch {
            setLoading(false);
        }
    };

    return (
        <div className="">
            <h1 className="text-xl font-bold mb-5">Create Builder Page</h1>
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        Page Title
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter page title"
                        autoFocus
                        className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-sm outline-none focus:border-blue-400"
                    />
                </div>

                {/* Template Type — optional */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        Template Type
                        <span className="ml-1.5 text-xs font-normal text-neutral-400">
                            (optional — register this page as a layout template)
                        </span>
                    </label>

                    {/* Unset / None option */}
                    <div className="flex flex-wrap gap-2 mb-2">
                        <button
                            type="button"
                            onClick={() => setTemplateType("")}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition ${
                                templateType === ""
                                    ? "border-blue-400 bg-blue-50 text-blue-600 font-medium"
                                    : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                            }`}
                        >
                            <Icon icon="solar:close-circle-linear" width={14} />
                            None
                        </button>

                        {availableTypes.map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setTemplateType(type)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm capitalize transition ${
                                    templateType === type
                                        ? "border-indigo-400 bg-indigo-50 text-indigo-600 font-medium"
                                        : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                                }`}
                            >
                                <Icon
                                    icon={TYPE_ICON[type] ?? "solar:file-bold"}
                                    width={14}
                                />
                                {type}
                            </button>
                        ))}
                    </div>

                    {/* Contextual hint when a type is selected */}
                    {templateType && (
                        <p className="text-xs text-indigo-500 flex items-center gap-1.5 mt-1">
                            <Icon icon="solar:info-circle-bold" width={13} />
                            This builder page will appear in the Template Manager under{" "}
                            <span className="font-semibold capitalize">{templateType}</span> and can
                            be set as the default layout.
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={loading || !title.trim()}
                    className={`px-6 py-2.5 text-sm font-medium text-white rounded-lg border-none cursor-pointer ${
                        loading || !title.trim()
                            ? "bg-neutral-400 cursor-not-allowed"
                            : "bg-blue-500 hover:bg-blue-600"
                    }`}
                >
                    {loading ? "Creating..." : "Create & Edit"}
                </button>
            </form>
        </div>
    );
}
