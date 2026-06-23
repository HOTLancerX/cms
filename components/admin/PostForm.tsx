"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { FormHooks } from "@/hook";
import { getHooks } from "@/hook";
import { xFetch } from "@/lib/express";
import Gallery from "@/components/Gallery";
import Content from "@/components/Content";

export interface PostFormProps {
    /** Post type key, e.g. "blog", "page", "product" */
    type: string;
    /** Active plugin nx IDs — passed from the parent page */
    activePlugins: string[];
    /** When provided, the form loads this post for editing (edit mode) */
    postId?: string;
    /**
     * Optional seller/author user ID.
     * When set, it is stamped into post.userId and info.userId on every save
     * so the post can be filtered by owner later.
     */
    userId?: string;
    /**
     * Optional default status for new posts.
     * When set, overrides the built-in default ("published") for add mode only.
     * Edit mode always loads status from the saved post — this prop is ignored.
     * Typical values: "draft" | "published"
     */
    defaultStatus?: string;
    /** Called after a successful save with the saved post's _id */
    onSuccess?: (postId: string) => void;
}

export default function PostForm({ type, activePlugins, postId, userId, defaultStatus, onSuccess }: PostFormProps) {
    const router = useRouter();
    const isEdit = Boolean(postId);

    // ── Plugin-injected fields ──────────────────────────────────────────────
    const [fields, setFields] = useState<FormHooks>([]);

    useEffect(() => {
        setFields(getHooks("post.form", type));
    }, [type, activePlugins]);

    const leftFields  = fields.filter((f) => f.style === "left");
    const rightFields = fields.filter((f) => f.style === "right");

    // ── Core form state ─────────────────────────────────────────────────────
    const [title, setTitle]               = useState("");
    const [slug, setSlug]                 = useState("");
    const [status, setStatus]             = useState(defaultStatus ?? "published");
    const [category, setCategory]         = useState("");
    const [categoryPath, setCategoryPath] = useState<string[]>([]);
    const [info, setInfo]                 = useState<Record<string, string>>({});

    // Sync status when defaultStatus arrives asynchronously (add mode only).
    // Edit mode overwrites status from the loaded post — do not interfere.
    useEffect(() => {
        if (!isEdit && defaultStatus !== undefined) {
            setStatus(defaultStatus);
        }
    }, [defaultStatus, isEdit]);

    const [loading, setLoading]   = useState(isEdit);
    const [saving, setSaving]     = useState(false);
    const [message, setMessage]   = useState("");
    const [notFound, setNotFound] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // ── Slug availability check ─────────────────────────────────────────────
    const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
    const slugDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const originalSlug    = useRef<string>("");

    const checkSlug = useCallback((value: string) => {
        if (!value) { setSlugStatus("idle"); return; }
        if (isEdit && value === originalSlug.current) { setSlugStatus("idle"); return; }
        setSlugStatus("checking");
        if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current);
        slugDebounceRef.current = setTimeout(async () => {
            try {
                const params = new URLSearchParams({ slug: value });
                if (isEdit && postId) params.set("excludeId", postId);
                const res  = await xFetch(`/post?${params}`, { cache: "no-store" });
                const data = await res.json();
                setSlugStatus(data.available ? "available" : "taken");
            } catch {
                setSlugStatus("idle");
            }
        }, 400);
    }, [isEdit, postId]);

    // ── Load existing post (edit mode) ──────────────────────────────────────
    useEffect(() => {
        if (!postId) return;
        setLoading(true);
        xFetch(`/post?id=${postId}`, { cache: "no-store" })
            .then((r) => r.json())
            .then((data) => {
                if (!data.post) { setNotFound(true); return; }
                const p = data.post;
                setTitle(p.title ?? "");
                setSlug(p.slug ?? "");
                setStatus(p.status ?? "published");
                setCategory(p.category ?? "");
                setCategoryPath(p.category ? [p.category] : []);
                originalSlug.current = p.slug ?? "";

                const infoMap: Record<string, string> = {};
                (data.info ?? []).forEach((item: { name: string; value: string }) => {
                    infoMap[item.name] = item.value;
                });
                // Seed category so any registered category component renders the saved value
                if (p.category) infoMap["category"] = p.category;
                setInfo(infoMap);
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [postId]);

    /**
     * Central info change handler.
     *
     * The special key "category" is reserved for category picker components
     * (CategorySelect, CategoryHierarchicalSelect).
     *
     * CategorySelect emits a plain id string.
     * CategoryHierarchicalSelect emits JSON: { id, path }.
     * Both are handled here — core category + categoryPath stay in sync.
     */
    const handleInfoChange = (key: string, val: string) => {
        setInfo((prev) => ({ ...prev, [key]: val }));

        if (key === "category") {
            try {
                const parsed = JSON.parse(val);
                if (parsed && typeof parsed === "object" && "id" in parsed) {
                    setCategory(parsed.id);
                    setCategoryPath(parsed.path ?? []);
                    return;
                }
            } catch { /* not JSON — treat as plain id */ }
            setCategory(val);
            setCategoryPath(val ? [val] : []);
        }
    };

    const handleTitleChange = (val: string) => {
        setTitle(val);
        if (!isEdit) {
            const g = val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
            setSlug(g);
            checkSlug(g);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (slugStatus === "taken") return;
        setSaving(true);
        setMessage("");
        try {
            // Merge the optional userId into info so it's persisted as PostInfo
            // and can be used to filter posts by seller/author later.
            const mergedInfo = userId
                ? { ...info, userId }
                : info;

            const payload = {
                title, slug, status, type, info: mergedInfo,
                ...(userId ? { userId } : {}),
                ...(category ? { category } : {}),
                ...(isEdit ? { _id: postId } : {}),
            };
            const res  = await xFetch("/post", {
                method: isEdit ? "PUT" : "POST",
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                setMessage(`Error: ${data.error}`);
            } else {
                setMessage("Saved successfully!");
                if (!isEdit) {
                    setTitle(""); setSlug(""); setStatus(defaultStatus ?? "published");
                    setCategory(""); setCategoryPath([]); setInfo({});
                }
                onSuccess?.(data.post?._id ?? postId ?? "");
            }
        } catch {
            setMessage("Network error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!postId) return;
        if (!confirm("Delete this post? This cannot be undone.")) return;
        setDeleting(true);
        try {
            await xFetch(`/post?id=${postId}`, { method: "DELETE" });
            router.push(`/admin/posts/${type}`);
        } catch {
            setMessage("Delete failed");
            setDeleting(false);
        }
    };

    // ctx: ambient context passed to every field component — memoised to
    // prevent unnecessary re-renders of plugin-injected field components.
    const ctx = useMemo(
        () => ({ title, postId, type, categoryId: category, categoryPath }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [title, postId, type, category, categoryPath.join(",")]
    );

    // ── Uniform field renderer — no special cases ───────────────────────────
    const renderFields = (fieldList: FormHooks) =>
        fieldList.map((field) => {
            const { key, label, component: Component, options, hierarchicalCatType } = field;
            if (!Component) return null;
            return (
                <Component
                    key={`${key}-${field.position}`}
                    name={key}
                    label={label}
                    value={info[key] ?? ""}
                    onChange={(v: string) => handleInfoChange(key, v)}
                    options={options}
                    ctx={{
                        ...ctx,
                        // Forward catType so CategorySelect / CategoryHierarchicalSelect
                        // know which category type to fetch — no manual wiring needed
                        ...(hierarchicalCatType ? { catType: hierarchicalCatType } : {}),
                    }}
                />
            );
        });

    // ── Guards ──────────────────────────────────────────────────────────────
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
                <p className="text-lg font-medium">Post not found.</p>
            </div>
        );
    }

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <form onSubmit={handleSubmit}>
            {message && (
                <div className={`mb-5 rounded-lg px-4 py-3 text-sm font-medium border ${
                    message.startsWith("Error")
                        ? "bg-red-400/10 text-red-400 border-red-400/25"
                        : "bg-emerald-400/10 text-emerald-400 border-emerald-400/25"
                }`}>
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">

                {/* ── Left Column ── */}
                <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5 bg-white p-2 rounded">
                        <label htmlFor="title" className="text-xs font-semibold">Title</label>
                        <input
                            id="title" type="text" value={title} required
                            onChange={(e) => handleTitleChange(e.target.value)}
                            className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500"
                            placeholder="Enter title"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5 bg-white p-2 rounded">
                        <label htmlFor="slug" className="text-xs font-semibold">Slug</label>
                        <input
                            id="slug" type="text" value={slug} required
                            onChange={(e) => { setSlug(e.target.value); checkSlug(e.target.value); }}
                            className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition ${
                                slugStatus === "taken"      ? "border-red-400 focus:border-red-400"
                                : slugStatus === "available" ? "border-emerald-400 focus:border-emerald-400"
                                : "focus:border-indigo-500"
                            }`}
                            placeholder="auto-generated-slug"
                        />
                        {slugStatus === "checking"  && <p className="text-xs text-gray-400">Checking availability…</p>}
                        {slugStatus === "available" && <p className="text-xs text-emerald-500">✓ Slug is available</p>}
                        {slugStatus === "taken"     && <p className="text-xs text-red-500">✗ This slug is already taken</p>}
                    </div>

                    

                    {/* ── Default short description field ── */}
                    <div className="flex flex-col gap-1.5 bg-white p-2 rounded">
                        <label className="text-xs font-semibold">Short Description</label>
                        <textarea
                            value={info["shortDescription"] ?? ""}
                            onChange={(e) => handleInfoChange("shortDescription", e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 resize-none"
                            placeholder="Brief summary…"
                        />
                    </div>

                    {/* ── Default description (rich-text) field ── */}
                    <div className="bg-white p-2 rounded">
                        <Content
                            label="Description"
                            content={info["description"] ?? ""}
                            onChange={(v) => handleInfoChange("description", v)}
                            title={title}
                        />
                    </div>

                    {renderFields(leftFields)}
                </div>

                {/* ── Right Column ── */}
                <div className="flex flex-col gap-5">
                    {/* ── Draft/Published ─
                        Hidden in add mode when defaultStatus is provided (caller
                        controls the status via admin preference). Always shown in
                        edit mode so the user can see/change the current status. */}
                    {(defaultStatus === undefined) && (
                        <div className="flex flex-col gap-1.5 bg-white p-2 rounded">
                            <label htmlFor="status" className="text-xs font-semibold">Status</label>
                            <select
                                id="status" value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="appearance-none w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500"
                            >
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                            </select>
                        </div>
                    )}
                    
                    {/* ── Default image field ── */}
                    <div className="flex flex-col gap-1.5 bg-white p-2 rounded">
                        <label className="text-xs font-semibold">Image</label>
                        <Gallery
                            multiple={false}
                            value={info["image"] ?? ""}
                            onChange={(v) => handleInfoChange("image", typeof v === "string" ? v : v[0] ?? "")}
                            placeholder="Select featured image"
                        />
                    </div>

                    {/* ── Default gallery field ── */}
                    <div className="flex flex-col gap-1.5 bg-white p-2 rounded">
                        <label className="text-xs font-semibold">Gallery</label>
                        <Gallery
                            multiple={true}
                            value={(() => { try { return JSON.parse(info["gallery"] ?? "[]"); } catch { return []; } })()}
                            onChange={(v) => handleInfoChange("gallery", JSON.stringify(Array.isArray(v) ? v : [v]))}
                            placeholder="Select gallery images"
                        />
                    </div>

                    {renderFields(rightFields)}

                    <button
                        type="submit"
                        disabled={saving || slugStatus === "taken"}
                        className="p-2 w-full rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 hover:-translate-y-px active:translate-y-0 disabled:opacity-55 disabled:cursor-not-allowed"
                    >
                        {saving ? "Saving…" : isEdit ? "Save Changes" : "Publish"}
                    </button>

                    {isEdit && (
                        <button
                            type="button" onClick={handleDelete} disabled={deleting}
                            className="w-full rounded-lg bg-red-50 px-6 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-100 disabled:opacity-55 disabled:cursor-not-allowed"
                        >
                            {deleting ? "Deleting…" : "Delete Post"}
                        </button>
                    )}
                </div>

            </div>
        </form>
    );
}
