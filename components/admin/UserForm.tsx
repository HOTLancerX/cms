"use client";

/**
 * UserForm — dual-purpose component.
 *
 * mode="add"  → admin creates a new user (all fields, including type/status)
 * mode="edit" → existing user edits their own profile (restricted fields)
 *
 * Seller section (store name, cover photo, description) is shown
 * automatically when type === "seller".
 *
 * Plugin fields are injected via addHook("User.form", [...], pluginNx)
 * and rendered in their designated sections.
 */

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import type { FormHooks } from "@/hook";
import { getHooks } from "@/hook";
import Gallery from "@/components/Gallery";

interface Location {
    id: string;
    _id?: string;
    title: string;
    parentId?: string | null;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface UserFormProps {
    mode: "add" | "edit";
    showAdminFields?: boolean;
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
    activePlugins: string[];
    onSuccess?: (userId: string) => void;
}

// ── Role config ────────────────────────────────────────────────────────────────

const ROLES: { value: string; label: string; icon: string; color: string }[] = [
    { value: "user",     label: "User",     icon: "solar:user-bold",             color: "text-indigo-600 bg-indigo-50 border-indigo-200"  },
    { value: "reporter", label: "Reporter", icon: "solar:document-bold",         color: "text-sky-600 bg-sky-50 border-sky-200"           },
    { value: "editor",   label: "Editor",   icon: "solar:pen-bold",              color: "text-blue-600 bg-blue-50 border-blue-200"        },
    { value: "seller",   label: "Seller",   icon: "solar:shop-bold",             color: "text-amber-600 bg-amber-50 border-amber-200"     },
    { value: "admin",    label: "Admin",    icon: "solar:shield-bold",           color: "text-violet-600 bg-violet-50 border-violet-200"  },
];

const STATUS_OPTIONS = [
    { value: "active",    label: "Active",    icon: "solar:check-circle-bold",   color: "text-emerald-600 bg-emerald-50"  },
    { value: "inactive",  label: "Inactive",  icon: "solar:pause-circle-bold",   color: "text-gray-500 bg-gray-50"        },
    { value: "suspended", label: "Suspended", icon: "solar:close-circle-bold",   color: "text-red-600 bg-red-50"          },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ icon, iconBg, iconColor, title, subtitle }: {
    icon: string; iconBg: string; iconColor: string; title: string; subtitle?: string;
}) {
    return (
        <div className="flex items-center gap-3 mb-5">
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                <Icon icon={icon} width={17} className={iconColor} />
            </span>
            <div>
                <p className="text-sm font-bold text-gray-800">{title}</p>
                {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
        </div>
    );
}

function Field({ label, required, hint, children }: {
    label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-600">
                {label}
                {required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            {children}
            {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
        </div>
    );
}

const inputCls = "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10";

// ── Main component ─────────────────────────────────────────────────────────────

export default function UserForm({ mode, initialData, activePlugins, onSuccess, showAdminFields }: UserFormProps) {
    const [pluginFields, setPluginFields] = useState<FormHooks>([]);
    useEffect(() => {
        setPluginFields(getHooks("User.form"));
    }, [activePlugins]);

    const visibleFields    = pluginFields.filter(f => !f.type || f.type === "" || showAdminFields);
    const leftPluginFields  = visibleFields.filter(f => f.style === "left");
    const rightPluginFields = visibleFields.filter(f => f.style === "right");

    // ── Core state ─────────────────────────────────────────────────────────
    const [name,     setName]     = useState(initialData?.name     ?? "");
    const [slug,     setSlug]     = useState(initialData?.slug     ?? "");
    const [email,    setEmail]    = useState(initialData?.email    ?? "");
    const [phone,    setPhone]    = useState(initialData?.phone    ?? "");
    const [password, setPassword] = useState("");
    const [showPw,   setShowPw]   = useState(false);
    const [type,     setType]     = useState(initialData?.type     ?? "user");
    const [image,    setImage]    = useState(initialData?.image    ?? "");
    const [status,   setStatus]   = useState(initialData?.status   ?? "active");
    const [address,  setAddress]  = useState(initialData?.address  ?? "");
    const [state,    setState]    = useState(initialData?.state    ?? "");
    const [city,     setCity]     = useState(initialData?.city     ?? "");
    const [zipCode,  setZipCode]  = useState(initialData?.zipCode  ?? "");
    const [info,     setInfo]     = useState<Record<string, string>>(initialData?.info ?? {});
    const [saving,   setSaving]   = useState(false);
    const [message,  setMessage]  = useState("");

    // ── Location data ─────────────────────────────────────────────────────
    const [allLocations, setAllLocations] = useState<Location[]>([]);
    const [stateOptions, setStateOptions] = useState<Location[]>([]);
    const [cityOptions, setCityOptions] = useState<Location[]>([]);

    useEffect(() => {
        fetch("/api/location/category?type=location&status=published")
            .then((r) => (r.ok ? r.json() : { categories: [] }))
            .then((data) => {
                const locs: Location[] = (data.categories || []).map((loc: any) => ({
                    ...loc,
                    id: loc.id || loc._id,
                }));
                setAllLocations(locs);
                setStateOptions(locs.filter((l) => !l.parentId));

                if (initialData?.state) {
                    const match = locs.find(
                        (l) => l.id === initialData.state || l.title.toLowerCase() === String(initialData.state).toLowerCase()
                    );
                    if (match) setState(match.id);
                }
                if (initialData?.city) {
                    const match = locs.find(
                        (l) => l.id === initialData.city || l.title.toLowerCase() === String(initialData.city).toLowerCase()
                    );
                    if (match) setCity(match.id);
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (state) {
            setCityOptions(allLocations.filter((l) => l.parentId === state));
        } else {
            setCityOptions([]);
        }
    }, [state, allLocations]);

    const isSeller = type === "seller";

    const handleInfoChange = (key: string, val: string) => setInfo(prev => ({ ...prev, [key]: val }));

    const handleNameChange = (val: string) => {
        setName(val);
        if (mode === "add") {
            setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
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
        if (password) payload.password = password;

        const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
        const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";
        const headers = { "Content-Type": "application/json", "x-license-key": LICENSE_KEY };

        try {
            let res: Response;
            if (mode === "add") {
                res = await fetch(`${EXPRESS_API}/user`, { method: "POST", headers, credentials: "include", body: JSON.stringify(payload) });
            } else {
                res = await fetch(`${EXPRESS_API}/user`, { method: "PUT", headers, credentials: "include", body: JSON.stringify({ id: initialData!._id, ...payload }) });
            }
            const data = await res.json();
            if (!res.ok) {
                setMessage(`Error: ${data.error}`);
            } else {
                setMessage("Saved successfully!");
                if (mode === "add") {
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
        fieldList.map(field => {
            const Component = field.component;
            if (!Component) return null;
            return (
                <Component key={`${field.key}-${field.position}`}
                    name={field.key} label={field.label}
                    value={info[field.key] || ""}
                    onChange={(v: string) => handleInfoChange(field.key, v)}
                    options={field.options} />
            );
        });

    return (
        <form onSubmit={handleSubmit} className="space-y-6">

            {/* ── Save message ── */}
            {message && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold border ${
                    message.startsWith("Error")
                        ? "bg-red-50 text-red-600 border-red-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}>
                    <Icon icon={message.startsWith("Error") ? "solar:close-circle-bold" : "solar:check-circle-bold"} width={18} />
                    {message}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                PROFILE PICTURE  — visible to everyone
            ══════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                    <SectionHeader icon="solar:user-circle-bold" iconBg="bg-indigo-50" iconColor="text-indigo-600"
                        title="Profile Picture" subtitle="Choose a photo that represents you" />
                    <div className="flex items-start gap-5">
                        {/* Live preview */}
                        <div className="shrink-0">
                            {image ? (
                                <img src={image} alt="Avatar preview"
                                    className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-100 shadow-sm" />
                            ) : (
                                <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-indigo-100 to-purple-100 flex items-center justify-center border-2 border-dashed border-indigo-200">
                                    <Icon icon="solar:user-bold" width={30} className="text-indigo-400" />
                                </div>
                            )}
                        </div>
                        {/* Gallery picker */}
                        <div className="flex-1 min-w-0">
                            <Gallery
                                multiple={false}
                                value={image}
                                onChange={v => setImage(typeof v === "string" ? v : v[0] ?? "")}
                                placeholder="Pick profile photo from gallery"
                            />
                            {image && (
                                <button type="button" onClick={() => setImage("")}
                                    className="mt-2 text-xs font-semibold text-red-500 hover:text-red-600 transition flex items-center gap-1">
                                    <Icon icon="solar:close-circle-bold" width={13} />
                                    Remove photo
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                SELLER SECTION — only when type === seller
            ══════════════════════════════════════════════════════════════ */}
            {isSeller && (
                <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
                    <div className="h-1 bg-linear-to-r from-amber-400 to-orange-400" />
                    <div className="px-5 py-4">
                        <SectionHeader icon="solar:shop-bold" iconBg="bg-amber-50" iconColor="text-amber-600"
                            title="Seller / Store Profile" subtitle="Information shown on your public store page" />

                        <div className="space-y-5">
                            {/* Store cover photo */}
                            <Field label="Store Cover Photo" hint="Recommended: 1200 × 400 px — shown as a banner on your store page">
                                <div className="space-y-2">
                                    {info.seller_cover && (
                                        <div className="relative w-full h-28 rounded-2xl overflow-hidden border border-amber-100">
                                            <img src={info.seller_cover} alt="Cover preview"
                                                className="w-full h-full object-cover" />
                                            <button type="button"
                                                onClick={() => handleInfoChange("seller_cover", "")}
                                                className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition">
                                                <Icon icon="solar:close-bold" width={13} />
                                            </button>
                                        </div>
                                    )}
                                    <Gallery
                                        multiple={false}
                                        value={info.seller_cover ?? ""}
                                        onChange={v => handleInfoChange("seller_cover", typeof v === "string" ? v : v[0] ?? "")}
                                        placeholder="Pick cover photo from gallery"
                                    />
                                </div>
                            </Field>

                            {/* Store profile image (separate from user.image) */}
                            <Field label="Store Profile Image" hint="Shown as the store avatar on your public profile page">
                                <div className="space-y-2">
                                    {info.seller_image && (
                                        <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-amber-100">
                                            <img src={info.seller_image} alt="Store image preview"
                                                className="w-full h-full object-cover" />
                                            <button type="button"
                                                onClick={() => handleInfoChange("seller_image", "")}
                                                className="absolute top-1 right-1 w-6 h-6 rounded-lg bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition">
                                                <Icon icon="solar:close-bold" width={11} />
                                            </button>
                                        </div>
                                    )}
                                    <Gallery
                                        multiple={false}
                                        value={info.seller_image ?? ""}
                                        onChange={v => handleInfoChange("seller_image", typeof v === "string" ? v : v[0] ?? "")}
                                        placeholder="Pick store profile image from gallery"
                                    />
                                </div>
                            </Field>

                            {/* Store name */}
                            <Field label="Store Name" hint="Publicly visible store display name">
                                <input type="text"
                                    value={info.seller_store_name ?? ""}
                                    onChange={e => handleInfoChange("seller_store_name", e.target.value)}
                                    className={inputCls}
                                    placeholder="e.g. John's Electronics" />
                            </Field>

                            {/* Store description */}
                            <Field label="Store Description">
                                <textarea rows={3}
                                    value={info.seller_description ?? ""}
                                    onChange={e => handleInfoChange("seller_description", e.target.value)}
                                    className={`${inputCls} resize-none`}
                                    placeholder="Tell customers what you sell…" />
                            </Field>

                            {/* Store contact */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="WhatsApp / Business Phone">
                                    <input type="tel"
                                        value={info.seller_whatsapp ?? ""}
                                        onChange={e => handleInfoChange("seller_whatsapp", e.target.value)}
                                        className={inputCls}
                                        placeholder="+1 555 000 0000" />
                                </Field>
                                <Field label="Business Email">
                                    <input type="email"
                                        value={info.seller_business_email ?? ""}
                                        onChange={e => handleInfoChange("seller_business_email", e.target.value)}
                                        className={inputCls}
                                        placeholder="store@example.com" />
                                </Field>
                            </div>

                            {/* Plugin-injected right fields (admin-only like seller_approved) */}
                            {renderPluginFields(rightPluginFields)}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                PERSONAL INFO — two-column grid on desktop
            ══════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="h-1 bg-linear-to-r from-indigo-500 to-purple-500" />
                <div className="px-5 py-4">
                    <SectionHeader icon="solar:user-id-bold" iconBg="bg-indigo-50" iconColor="text-indigo-600"
                        title="Personal Information" subtitle="Your name, contact details and login credentials" />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Full name */}
                        <Field label="Full Name" required>
                            <input id="name" type="text" value={name}
                                onChange={e => handleNameChange(e.target.value)}
                                className={inputCls} placeholder="John Doe" required />
                        </Field>

                        {/* Slug — admin only */}
                        {(mode === "add" || showAdminFields) && (
                            <Field label="Slug / Username" hint="Used in the public profile URL">
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium select-none">@</span>
                                    <input id="slug" type="text" value={slug}
                                        onChange={e => setSlug(e.target.value)}
                                        className={`${inputCls} pl-8`}
                                        placeholder="john-doe" required />
                                </div>
                            </Field>
                        )}

                        {/* Email */}
                        <Field label="Email Address" required={mode === "add"}>
                            <div className="relative">
                                <Icon icon="solar:letter-bold" width={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input id="email" type="email" value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className={`${inputCls} pl-9`}
                                    placeholder="john@example.com" required={mode === "add"} />
                            </div>
                        </Field>

                        {/* Phone */}
                        <Field label="Phone Number">
                            <div className="relative">
                                <Icon icon="solar:phone-bold" width={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input id="phone" type="tel" value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    className={`${inputCls} pl-9`}
                                    placeholder="+1 555 000 0000" />
                            </div>
                        </Field>

                        {/* Password */}
                        <Field label={mode === "add" ? "Password" : "New Password"}
                            hint={mode === "edit" ? "Leave blank to keep your current password" : undefined}
                            required={mode === "add"}>
                            <div className="relative">
                                <Icon icon="solar:lock-keyhole-bold" width={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input id="password"
                                    type={showPw ? "text" : "password"}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className={`${inputCls} pl-9 pr-11`}
                                    placeholder="••••••••"
                                    required={mode === "add"}
                                    autoComplete="new-password" />
                                <button type="button" tabIndex={-1}
                                    onClick={() => setShowPw(v => !v)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                                    <Icon icon={showPw ? "solar:eye-closed-bold" : "solar:eye-bold"} width={16} />
                                </button>
                            </div>
                        </Field>

                        {/* Plugin left fields */}
                        {leftPluginFields.map(field => {
                            const Component = field.component;
                            if (!Component) return null;
                            return (
                                <Component key={`${field.key}-${field.position}`}
                                    name={field.key} label={field.label}
                                    value={info[field.key] || ""}
                                    onChange={(v: string) => handleInfoChange(field.key, v)}
                                    options={field.options} />
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                SHIPPING ADDRESS
            ══════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="h-1 bg-linear-to-r from-emerald-500 to-teal-500" />
                <div className="px-5 py-4">
                    <SectionHeader icon="solar:map-point-bold" iconBg="bg-emerald-50" iconColor="text-emerald-600"
                        title="Shipping Address" subtitle="Default delivery address for orders" />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="lg:col-span-2">
                            <Field label="Street Address">
                                <div className="relative">
                                    <Icon icon="solar:home-bold" width={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="text" value={address}
                                        onChange={e => setAddress(e.target.value)}
                                        className={`${inputCls} pl-9`}
                                        placeholder="123 Main Street" />
                                </div>
                            </Field>
                        </div>

                        <Field label="State / Province">
                            <select value={state}
                                onChange={e => { setState(e.target.value); setCity(""); }}
                                className={inputCls}>
                                <option value="">Select State</option>
                                {stateOptions.map(s => (
                                    <option key={s.id} value={s.id}>{s.title}</option>
                                ))}
                            </select>
                        </Field>

                        <Field label="City">
                            <select value={city}
                                onChange={e => setCity(e.target.value)}
                                disabled={!state}
                                className={inputCls}>
                                <option value="">Select City</option>
                                {cityOptions.map(c => (
                                    <option key={c.id} value={c.id}>{c.title}</option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Zip / Postal Code">
                            <input type="text" value={zipCode}
                                onChange={e => setZipCode(e.target.value)}
                                className={inputCls} placeholder="10001" />
                        </Field>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                ADMIN CONTROLS — role + status (admin only)
            ══════════════════════════════════════════════════════════════ */}
            {(mode === "add" || showAdminFields) && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="h-1 bg-linear-to-r from-violet-500 to-purple-600" />
                    <div className="px-5 py-4">
                        <SectionHeader icon="solar:shield-bold" iconBg="bg-violet-50" iconColor="text-violet-600"
                            title="Account Controls" subtitle="Role and account status — admin only" />

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Role picker */}
                            <Field label="User Role">
                                <div className="grid grid-cols-1 gap-2">
                                    {ROLES.map(r => (
                                        <label key={r.value}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                                                type === r.value
                                                    ? r.color + " border-current shadow-sm"
                                                    : "border-gray-100 hover:border-gray-200 bg-gray-50/50"
                                            }`}>
                                            <input type="radio" name="type" value={r.value}
                                                checked={type === r.value}
                                                onChange={() => setType(r.value)}
                                                className="sr-only" />
                                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${type === r.value ? "bg-current/15" : "bg-gray-100"}`}>
                                                <Icon icon={r.icon} width={15} className={type === r.value ? "" : "text-gray-400"} />
                                            </span>
                                            <span className="text-sm font-semibold">{r.label}</span>
                                            {type === r.value && (
                                                <Icon icon="solar:check-circle-bold" width={16} className="ml-auto shrink-0" />
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </Field>

                            {/* Status picker */}
                            <Field label="Account Status">
                                <div className="grid grid-cols-1 gap-2">
                                    {STATUS_OPTIONS.map(s => (
                                        <label key={s.value}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                                                status === s.value
                                                    ? s.color + " border-current shadow-sm"
                                                    : "border-gray-100 hover:border-gray-200 bg-gray-50/50"
                                            }`}>
                                            <input type="radio" name="status" value={s.value}
                                                checked={status === s.value}
                                                onChange={() => setStatus(s.value)}
                                                className="sr-only" />
                                            <Icon icon={s.icon} width={18} className="shrink-0" />
                                            <span className="text-sm font-semibold">{s.label}</span>
                                            {status === s.value && (
                                                <Icon icon="solar:check-circle-bold" width={16} className="ml-auto shrink-0" />
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </Field>
                        </div>

                        {/* Plugin right fields — but only if NOT seller (seller gets them in seller section) */}
                        {!isSeller && renderPluginFields(rightPluginFields)}
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SAVE BUTTON
            ══════════════════════════════════════════════════════════════ */}
            <div className="flex items-center justify-between gap-4 pt-2">
                {message && !message.startsWith("Error") && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                        <Icon icon="solar:check-circle-bold" width={16} />
                        {message}
                    </div>
                )}
                {message && message.startsWith("Error") && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-red-600">
                        <Icon icon="solar:close-circle-bold" width={16} />
                        {message}
                    </div>
                )}
                {!message && <span />}

                <button type="submit" disabled={saving}
                    className="flex items-center gap-2 px-8 py-3 bg-linear-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-2xl shadow-md shadow-indigo-200 hover:shadow-lg hover:-translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">
                    {saving
                        ? <><Icon icon="svg-spinners:ring-resize" width={16} /> Saving…</>
                        : <><Icon icon="solar:check-circle-bold" width={16} /> {mode === "add" ? "Create User" : "Save Changes"}</>
                    }
                </button>
            </div>

        </form>
    );
}
