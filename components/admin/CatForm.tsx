"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { FormHooks } from "@/hook";
import { getHooks } from "@/hook";
import { xFetch } from "@/lib/express";

export interface CatFormProps {
    /** Category type key, e.g. "blog-category", "product-category" */
    type: string;
    /** Active plugin nx IDs — passed from the parent page */
    activePlugins: string[];
    /** When provided, the form loads this category for editing (edit mode) */
    catId?: string;
    /** Called after a successful save with the saved category's _id */
    onSuccess?: (catId: string) => void;
}

export default function CatForm({ type, activePlugins, catId, onSuccess }: CatFormProps) {
    const router = useRouter();
    const isEdit = Boolean(catId);

    // ── Plugin-injected fields ──────────────────────────────────────────────
    const [fields, setFields] = useState<FormHooks>([]);

    useEffect(() => {
        setFields(getHooks("cat.form", type));
    }, [type, activePlugins]);

    const leftFields = fields.filter((f) => f.style === "left");
    const rightFields = fields.filter((f) => f.style === "right");

    // ── Core form state ─────────────────────────────────────────────────────
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [status, setStatus] = useState("published");
    const [info, setInfo] = useState<Record<string, string>>({});

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [notFound, setNotFound] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // ── Slug availability check ─────────────────────────────────────────────
    const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
    const slugDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const originalSlug = useRef<string>("");

    const checkSlug = useCallback((value: string) => {
        if (!value) { setSlugStatus("idle"); return; }
        if (isEdit && value === originalSlug.current) { setSlugStatus("idle"); return; }
        setSlugStatus("checking");
        if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current);
        slugDebounceRef.current = setTimeout(async () => {
            try {
                const params = new URLSearchParams({ slug: value });
                if (isEdit && catId) params.set("excludeId", catId);
                const res = await xFetch(`/cat?${params}`, { cache: "no-store" });
                const data = await res.json();
                setSlugStatus(data.available ? "available" : "taken");
            } catch {
                setSlugStatus("idle");
            }
        }, 400);
    }, [isEdit, catId]);

    // ── Load existing category when in edit mode ────────────────────────────
    useEffect(() => {
        if (!catId) return;

        setLoading(true);
        xFetch(`/cat?id=${catId}`, { cache: "no-store" })
            .then((r) => r.json())
            .then((data) => {
                if (!data.cat) {
                    setNotFound(true);
                    return;
                }
                const c = data.cat;
                setTitle(c.title ?? "");
                setSlug(c.slug ?? "");
                setStatus(c.status ?? "published");
                originalSlug.current = c.slug ?? "";

                const infoMap: Record<string, string> = {};
                (data.info ?? []).forEach((item: { name: string; value: string }) => {
                    infoMap[item.name] = item.value;
                });
                setInfo(infoMap);
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [catId]);

    const handleInfoChange = (key: string, value: string) => {
        setInfo((prev) => ({ ...prev, [key]: value }));
    };

    const handleTitleChange = (val: string) => {
        setTitle(val);
        if (!isEdit) {
            const generated = val
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");
            setSlug(generated);
            checkSlug(generated);
        }
    };

    const handleSlugChange = (val: string) => {
        setSlug(val);
        checkSlug(val);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (slugStatus === "taken") return; // hard block
        setSaving(true);
        setMessage("");

        try {
            const payload = { title, slug, status, type, info, ...(isEdit ? { _id: catId } : {}) };

            const res = await xFetch("/cat", {
                method: isEdit ? "PUT" : "POST",
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (!res.ok) {
                setMessage(`Error: ${data.error}`);
            } else {
                setMessage("Saved successfully!");
                if (!isEdit) {
                    setTitle("");
                    setSlug("");
                    setStatus("published");
                    setInfo({});
                }
                onSuccess?.(data.cat?._id ?? catId ?? "");
            }
        } catch {
            setMessage("Network error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!catId) return;
        if (!confirm("Delete this category? This cannot be undone.")) return;
        setDeleting(true);
        try {
            await xFetch(`/cat?id=${catId}`, { method: "DELETE" });
            router.push(`/admin/category/${type}`);
        } catch {
            setMessage("Delete failed");
            setDeleting(false);
        }
    };

    const renderFields = (fieldList: FormHooks) =>
        fieldList.map((field) => {
            const Component = field.component;
            if (!Component) return null;
            return (
                <Component
                    key={`${field.key}-${field.position}`}
                    name={field.key}
                    label={field.label}
                    value={info[field.key] || ""}
                    onChange={(v: string) => handleInfoChange(field.key, v)}
                    options={field.options}
                />
            );
        });

    // ── Loading state ───────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center py-24 text-gray-400">
                <svg className="animate-spin w-8 h-8" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="text-center py-24 text-gray-400">
                <p className="text-lg font-medium">Category not found.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit}>
            {message && (
                <div
                    className={`mb-5 rounded-lg px-4 py-3 text-sm font-medium border ${message.startsWith("Error")
                        ? "bg-red-400/10 text-red-400 border-red-400/25"
                        : "bg-emerald-400/10 text-emerald-400 border-emerald-400/25"
                        }`}
                >
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
                {/* ── Left Column ── */}
                <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="cat-title" className="text-xs font-semibold">
                            Title
                        </label>
                        <input
                            id="cat-title"
                            type="text"
                            value={title}
                            onChange={(e) => handleTitleChange(e.target.value)}
                            className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500"
                            placeholder="Enter title"
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="cat-slug" className="text-xs font-semibold">
                            Slug
                        </label>
                        <input
                            id="cat-slug"
                            type="text"
                            value={slug}
                            onChange={(e) => handleSlugChange(e.target.value)}
                            className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition ${slugStatus === "taken"
                                ? "border-red-400 focus:border-red-400"
                                : slugStatus === "available"
                                    ? "border-emerald-400 focus:border-emerald-400"
                                    : "focus:border-indigo-500"
                                }`}
                            placeholder="auto-generated-slug"
                            required
                        />
                        {slugStatus === "checking" && (
                            <p className="text-xs text-gray-400">Checking availability…</p>
                        )}
                        {slugStatus === "available" && (
                            <p className="text-xs text-emerald-500">✓ Slug is available</p>
                        )}
                        {slugStatus === "taken" && (
                            <p className="text-xs text-red-500">✗ This slug is already taken</p>
                        )}
                    </div>

                    {renderFields(leftFields)}
                </div>

                {/* ── Right Column ── */}
                <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="cat-status" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Status
                        </label>
                        <select
                            id="cat-status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="appearance-none w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500"
                        >
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                        </select>
                    </div>

                    {renderFields(rightFields)}

                    <button
                        type="submit"
                        disabled={saving || slugStatus === "taken"}
                        className="mt-2 w-full rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 hover:-translate-y-px active:translate-y-0 disabled:opacity-55 disabled:cursor-not-allowed"
                    >
                        {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Category"}
                    </button>

                    {isEdit && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="w-full rounded-lg bg-red-50 px-6 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-100 disabled:opacity-55 disabled:cursor-not-allowed"
                        >
                            {deleting ? "Deleting…" : "Delete Category"}
                        </button>
                    )}
                </div>
            </div>
        </form>
    );
}
