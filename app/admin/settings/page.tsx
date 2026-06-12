"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import FormSettings from "@/components/admin/FormSettings";
import { useActivePlugins } from "@/hook/useActivePlugins";
import useSettings from "@/lib/useSettings";

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
        key:         "general",
        label:       "General",
        icon:        "solar:settings-bold",
        settingType: "settings",
        description: "Site identity, logo, contact info and default SEO.",
    },
    {
        key:         "header",
        label:       "Header",
        icon:        "solar:widget-2-bold",
        settingType: "header",
        description: "Assign menus to header slots and configure header behaviour.",
    },
    {
        key:         "nav",
        label:       "Navigation",
        icon:        "solar:menu-dots-bold",
        settingType: "nav",
        description: "Nav bar colours, typography and spacing.",
    },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
    const activePlugins         = useActivePlugins();
    const { settings, loading } = useSettings();
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
                    Configure your site's general options, navigation menus and header appearance.
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
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                                    isActive
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

            {/* Tab content — each tab gets its own FormSettings instance */}
            {activeTab === "general" && (
                <FormSettings
                    type="settings"
                    activePlugins={activePlugins}
                    initialValues={settings}
                />
            )}

            {activeTab === "header" && (
                <HeaderTab
                    activePlugins={activePlugins}
                    initialValues={settings}
                />
            )}

            {activeTab === "nav" && (
                <FormSettings
                    type="nav"
                    activePlugins={activePlugins}
                    initialValues={settings}
                />
            )}
        </div>
    );
}

// ─── Header tab ───────────────────────────────────────────────────────────────

/**
 * The Header tab renders a FormSettings for the "header" type plus a
 * live-preview card showing which menu is assigned to each slot.
 */
function HeaderTab({
    activePlugins,
    initialValues,
}: {
    activePlugins: string[];
    initialValues: Record<string, any>;
}) {
    // Slot labels displayed in the preview diagram
    const slots = [
        { key: "header_main_menu",   label: "Main Menu",      icon: "solar:menu-dots-bold",          color: "bg-blue-100 text-blue-700" },
        { key: "header_mobile_menu", label: "Mobile Menu",    icon: "solar:smartphone-bold",         color: "bg-purple-100 text-purple-700" },
        { key: "header_top_menu",    label: "Top Bar Menu",   icon: "solar:slider-minimalistic-bold", color: "bg-emerald-100 text-emerald-700" },
        { key: "header_right_menu",  label: "Right Side Menu", icon: "solar:arrow-right-bold",       color: "bg-orange-100 text-orange-700" },
        { key: "header_footer_menu", label: "Footer Menu",    icon: "solar:footer-bold",             color: "bg-gray-100 text-gray-700" },
    ];

    return (
        <div className="space-y-8">
            {/* Slot overview */}
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

            {/* Header layout diagram */}
            <div className="rounded-xl border border-dashed border-gray-300 overflow-hidden">
                <div className="bg-gray-100 px-4 py-1.5 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
                    Header preview (schematic)
                </div>
                <div className="bg-white">
                    {/* Top bar */}
                    <div className="flex items-center justify-between px-6 py-1.5 bg-gray-800 text-xs text-gray-300">
                        <span className="opacity-60">Top bar</span>
                        <SlotPreviewPill value={initialValues.header_top_menu} fallback="header_top_menu" />
                    </div>
                    {/* Main header row */}
                    <div className="flex items-center justify-between px-6 py-4 border-b">
                        {/* Logo */}
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-indigo-100 flex items-center justify-center">
                                <Icon icon="solar:star-bold" width={14} className="text-indigo-500" />
                            </div>
                            <span className="text-sm font-bold text-gray-700">Logo</span>
                        </div>
                        {/* Main menu */}
                        <SlotPreviewPill value={initialValues.header_main_menu} fallback="header_main_menu" color="blue" />
                        {/* Right side */}
                        <SlotPreviewPill value={initialValues.header_right_menu} fallback="header_right_menu" color="orange" />
                        {/* Mobile burger */}
                        <div className="flex items-center gap-1.5 md:hidden">
                            <Icon icon="solar:hamburger-menu-bold" width={18} className="text-gray-500" />
                            <SlotPreviewPill value={initialValues.header_mobile_menu} fallback="mobile" color="purple" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Form fields */}
            <FormSettings
                type="header"
                activePlugins={activePlugins}
                initialValues={initialValues}
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
        blue:    "bg-blue-100 text-blue-700",
        purple:  "bg-purple-100 text-purple-700",
        emerald: "bg-emerald-100 text-emerald-700",
        orange:  "bg-orange-100 text-orange-700",
        gray:    "bg-gray-100 text-gray-500",
    };
    return (
        <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${colorMap[color] ?? colorMap.gray}`}>
            {value || fallback}
        </span>
    );
}
