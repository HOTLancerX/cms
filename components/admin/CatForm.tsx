"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { FormHooks } from "@/hook";
import { getHooks } from "@/hook";
import { xFetch } from "@/lib/express";
import { useToast } from "@/components/ui/Toast";
import Gallery from "@/components/Gallery";
import Content from "@/components/Content";
import CategorySpecification, { type SpecificationBox } from "@/components/admin/CategorySpecification";

export interface CatFormProps {
    type: string;
    activePlugins: string[];
    catId?: string;
    onSuccess?: (catId: string) => void;
}

export default function CatForm({ type, activePlugins, catId, onSuccess }: CatFormProps) {
    const router = useRouter();
    const toast = useToast();
    const isEdit = Boolean(catId);

    // ── Hook fields ─────────────────────────────────────────────────────────
    const [fields, setFields] = useState<FormHooks>([]);
    useEffect(() => { setFields(getHooks("cat.form", type)); }, [type, activePlugins]);

    const leftFields = fields.filter((f) => f.style === "left");
    const rightFields = fields.filter((f) => f.style === "right");

    // ── Core state (only truly fixed fields: title / slug / status / parentId) ──
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [status, setStatus] = useState("published");
    const [parentId, setParentId] = useState("");

    // ── Dynamic info store — every plugin/hook field lives here ─────────────
    // Plain strings for text-like fields.
    // JSON strings for gallery-multiple and specification fields.
    // JSON strings for linked-cats selections.
    const [info, setInfo] = useState<Record<string, string>>({});

    // ── Linked-cat options cache keyed by linkedCatType ─────────────────────
    const [linkedCatOptions, setLinkedCatOptions] = useState<
        Record<string, { _id: string; title: string; parentId: string | null }[]>
    >({});

    // ── Parent picker ────────────────────────────────────────────────────────
    const [parents, setParents] = useState<
        { _id: string; title: string; parentId: string | null }[]
    >([]);

    // ── UI state ─────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true); // true until BOTH parents + edit data are ready
    const [saving, setSaving] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // ── Slug check ───────────────────────────────────────────────────────────
    const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
    const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const originalSlug = useRef("");

    const checkSlug = useCallback((value: string) => {
        if (!value) { setSlugStatus("idle"); return; }
        if (isEdit && value === originalSlug.current) { setSlugStatus("idle"); return; }
        setSlugStatus("checking");
        if (slugTimer.current) clearTimeout(slugTimer.current);
        slugTimer.current = setTimeout(async () => {
            try {
                const p = new URLSearchParams({ slug: value });
                if (isEdit && catId) p.set("excludeId", catId);
                const res = await xFetch(`/cat?${p}`, { cache: "no-store" });
                const data = await res.json();
                setSlugStatus(data.available ? "available" : "taken");
            } catch { setSlugStatus("idle"); }
        }, 400);
    }, [isEdit, catId]);

    // ── Load: parents list + edit data together ──────────────────────────────
    // Promise.all guarantees both fetches are done before the form renders,
    // so the parent <select> always has its options ready when parentId is set.
    useEffect(() => {
        setLoading(true);

        const fetchParents = xFetch(`/cat?type=${encodeURIComponent(type)}`, { cache: "no-store" })
            .then(r => r.json())
            .then(d => setParents(d.cats ?? []))
            .catch(() => {});

        const fetchEdit = catId
            ? xFetch(`/cat?id=${catId}`, { cache: "no-store" })
                .then(r => r.json())
                .then(data => {
                    if (!data.cat) { setNotFound(true); return; }
                    const c = data.cat;
                    setTitle(c.title ?? "");
                    setSlug(c.slug ?? "");
                    setStatus(c.status ?? "published");
                    setParentId(c.parentId ?? "");
                    originalSlug.current = c.slug ?? "";
                    const map: Record<string, string> = {};
                    (data.info ?? []).forEach((item: { name: string; value: string }) => {
                        map[item.name] = item.value;
                    });
                    setInfo(map);
                })
                .catch(() => setNotFound(true))
            : Promise.resolve();

        Promise.all([fetchParents, fetchEdit]).finally(() => setLoading(false));
    }, [type, catId]);

    // ── Fetch linked-cat options for any linked-cats field ───────────────────
    useEffect(() => {
        const linkedFields = fields.filter(f => f.fieldType === "linked-cats" && f.linkedCatType);
        const needed = [...new Set(linkedFields.map(f => f.linkedCatType!))];
        needed.forEach(catType => {
            if (linkedCatOptions[catType]) return; // already fetched
            xFetch(`/cat?type=${encodeURIComponent(catType)}`, { cache: "no-store" })
                .then(r => r.json())
                .then(d => setLinkedCatOptions(prev => ({ ...prev, [catType]: d.cats ?? [] })))
                .catch(() => { });
        });
    }, [fields]);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const setInfoKey = (key: string, value: string) =>
        setInfo(prev => ({ ...prev, [key]: value }));

    const handleTitleChange = (val: string) => {
        setTitle(val);
        if (!isEdit) {
            const g = val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
            setSlug(g); checkSlug(g);
        }
    };

    // ── Submit ───────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (slugStatus === "taken") return;
        setSaving(true);
        const payload = {
            title, slug, status, type,
            parentId: parentId || null,
            info,
            ...(isEdit ? { _id: catId } : {}),
        };
        try {
            const res = await xFetch("/cat", {
                method: isEdit ? "PUT" : "POST",
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(`${res.status}: ${data.error ?? data.message ?? "Failed to save"}`);
            } else {
                toast.success(isEdit ? "Category updated!" : "Category created!");
                if (!isEdit) {
                    setTitle(""); setSlug(""); setStatus("published");
                    setParentId(""); setInfo({});
                }
                onSuccess?.(data.cat?._id ?? catId ?? "");
            }
        } catch { toast.error("Network error — please try again"); }
        finally { setSaving(false); }
    };

    // ── Delete ───────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!catId || !confirm("Delete this category? This cannot be undone.")) return;
        setDeleting(true);
        try {
            await xFetch(`/cat?id=${catId}`, { method: "DELETE" });
            toast.success("Category deleted");
            router.push(`/admin/category/${type}`);
        } catch { toast.error("Delete failed"); setDeleting(false); }
    };

    // ── Tree helpers ─────────────────────────────────────────────────────────
    const buildTreeOptions = (
        items: { _id: string; title: string; parentId: string | null }[],
        pid: string | null = null, depth = 0
    ): React.ReactElement[] =>
        items
            .filter(i => (i.parentId ?? null) === pid && i._id !== catId)
            .flatMap(i => [
                <option key={i._id} value={i._id}>
                    {depth === 0 ? i.title : `${"— ".repeat(depth)}${i.title}`}
                </option>,
                ...buildTreeOptions(items, i._id, depth + 1),
            ]);

    const buildFlatTree = (
        items: { _id: string; title: string; parentId: string | null }[],
        pid: string | null = null, depth = 0
    ): { id: string; title: string; depth: number }[] =>
        items
            .filter(i => (i.parentId ?? null) === pid)
            .flatMap(i => [
                { id: i._id, title: i.title, depth },
                ...buildFlatTree(items, i._id, depth + 1),
            ]);

    // ── Universal field renderer ─────────────────────────────────────────────
    const renderField = (field: FormHooks[number]) => {
        const { key, label, fieldType, component: Component, options, linkedCatType } = field;

        // ── rich-text content editor ──
        if (fieldType === "content") {
            return (
                <Content
                    key={key}
                    content={info[key] ?? ""}
                    onChange={v => setInfoKey(key, v)}
                    label={label}
                    title={title}
                />
            );
        }

        // ── single Gallery picker ──
        if (fieldType === "gallery") {
            return (
                <div key={key} className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold">{label}</label>
                    <Gallery
                        value={info[key] ?? ""}
                        onChange={v => setInfoKey(key, Array.isArray(v) ? v[0] ?? "" : v)}
                        placeholder={`Select ${label}`}
                    />
                </div>
            );
        }

        // ── multi Gallery picker — stored as JSON array string ──
        if (fieldType === "gallery-multiple") {
            let arr: string[] = [];
            try { arr = JSON.parse(info[key] ?? "[]"); } catch { arr = []; }
            return (
                <div key={key} className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold">{label}</label>
                    <Gallery
                        multiple
                        value={arr}
                        onChange={v => setInfoKey(key, JSON.stringify(Array.isArray(v) ? v : [v]))}
                    />
                </div>
            );
        }

        // ── linked-cats multi-select checkbox list ──
        if (fieldType === "linked-cats" && linkedCatType) {
            const opts = linkedCatOptions[linkedCatType] ?? [];
            const flat = buildFlatTree(opts);
            let selected: string[] = [];
            try { selected = JSON.parse(info[key] ?? "[]"); } catch { selected = []; }
            const toggle = (id: string) => {
                const next = selected.includes(id)
                    ? selected.filter(x => x !== id)
                    : [...selected, id];
                setInfoKey(key, JSON.stringify(next));
            };
            return (
                <div key={key} className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold">
                        {label}
                        <span className="ml-2 text-xs font-normal text-gray-400">
                            (Select parent — children are auto-included)
                        </span>
                    </label>
                    <div className="border rounded-lg bg-white max-h-56 overflow-y-auto divide-y">
                        {flat.map(({ id, title: t, depth }) => {
                            const checked = selected.includes(id);
                            return (
                                <label
                                    key={id}
                                    className={`flex items-center gap-3 py-2 cursor-pointer hover:bg-indigo-50 transition-colors ${checked ? "bg-indigo-50" : ""}`}
                                    style={{ paddingLeft: `${depth * 20 + 12}px`, paddingRight: "12px" }}
                                >
                                    <input type="checkbox" checked={checked} onChange={() => toggle(id)} className="rounded" />
                                    <span className={`text-sm ${depth === 0 ? "font-semibold" : "text-gray-600"}`}>
                                        {depth > 0 && <span className="text-gray-300 mr-1">{"└ ".repeat(depth)}</span>}
                                        {t}
                                    </span>
                                </label>
                            );
                        })}
                        {flat.length === 0 && (
                            <p className="px-4 py-3 text-sm text-gray-400">No {linkedCatType} entries yet.</p>
                        )}
                    </div>
                    {selected.length > 0 && (
                        <p className="text-xs text-indigo-500">
                            {selected.length} categor{selected.length === 1 ? "y" : "ies"} selected
                        </p>
                    )}
                </div>
            );
        }

        // ── specification box builder — stored as JSON array string ──
        if (fieldType === "specification") {
            let specs: SpecificationBox[] = [];
            try { specs = JSON.parse(info[key] ?? "[]"); } catch { specs = []; }
            return (
                <div key={key} className="border-t pt-5">
                    <CategorySpecification
                        specifications={specs}
                        onChange={v => setInfoKey(key, JSON.stringify(v))}
                    />
                </div>
            );
        }

        // ── standard component (Text, Textarea, Select, Switch, Tags, …) ──
        if (Component) {
            return (
                <Component
                    key={`${key}-${field.position}`}
                    name={key}
                    label={label}
                    value={info[key] ?? ""}
                    onChange={(v: string) => setInfoKey(key, v)}
                    options={options}
                />
            );
        }

        return null;
    };

    // ── Guards ───────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="flex items-center justify-center py-24 text-gray-400">
            <svg className="animate-spin w-8 h-8" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
        </div>
    );

    if (notFound) return (
        <div className="text-center py-24 text-gray-400">
            <p className="text-lg font-medium">Category not found.</p>
        </div>
    );

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">

                {/* ── Left column ── */}
                <div className="flex flex-col gap-5">

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="cat-title" className="text-xs font-semibold">Title</label>
                        <input
                            id="cat-title" type="text" value={title} required
                            onChange={e => handleTitleChange(e.target.value)}
                            placeholder="Enter title"
                            className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="cat-slug" className="text-xs font-semibold">Slug</label>
                        <input
                            id="cat-slug" type="text" value={slug} required
                            onChange={e => { setSlug(e.target.value); checkSlug(e.target.value); }}
                            placeholder="auto-generated-slug"
                            className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition ${slugStatus === "taken" ? "border-red-400 focus:border-red-400"
                                    : slugStatus === "available" ? "border-emerald-400 focus:border-emerald-400"
                                        : "focus:border-indigo-500"
                                }`}
                        />
                        {slugStatus === "checking" && <p className="text-xs text-gray-400">Checking…</p>}
                        {slugStatus === "available" && <p className="text-xs text-emerald-500">✓ Available</p>}
                        {slugStatus === "taken" && <p className="text-xs text-red-500">✗ Already taken</p>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="cat-parent" className="text-xs font-semibold">Parent Category</label>
                        {/* Both parents and edit data are loaded before the form renders
                            (Promise.all in useEffect above), so the select is always safe. */}
                        <select
                            id="cat-parent" value={parentId} onChange={e => setParentId(e.target.value)}
                            className="appearance-none w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500"
                        >
                            <option value="">None (Top Level)</option>
                            {buildTreeOptions(parents)}
                        </select>
                    </div>

                    {leftFields.map(renderField)}
                </div>

                {/* ── Right column ── */}
                <div className="flex flex-col gap-5">

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="cat-status" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</label>
                        <select
                            id="cat-status" value={status} onChange={e => setStatus(e.target.value)}
                            className="appearance-none w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500"
                        >
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                        </select>
                    </div>

                    <button
                        type="submit" disabled={saving || slugStatus === "taken"}
                        className="w-full rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 hover:-translate-y-px active:translate-y-0 disabled:opacity-55 disabled:cursor-not-allowed"
                    >
                        {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Category"}
                    </button>

                    {isEdit && (
                        <button
                            type="button" onClick={handleDelete} disabled={deleting}
                            className="w-full rounded-lg bg-red-50 px-6 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-100 disabled:opacity-55 disabled:cursor-not-allowed"
                        >
                            {deleting ? "Deleting…" : "Delete Category"}
                        </button>
                    )}

                    {rightFields.map(renderField)}
                </div>
            </div>
        </form>
    );
}
