"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import FormSettings from "@/components/admin/FormSettings";
import IconifyPicker from "@/components/ui/Iconify";
import Gallery from "@/components/Gallery";
import { useActivePlugins } from "@/hook/useActivePlugins";
import useSettings from "@/lib/useSettings";
import { xFetch } from "@/lib/express";

// ─── Tab definitions ──────────────────────────────────────────────────────────

interface Tab {
    key: string;
    label: string;
    icon: string;
    /** Matches FormHookField.type used in addHook("setting.form", [...]) */
    settingType: string;
    description: string;
}

const CORE_TABS: Tab[] = [
    {
        key: "general",
        label: "General",
        icon: "solar:settings-bold",
        settingType: "settings",
        description: "Site identity, logo, contact info and default SEO.",
    },
    {
        key: "appearance",
        label: "Appearance",
        icon: "solar:palette-bold",
        settingType: "appearance",
        description: "Brand colours, container width and Google Font for the public site.",
    },
    {
        key: "header",
        label: "Header",
        icon: "solar:widget-2-bold",
        settingType: "header",
        description: "Assign menus to header slots and configure header behaviour.",
    },
    {
        key: "footer",
        label: "Footer",
        icon: "solar:footer-bold",
        settingType: "footer",
        description: "Configure 5 separate footer sections with default titles & dynamic fields (icon, name, link).",
    },
    {
        key: "nav",
        label: "Navigation",
        icon: "solar:menu-dots-bold",
        settingType: "nav",
        description: "Nav bar colours, typography and spacing.",
    },
    {
        key: "category",
        label: "Category Layout",
        icon: "solar:folder-with-files-bold",
        settingType: "category",
        description: "Configure responsive desktop, tablet, and mobile grid columns & gaps for category pages.",
    },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
    const activePlugins = useActivePlugins();
    const { settings, loading, refresh } = useSettings();
    const [activeTab, setActiveTab] = useState("general");

    if (activePlugins === null || loading) {
        return (
            <div className="flex items-center justify-center py-24 text-gray-400">
                <Icon icon="svg-spinners:ring-resize" width={32} />
            </div>
        );
    }

    const currentTab = CORE_TABS.find((t) => t.key === activeTab) ?? CORE_TABS[0];

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Configure your site's general options, navigation menus, footer sections and header appearance.
                </p>
            </div>

            {/* Tab bar */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex gap-1 overflow-x-auto">
                    {CORE_TABS.map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${isActive
                                        ? "border-indigo-500 text-indigo-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                            >
                                <Icon icon={tab.icon} width={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Tab description */}
            <p className="text-sm text-gray-500">{currentTab.description}</p>

            {/* Tab content */}
            {activeTab === "general" && (
                <FormSettings
                    type="settings"
                    activePlugins={activePlugins}
                    initialValues={settings}
                    onSuccess={refresh}
                />
            )}

            {activeTab === "appearance" && (
                <AppearanceTab
                    activePlugins={activePlugins}
                    initialValues={settings}
                    onSaved={refresh}
                />
            )}

            {activeTab === "header" && (
                <HeaderTab
                    activePlugins={activePlugins}
                    initialValues={settings}
                    onSaved={refresh}
                />
            )}

            {activeTab === "footer" && (
                <FooterTab
                    activePlugins={activePlugins}
                    initialValues={settings}
                    onSaved={refresh}
                />
            )}

            {activeTab === "nav" && (
                <FormSettings
                    type="nav"
                    activePlugins={activePlugins}
                    initialValues={settings}
                    onSuccess={refresh}
                />
            )}

            {activeTab === "category" && (
                <FormSettings
                    type="category"
                    activePlugins={activePlugins}
                    initialValues={settings}
                    onSuccess={refresh}
                />
            )}
        </div>
    );
}

// ─── Footer tab ───────────────────────────────────────────────────────────────

interface FooterSectionItem {
    id: string;
    icon: string;
    name: string;
    link: string;
}

interface FooterSection {
    id: string;
    title: string;
    items: FooterSectionItem[];
}

function parseFooterSections(initialValues: Record<string, any>): FooterSection[] {
    const defaultTitles = [
        "Quick Links",
        "Customer Care",
        "Follow Us",
        "Categories",
        "Legal & Policy",
    ];
    const result: FooterSection[] = [];

    for (let s = 1; s <= 5; s++) {
        const secTitle = initialValues[`footer_section_${s}_title`] ?? defaultTitles[s - 1];
        let secItems: FooterSectionItem[] = [];

        if (typeof initialValues[`footer_section_${s}_items`] === "string") {
            try {
                const parsed = JSON.parse(initialValues[`footer_section_${s}_items`]);
                if (Array.isArray(parsed)) secItems = parsed;
            } catch { }
        } else {
            const flatIcon = initialValues[`footer_item_${s}_icon`];
            const flatName = initialValues[`footer_item_${s}_name`];
            const flatLink = initialValues[`footer_item_${s}_link`];
            if (flatIcon || flatName || flatLink) {
                secItems = [
                    {
                        id: `item-${s}-1`,
                        icon: flatIcon || "",
                        name: flatName || "",
                        link: flatLink || "",
                    },
                ];
            }
        }

        result.push({
            id: `sec-${s}`,
            title: secTitle,
            items: secItems,
        });
    }
    return result;
}

function FooterTab({
    activePlugins,
    initialValues,
    onSaved,
}: {
    activePlugins: string[];
    initialValues: Record<string, any>;
    onSaved?: () => void;
}) {
    const [sections, setSections] = useState<FooterSection[]>(() => parseFooterSections(initialValues));

    const [formValues, setFormValues] = useState<Record<string, string>>({
        footer_about_title: initialValues.footer_about_title ?? "About Our Organization",
        footer_about_description: initialValues.footer_about_description ?? "Dedicated to community integration, elderly welfare, cultural preservation, and youth educational development across the United Kingdom.",
        admin: initialValues.admin ?? "",
        editor: initialValues.editor ?? "",
        footer_address: initialValues.footer_address ?? initialValues.address ?? "",
        footer_phone: initialValues.footer_phone ?? initialValues.phone ?? "",
        footer_number: initialValues.footer_number ?? initialValues.number ?? "",
        footer_email: initialValues.footer_email ?? initialValues.email ?? "",
        copyright: initialValues.copyright ?? "",
        social_media: initialValues.social_media ?? initialValues.socialMedia ?? "",
        footer_logo: initialValues.footer_logo ?? initialValues.footerLogo ?? "",
        footer_logo_height: initialValues.footer_logo_height ?? initialValues.footerLogoHeight ?? "",
        background_image: initialValues.background_image ?? initialValues.backgroundImage ?? initialValues.bg_image ?? "",
        mobile_download: initialValues.mobile_download ?? initialValues.mobileDownload ?? "",
        developed: initialValues.developed ?? "",
        footer_bg_color: initialValues.footer_bg_color ?? initialValues.footer_bg_1 ?? "#ffffff",
        footer_bg_color_2: initialValues.footer_bg_color_2 ?? initialValues.footer_bg_2 ?? "#f8fafc",
        footer_text_color: initialValues.footer_text_color ?? initialValues.footer_text_1 ?? "#1e293b",
        footer_text_color_2: initialValues.footer_text_color_2 ?? initialValues.footer_text_2 ?? "#64748b",
    });

    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        setSections(parseFooterSections(initialValues));
        setFormValues({
            footer_about_title: initialValues.footer_about_title ?? "About Our Organization",
            footer_about_description: initialValues.footer_about_description ?? "Dedicated to community integration, elderly welfare, cultural preservation, and youth educational development across the United Kingdom.",
            admin: initialValues.admin ?? "",
            editor: initialValues.editor ?? "",
            footer_address: initialValues.footer_address ?? initialValues.address ?? "",
            footer_phone: initialValues.footer_phone ?? initialValues.phone ?? "",
            footer_number: initialValues.footer_number ?? initialValues.number ?? "",
            footer_email: initialValues.footer_email ?? initialValues.email ?? "",
            copyright: initialValues.copyright ?? "",
            social_media: initialValues.social_media ?? initialValues.socialMedia ?? "",
            footer_logo: initialValues.footer_logo ?? initialValues.footerLogo ?? "",
            footer_logo_height: initialValues.footer_logo_height ?? initialValues.footerLogoHeight ?? "",
            background_image: initialValues.background_image ?? initialValues.backgroundImage ?? initialValues.bg_image ?? "",
            mobile_download: initialValues.mobile_download ?? initialValues.mobileDownload ?? "",
            developed: initialValues.developed ?? "",
            footer_bg_color: initialValues.footer_bg_color ?? initialValues.footer_bg_1 ?? "#ffffff",
            footer_bg_color_2: initialValues.footer_bg_color_2 ?? initialValues.footer_bg_2 ?? "#f8fafc",
            footer_text_color: initialValues.footer_text_color ?? initialValues.footer_text_1 ?? "#1e293b",
            footer_text_color_2: initialValues.footer_text_color_2 ?? initialValues.footer_text_2 ?? "#64748b",
        });
    }, [initialValues]);

    const updateSectionTitle = (secIndex: number, title: string) => {
        setSections((prev) => {
            const next = [...prev];
            next[secIndex] = { ...next[secIndex], title };
            return next;
        });
    };

    const updateItem = (secIndex: number, itemIndex: number, field: keyof FooterSectionItem, value: string) => {
        setSections((prev) => {
            const next = [...prev];
            const sec = next[secIndex];
            const newItems = [...sec.items];
            newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
            next[secIndex] = { ...sec, items: newItems };
            return next;
        });
    };

    const addItemToSection = (secIndex: number) => {
        setSections((prev) => {
            const next = [...prev];
            const sec = next[secIndex];
            const newItems = [
                ...sec.items,
                { id: `item-${secIndex}-${Date.now()}`, icon: "", name: "", link: "" },
            ];
            next[secIndex] = { ...sec, items: newItems };
            return next;
        });
    };

    const removeItemFromSection = (secIndex: number, itemIndex: number) => {
        setSections((prev) => {
            const next = [...prev];
            const sec = next[secIndex];
            const newItems = sec.items.filter((_, i) => i !== itemIndex);
            next[secIndex] = { ...sec, items: newItems };
            return next;
        });
    };

    const handleChange = (key: string, value: string) => {
        setFormValues((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage("");

        const payload: Record<string, any> = {
            ...initialValues,
            footer_about_title: formValues.footer_about_title,
            footer_about_description: formValues.footer_about_description,
            admin: formValues.admin,
            editor: formValues.editor,
            footer_address: formValues.footer_address,
            footer_phone: formValues.footer_phone,
            footer_number: formValues.footer_number,
            footer_email: formValues.footer_email,
            copyright: formValues.copyright,
            social_media: formValues.social_media,
            socialMedia: formValues.social_media,
            footer_logo: formValues.footer_logo,
            footerLogo: formValues.footer_logo,
            footer_logo_height: formValues.footer_logo_height,
            footerLogoHeight: formValues.footer_logo_height,
            background_image: formValues.background_image,
            backgroundImage: formValues.background_image,
            mobile_download: formValues.mobile_download,
            mobileDownload: formValues.mobile_download,
            developed: formValues.developed,
            footer_bg_color: formValues.footer_bg_color,
            footer_bg_color_2: formValues.footer_bg_color_2,
            footer_text_color: formValues.footer_text_color,
            footer_text_color_2: formValues.footer_text_color_2,
        };

        sections.forEach((sec, idx) => {
            const num = idx + 1;
            payload[`footer_section_${num}_title`] = sec.title;
            payload[`footer_section_${num}_items`] = JSON.stringify(sec.items);

            if (sec.items[0]) {
                payload[`footer_item_${num}_icon`] = sec.items[0].icon;
                payload[`footer_item_${num}_name`] = sec.items[0].name;
                payload[`footer_item_${num}_link`] = sec.items[0].link;
            } else {
                payload[`footer_item_${num}_icon`] = "";
                payload[`footer_item_${num}_name`] = "";
                payload[`footer_item_${num}_link`] = "";
            }
        });

        try {
            const res = await xFetch("/settings", {
                method: "PUT",
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                setMessage(`Error: ${data.error ?? "Failed to save"}`);
            } else {
                setMessage("Footer settings saved successfully!");
                try {
                    localStorage.setItem("cms_settings_updated", Date.now().toString());
                    window.dispatchEvent(new Event("cms_settings_updated"));
                } catch { }
                onSaved?.();
                setTimeout(() => setMessage(""), 3000);
            }
        } catch {
            setMessage("Network error");
        } finally {
            setSaving(false);
        }
    };

    const mergedInitialValues = { ...initialValues };
    sections.forEach((sec, idx) => {
        const num = idx + 1;
        mergedInitialValues[`footer_section_${num}_title`] = sec.title;
        mergedInitialValues[`footer_section_${num}_items`] = JSON.stringify(sec.items);
        if (sec.items[0]) {
            mergedInitialValues[`footer_item_${num}_icon`] = sec.items[0].icon;
            mergedInitialValues[`footer_item_${num}_name`] = sec.items[0].name;
            mergedInitialValues[`footer_item_${num}_link`] = sec.items[0].link;
        } else {
            mergedInitialValues[`footer_item_${num}_icon`] = "";
            mergedInitialValues[`footer_item_${num}_name`] = "";
            mergedInitialValues[`footer_item_${num}_link`] = "";
        }
    });

    const contentFields = [
        { key: "footer_about_title", label: "Footer About Title", icon: "solar:text-bold", placeholder: "About Our Organization" },
        { key: "footer_about_description", label: "Footer About Description", icon: "solar:document-bold", placeholder: "Dedicated to community integration, elderly welfare...", isTextarea: true },
        { key: "admin", label: "Admin", icon: "solar:user-bold", placeholder: "Admin name or details" },
        { key: "editor", label: "Editor", icon: "solar:pen-bold", placeholder: "Editor name or details" },
        { key: "footer_address", label: "Address (Footer)", icon: "solar:map-point-bold", placeholder: "Full office address for footer", isTextarea: true },
        { key: "footer_phone", label: "Phone (Footer)", icon: "solar:phone-bold", placeholder: "+1 (555) 000-0000" },
        { key: "footer_number", label: "Number (Footer)", icon: "solar:hashtag-bold", placeholder: "Contact / Hotline number for footer" },
        { key: "footer_email", label: "Email (Footer)", icon: "solar:letter-bold", placeholder: "contact@example.com" },
        { key: "copyright", label: "Copyright", icon: "solar:copyright-bold", placeholder: "© 2026 All rights reserved." },
        { key: "social_media", label: "Social Media", icon: "solar:share-circle-bold", placeholder: "Social media links or handle info" },
        { key: "footer_logo", label: "Footer Logo", icon: "solar:gallery-wide-bold", placeholder: "Footer logo image", isGallery: true },
        { key: "footer_logo_height", label: "Footer Logo Height (px)", icon: "solar:ruler-bold", placeholder: "e.g. 40" },
        { key: "background_image", label: "Background Image", icon: "solar:image-bold", placeholder: "Background image", isGallery: true },
        { key: "mobile_download", label: "Mobile Download", icon: "solar:smartphone-bold", placeholder: "App download URL or note" },
        { key: "developed", label: "Developed", icon: "solar:code-bold", placeholder: "Developed by details / credits" },
    ];

    const colorFields = [
        { key: "footer_bg_color", label: "Footer Background Color 1", icon: "solar:palette-bold", default: "#ffffff" },
        { key: "footer_bg_color_2", label: "Footer Background Color 2", icon: "solar:palette-2-bold", default: "#f8fafc" },
        { key: "footer_text_color", label: "Footer Text Color 1", icon: "solar:text-bold", default: "#1e293b" },
        { key: "footer_text_color_2", label: "Footer Text Color 2", icon: "solar:text-cross-bold", default: "#64748b" },
    ];

    return (
        <div className="space-y-8">
            <form onSubmit={handleSave} className="space-y-8">
                {message && (
                    <div className={`p-4 rounded-xl text-xs font-semibold border ${message.startsWith("Error")
                            ? "bg-red-50 text-red-600 border-red-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                        {message}
                    </div>
                )}

                {/* Section 1: Dynamic 5 Footer Sections Builder */}
                <div className="space-y-5">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 border-b border-gray-200 pb-2">
                        <Icon icon="solar:widget-2-bold" width={18} className="text-indigo-500" />
                        Dynamic Footer Sections & Items (5 Sections)
                    </h3>

                    <div className="space-y-6">
                        {sections.map((sec, secIdx) => (
                            <div key={sec.id || secIdx} className="bg-gray-50/70 border border-gray-200 rounded-2xl p-5 space-y-5 hover:border-indigo-200 transition">
                                <div className="flex items-center justify-between border-b border-gray-200/80 pb-3 flex-wrap gap-3">
                                    <div className="flex items-center gap-3 flex-1 min-w-60">
                                        <span className="px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-700 text-xs font-bold font-mono shrink-0">
                                            Section #{secIdx + 1}
                                        </span>
                                        <input
                                            type="text"
                                            value={sec.title}
                                            onChange={(e) => updateSectionTitle(secIdx, e.target.value)}
                                            placeholder="Section Title (e.g. Quick Links)"
                                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white flex-1 max-w-md"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => addItemToSection(secIdx)}
                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-gray-200 hover:border-indigo-300 text-indigo-600 transition flex items-center gap-1.5 shadow-sm"
                                    >
                                        <Icon icon="solar:add-circle-bold" width={14} />
                                        Add Field
                                    </button>
                                </div>

                                {sec.items.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {sec.items.map((item, itemIdx) => (
                                            <div key={item.id || itemIdx} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3.5 shadow-sm relative group">
                                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                                    <span className="text-[11px] font-bold text-gray-700 font-mono flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                                                        Field #{itemIdx + 1}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItemFromSection(secIdx, itemIdx)}
                                                        className="px-2 py-1 text-[11px] font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/60 rounded-md transition flex items-center gap-1 shrink-0"
                                                        title="Remove Field"
                                                    >
                                                        <Icon icon="solar:trash-bin-trash-bold" width={12} />
                                                        Remove
                                                    </button>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-semibold text-gray-600">Icon</label>
                                                    <IconifyPicker
                                                        value={item.icon}
                                                        onChange={(val) => updateItem(secIdx, itemIdx, "icon", val)}
                                                        placeholder="Select Icon"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-semibold text-gray-600">Name</label>
                                                    <input
                                                        type="text"
                                                        value={item.name}
                                                        onChange={(e) => updateItem(secIdx, itemIdx, "name", e.target.value)}
                                                        placeholder="e.g. Facebook, Terms, Support"
                                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-semibold text-gray-600">Link</label>
                                                    <input
                                                        type="text"
                                                        value={item.link}
                                                        onChange={(e) => updateItem(secIdx, itemIdx, "link", e.target.value)}
                                                        placeholder="e.g. https://... or /privacy"
                                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section 2: Content & Contact Details */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 border-b border-gray-200 pb-2">
                        <Icon icon="solar:document-bold" width={18} className="text-indigo-500" />
                        Footer Content & Contact Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/70 border border-gray-200 rounded-2xl p-6">
                        {contentFields.map((f) => (
                            <div key={f.key} className={`space-y-2 ${f.isTextarea || f.isGallery ? "md:col-span-2" : ""}`}>
                                <label className="text-xs font-bold text-gray-700 flex items-center gap-2">
                                    <Icon icon={f.icon} width={16} className="text-indigo-500" />
                                    {f.label}
                                </label>
                                {f.isGallery ? (
                                    <Gallery
                                        value={formValues[f.key] ?? ""}
                                        onChange={(v) => handleChange(f.key, Array.isArray(v) ? v[0] ?? "" : v)}
                                        placeholder={`Select ${f.label}`}
                                    />
                                ) : f.isTextarea ? (
                                    <textarea
                                        rows={3}
                                        value={formValues[f.key] ?? ""}
                                        onChange={(e) => handleChange(f.key, e.target.value)}
                                        placeholder={f.placeholder}
                                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={formValues[f.key] ?? ""}
                                        onChange={(e) => handleChange(f.key, e.target.value)}
                                        placeholder={f.placeholder}
                                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section 3: Color Settings */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 border-b border-gray-200 pb-2">
                        <Icon icon="solar:palette-bold" width={18} className="text-indigo-500" />
                        Footer Colors & Styling
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-gray-50/70 border border-gray-200 rounded-2xl p-6">
                        {colorFields.map((cf) => (
                            <div key={cf.key} className="space-y-2">
                                <label className="text-xs font-bold text-gray-700 flex items-center gap-2">
                                    <Icon icon={cf.icon} width={16} className="text-indigo-500" />
                                    {cf.label}
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={formValues[cf.key] || cf.default}
                                        onChange={(e) => handleChange(cf.key, e.target.value)}
                                        className="w-10 h-10 rounded-xl border border-gray-300 cursor-pointer p-0.5 shrink-0 bg-white"
                                    />
                                    <input
                                        type="text"
                                        value={formValues[cf.key] ?? ""}
                                        onChange={(e) => handleChange(cf.key, e.target.value)}
                                        placeholder={cf.default}
                                        className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {saving ? (
                        <>
                            <Icon icon="svg-spinners:ring-resize" width={18} />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Icon icon="solar:disk-bold" width={18} />
                            Save Footer Settings
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}

// ─── Appearance tab ───────────────────────────────────────────────────────────

function AppearanceTab({
    activePlugins,
    initialValues,
    onSaved,
}: {
    activePlugins: string[];
    initialValues: Record<string, any>;
    onSaved: () => void;
}) {
    const [live, setLive] = useState<Record<string, any>>(initialValues);

    useEffect(() => { setLive(initialValues); }, [initialValues]);

    const colorMain = (live.color_main as string) || "#00aaa6";
    const colorSecondary = (live.color_secondary as string) || "#ffc800";
    const colorPrimary = (live.color_primary as string) || "#10846f";
    const colorFf = (live.color_ff as string) || "#fff9f3";
    const width = (live.width as string) || "1600";
    const googleFont = (live.google_font as string) || "";

    const swatches = [
        { label: "Main", key: "color_main", color: colorMain },
        { label: "Secondary", key: "color_secondary", color: colorSecondary },
        { label: "Primary", key: "color_primary", color: colorPrimary },
        { label: "Background", key: "color_ff", color: colorFf },
    ];

    return (
        <div className="space-y-8">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-700">Live Preview</h2>

                <div className="flex flex-wrap gap-3">
                    {swatches.map(({ label, color }) => (
                        <div key={label}
                            className="flex items-center gap-2.5 bg-white rounded-lg border border-gray-200 px-3 py-2 shadow-sm">
                            <span
                                className="w-7 h-7 rounded-full border border-gray-200 shrink-0 transition-colors duration-150"
                                style={{ backgroundColor: color }}
                            />
                            <div>
                                <p className="text-xs font-semibold text-gray-700">{label}</p>
                                <p className="text-xs text-gray-400 font-mono">{color}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm text-xs">
                    <div className="flex items-center gap-3 px-4 py-2.5"
                        style={{ backgroundColor: colorMain }}>
                        {live.logo ? (
                            <img src={live.logo} alt="Logo" className="h-5 w-auto object-contain shrink-0" />
                        ) : (
                            <span className="font-bold text-white text-sm shrink-0">{live.siteName || "Logo"}</span>
                        )}
                        <div className="flex gap-3 ml-4">
                            {["Home", "Shop", "Blog"].map(l => (
                                <span key={l} className="text-white/80">{l}</span>
                            ))}
                        </div>
                    </div>
                    <div className="px-6 py-5 flex items-center gap-4"
                        style={{ backgroundColor: colorFf }}>
                        <div className="flex-1 space-y-2">
                            <div className="h-3 rounded w-2/3"
                                style={{ backgroundColor: colorPrimary, opacity: 0.5 }} />
                            <div className="h-2 rounded w-full bg-gray-200" />
                            <div className="h-2 rounded w-4/5 bg-gray-200" />
                            <div className="mt-3 inline-block px-4 py-1.5 rounded text-white text-xs font-semibold"
                                style={{ backgroundColor: colorSecondary }}>
                                Shop Now
                            </div>
                        </div>
                        <div className="w-20 h-16 rounded-lg shrink-0"
                            style={{ backgroundColor: colorPrimary, opacity: 0.2 }} />
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span>
                        <span className="font-semibold text-gray-700">Container:</span>{" "}
                        <span className="font-mono">{width}px</span>
                    </span>
                    {googleFont && (
                        <span>
                            <span className="font-semibold text-gray-700">Font:</span>{" "}
                            <span className="font-mono"
                                style={{ fontFamily: `'${googleFont}', sans-serif` }}>
                                {googleFont}
                            </span>
                        </span>
                    )}
                </div>
            </div>

            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4
                            text-xs text-gray-500 font-mono space-y-0.5">
                <p className="text-gray-400 font-sans font-semibold text-xs mb-2">
                    Applied as CSS custom properties on every public page:
                </p>
                {[
                    ["--color-main", colorMain],
                    ["--color-secondary", colorSecondary],
                    ["--color-primary", colorPrimary],
                    ["--color-ff", colorFf],
                ].map(([prop, val]) => (
                    <p key={prop}>
                        {prop}:{" "}
                        <span className="inline-flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full border border-gray-300 inline-block"
                                style={{ backgroundColor: val }} />
                            <span className="text-[#00aaa6]">{val}</span>
                        </span>
                    </p>
                ))}
                <p>.container {"{"} max-width:{" "}
                    <span className="text-[#00aaa6]">{width}px</span> {"}"}
                </p>
            </div>

            <FormSettings
                type="appearance"
                activePlugins={activePlugins}
                initialValues={live}
                onSuccess={onSaved}
            />
        </div>
    );
}

// ─── Header tab ───────────────────────────────────────────────────────────────

function HeaderTab({
    activePlugins,
    initialValues,
    onSaved,
}: {
    activePlugins: string[];
    initialValues: Record<string, any>;
    onSaved?: () => void;
}) {
    const slots = [
        { key: "header_main_menu", label: "Main Menu", icon: "solar:menu-dots-bold", color: "bg-blue-100 text-blue-700" },
        { key: "header_mobile_menu", label: "Mobile Menu", icon: "solar:smartphone-bold", color: "bg-purple-100 text-purple-700" },
        { key: "header_top_menu", label: "Top Bar Menu", icon: "solar:slider-minimalistic-bold", color: "bg-emerald-100 text-emerald-700" },
        { key: "header_right_menu", label: "Right Side Menu", icon: "solar:arrow-right-bold", color: "bg-orange-100 text-orange-700" },
        { key: "header_footer_menu", label: "Footer Menu", icon: "solar:footer-bold", color: "bg-gray-100 text-gray-700" },
    ];

    return (
        <div className="space-y-8">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Menu Slot Overview</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {slots.map((slot) => {
                        const assigned = initialValues[slot.key];
                        return (
                            <div key={slot.key} className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3 shadow-sm">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${slot.color}`}>
                                    <Icon icon={slot.icon} width={16} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-gray-700 truncate">{slot.label}</p>
                                    <p className="text-xs text-gray-400 font-mono truncate">
                                        {assigned || "— not assigned —"}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="rounded-xl border border-dashed border-gray-300 overflow-hidden">
                <div className="bg-gray-100 px-4 py-1.5 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
                    Header preview (schematic)
                </div>
                <div className="bg-white">
                    <div className="flex items-center justify-between px-6 py-1.5 bg-gray-800 text-xs text-gray-300">
                        <span className="opacity-60">Top bar</span>
                        <SlotPreviewPill value={initialValues.header_top_menu} fallback="header_top_menu" />
                    </div>
                    <div className="flex items-center justify-between px-6 py-4 border-b">
                        <div className="flex items-center gap-2">
                            {initialValues.logo ? (
                                <img src={initialValues.logo} alt="Logo" className="h-6 w-auto object-contain shrink-0" />
                            ) : (
                                <>
                                    <div className="w-8 h-8 rounded bg-indigo-100 flex items-center justify-center shrink-0">
                                        <Icon icon="solar:star-bold" width={14} className="text-indigo-500" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">{initialValues.siteName || "Logo"}</span>
                                </>
                            )}
                        </div>
                        <SlotPreviewPill value={initialValues.header_main_menu} fallback="header_main_menu" color="blue" />
                        <SlotPreviewPill value={initialValues.header_right_menu} fallback="header_right_menu" color="orange" />
                        <div className="flex items-center gap-1.5 md:hidden">
                            <Icon icon="solar:hamburger-menu-bold" width={18} className="text-gray-500" />
                            <SlotPreviewPill value={initialValues.header_mobile_menu} fallback="mobile" color="purple" />
                        </div>
                    </div>
                </div>
            </div>

            <FormSettings
                type="header"
                activePlugins={activePlugins}
                initialValues={initialValues}
                onSuccess={onSaved}
            />
        </div>
    );
}

function SlotPreviewPill({
    value,
    fallback,
    color = "gray",
}: {
    value?: string;
    fallback: string;
    color?: "blue" | "purple" | "emerald" | "orange" | "gray";
}) {
    const colorMap: Record<string, string> = {
        blue: "bg-blue-100 text-blue-700",
        purple: "bg-purple-100 text-purple-700",
        emerald: "bg-emerald-100 text-emerald-700",
        orange: "bg-orange-100 text-orange-700",
        gray: "bg-gray-100 text-gray-500",
    };
    return (
        <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${colorMap[color] ?? colorMap.gray}`}>
            {value || fallback}
        </span>
    );
}
