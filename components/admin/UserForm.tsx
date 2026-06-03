"use client";

/**
 * UserForm — dual-purpose component.
 *
 * mode="add"  → admin creates a new user (all fields, including type/status)
 * mode="edit" → existing user edits their own profile (restricted fields)
 *
 * Plugin fields are injected via addHook("User.form", [...], pluginNx)
 * and rendered in left/right columns exactly like post.form / cat.form.
 */

import { useState, useEffect } from "react";
import type { FormHooks } from "@/hook";
import { getHooks } from "@/hook";

export interface UserFormProps {
    /** "add" = admin creating a new user; "edit" = updating an existing user */
    mode: "add" | "edit";
    /** When true, role and status selectors are shown (admin-only fields) */
    showAdminFields?: boolean;
    /** Existing user data — required when mode="edit" */
    initialData?: {
        _id: string;
        name: string;
        slug: string;
        email: string;
        phone?: string;
        type: string;
        image?: string;
        status: string;
        address?: string;
        state?: string;
        city?: string;
        zipCode?: string;
        info?: Record<string, string>;
    };
    /** Active plugin nx IDs — passed from the server/parent page */
    activePlugins: string[];
    /** Called after a successful save */
    onSuccess?: (userId: string) => void;
}

export default function UserForm({ mode, initialData, activePlugins, onSuccess, showAdminFields }: UserFormProps) {
    // ── Plugin-injected fields ──────────────────────────────────────────────
    const [pluginFields, setPluginFields] = useState<FormHooks>([]);

    useEffect(() => {
        // activePlugins already re-registered by useActivePlugins in the parent page.
        // Just read the current hook state.
        setPluginFields(getHooks("User.form"));
    }, [activePlugins]);

    const leftPluginFields = pluginFields.filter((f) => f.style === "left");
    const rightPluginFields = pluginFields.filter((f) => f.style === "right");

    // ── Core form state ─────────────────────────────────────────────────────
    const [name, setName] = useState(initialData?.name ?? "");
    const [slug, setSlug] = useState(initialData?.slug ?? "");
    const [email, setEmail] = useState(initialData?.email ?? "");
    const [phone, setPhone] = useState(initialData?.phone ?? "");
    const [password, setPassword] = useState("");
    const [type, setType] = useState(initialData?.type ?? "user");
    const [image, setImage] = useState(initialData?.image ?? "");
    const [status, setStatus] = useState(initialData?.status ?? "active");
    const [address, setAddress] = useState(initialData?.address ?? "");
    const [state, setState] = useState(initialData?.state ?? "");
    const [city, setCity] = useState(initialData?.city ?? "");
    const [zipCode, setZipCode] = useState(initialData?.zipCode ?? "");
    const [info, setInfo] = useState<Record<string, string>>(initialData?.info ?? {});

    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    const handleInfoChange = (key: string, value: string) => {
        setInfo((prev) => ({ ...prev, [key]: value }));
    };

    const handleNameChange = (val: string) => {
        setName(val);
        if (mode === "add") {
            setSlug(
                val
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)/g, "")
            );
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        setMessage("");

        const payload: Record<string, unknown> = {
            name, slug, email, phone, type, image, status,
            address, state, city, zipCode, info,
        };

        // Only include password when it has a value
        if (password) payload.password = password;

        try {
            let res: Response;

            if (mode === "add") {
                res = await fetch("/api/user", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            } else {
                res = await fetch("/api/user", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: initialData!._id, ...payload }),
                });
            }

            const data = await res.json();

            if (!res.ok) {
                setMessage(`Error: ${data.error}`);
            } else {
                setMessage("Saved successfully!");
                if (mode === "add") {
                    // Reset form
                    setName(""); setSlug(""); setEmail(""); setPhone("");
                    setPassword(""); setType("user"); setImage("");
                    setStatus("active"); setAddress(""); setState("");
                    setCity(""); setZipCode(""); setInfo({});
                }
                onSuccess?.(data.user?._id ?? initialData?._id ?? "");
            }
        } catch {
            setMessage("Network error");
        } finally {
            setSaving(false);
        }
    };

    const renderPluginFields = (fieldList: FormHooks) =>
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

    const inputCls =
        "w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500";
    const labelCls = "text-xs font-semibold";

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
                    {/* Name */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="name" className={labelCls}>Full Name</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            className={inputCls}
                            placeholder="John Doe"
                            required
                        />
                    </div>

                    {/* Slug — only editable by admin (add or showAdminFields) */}
                    {(mode === "add" || showAdminFields) && (
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="slug" className={labelCls}>Slug</label>
                            <input
                                id="slug"
                                type="text"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                className={inputCls}
                                placeholder="auto-generated-slug"
                                required
                            />
                        </div>
                    )}

                    {/* Email */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="email" className={labelCls}>Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={inputCls}
                            placeholder="john@example.com"
                            required
                        />
                    </div>

                    {/* Phone */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="phone" className={labelCls}>Phone</label>
                        <input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className={inputCls}
                            placeholder="+1 555 000 0000"
                        />
                    </div>

                    {/* Password */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="password" className={labelCls}>
                            {mode === "add" ? "Password" : "New Password (leave blank to keep current)"}
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={inputCls}
                            placeholder={mode === "add" ? "••••••••" : "Leave blank to keep current"}
                            required={mode === "add"}
                            autoComplete="new-password"
                        />
                    </div>

                    {/* Profile image URL */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="image" className={labelCls}>Profile Image URL</label>
                        <input
                            id="image"
                            type="url"
                            value={image}
                            onChange={(e) => setImage(e.target.value)}
                            className={inputCls}
                            placeholder="https://example.com/avatar.jpg"
                        />
                    </div>

                    {/* Address block */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="address" className={labelCls}>Address</label>
                        <input
                            id="address"
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className={inputCls}
                            placeholder="123 Main St"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="city" className={labelCls}>City</label>
                            <input
                                id="city"
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className={inputCls}
                                placeholder="New York"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="state" className={labelCls}>State</label>
                            <input
                                id="state"
                                type="text"
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                                className={inputCls}
                                placeholder="NY"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="zipCode" className={labelCls}>Zip Code</label>
                        <input
                            id="zipCode"
                            type="text"
                            value={zipCode}
                            onChange={(e) => setZipCode(e.target.value)}
                            className={inputCls}
                            placeholder="10001"
                        />
                    </div>

                    {/* Plugin-injected left fields */}
                    {renderPluginFields(leftPluginFields)}
                </div>

                {/* ── Right Column ── */}
                <div className="flex flex-col gap-5">
                    {/* Role — admin only */}
                    {(mode === "add" || showAdminFields) && (
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="type" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Role
                            </label>
                            <select
                                id="type"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className={`appearance-none ${inputCls}`}
                            >
                                <option value="user">User</option>
                                <option value="reporter">Reporter</option>
                                <option value="editor">Editor</option>
                                <option value="seller">Seller</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    )}

                    {/* Status — admin only */}
                    {(mode === "add" || showAdminFields) && (
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="status" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Status
                            </label>
                            <select
                                id="status"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className={`appearance-none ${inputCls}`}
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div>
                    )}

                    {/* Plugin-injected right fields */}
                    {renderPluginFields(rightPluginFields)}

                    <button
                        type="submit"
                        disabled={saving}
                        className="mt-2 w-full rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 hover:-translate-y-px active:translate-y-0 disabled:opacity-55 disabled:cursor-not-allowed"
                    >
                        {saving ? "Saving…" : mode === "add" ? "Create User" : "Save Changes"}
                    </button>
                </div>
            </div>
        </form>
    );
}
