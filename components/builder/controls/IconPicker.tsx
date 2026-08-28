"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";

export type IconCollection = {
    name: string;
    prefix: string;
    icons: string[];
};

interface Props {
    value: string;
    onChange: (v: string) => void;
    label?: string;
    placeholder?: string;
    className?: string;
    customCollections?: IconCollection[];
}

const DEFAULT_ICON_COLLECTIONS: IconCollection[] = [
    {
        name: "All",
        prefix: "all",
        icons: [] as string[],
    },
    {
        name: "Material Design",
        prefix: "mdi",
        icons: [
            "mdi:star", "mdi:star-outline", "mdi:heart", "mdi:heart-outline",
            "mdi:rocket-launch", "mdi:rocket", "mdi:shield-check", "mdi:shield",
            "mdi:lightning-bolt", "mdi:fire", "mdi:check", "mdi:check-circle",
            "mdi:close", "mdi:close-circle", "mdi:bell", "mdi:gift",
            "mdi:trophy", "mdi:medal", "mdi:award", "mdi:crown",
            "mdi:target", "mdi:bullseye", "mdi:lightbulb", "mdi:lightbulb-outline",
            "mdi:chart-line", "mdi:chart-bar", "mdi:chart-pie", "mdi:trending-up",
            "mdi:earth", "mdi:web", "mdi:map", "mdi:map-marker", "mdi:compass",
            "mdi:lock", "mdi:lock-outline", "mdi:lock-open", "mdi:key", "mdi:fingerprint",
            "mdi:clock", "mdi:clock-outline", "mdi:timer", "mdi:alarm",
            "mdi:calendar", "mdi:calendar-blank", "mdi:calendar-check",
            "mdi:email", "mdi:email-outline", "mdi:send",
            "mdi:phone", "mdi:phone-outline", "mdi:cellphone",
            "mdi:camera", "mdi:video", "mdi:image", "mdi:image-multiple",
            "mdi:music", "mdi:headphones", "mdi:microphone", "mdi:volume-high",
            "mdi:folder", "mdi:folder-outline", "mdi:file", "mdi:file-document",
            "mdi:cloud", "mdi:cloud-upload", "mdi:cloud-download",
            "mdi:download", "mdi:upload", "mdi:share", "mdi:share-variant",
            "mdi:magnify", "mdi:cog", "mdi:cog-outline", "mdi:settings", "mdi:wrench",
            "mdi:account", "mdi:account-outline", "mdi:account-circle",
            "mdi:home", "mdi:home-outline", "mdi:store", "mdi:domain",
            "mdi:briefcase", "mdi:cart", "mdi:cart-outline", "mdi:shopping",
            "mdi:credit-card", "mdi:tag", "mdi:bookmark", "mdi:flag",
            "mdi:arrow-left", "mdi:arrow-right", "mdi:arrow-up", "mdi:arrow-down",
            "mdi:chevron-left", "mdi:chevron-right", "mdi:chevron-up", "mdi:chevron-down",
            "mdi:menu", "mdi:plus", "mdi:minus", "mdi:pencil", "mdi:delete",
            "mdi:play", "mdi:pause", "mdi:stop", "mdi:skip-forward", "mdi:skip-backward",
            "mdi:refresh", "mdi:sync", "mdi:printer", "mdi:link",
            "mdi:information", "mdi:alert", "mdi:help-circle",
            "mdi:thumb-up", "mdi:thumb-down", "mdi:comment", "mdi:message",
            "mdi:eye", "mdi:eye-off", "mdi:magnify-plus", "mdi:magnify-minus",
        ],
    },
    {
        name: "Solar Icons",
        prefix: "solar",
        icons: [
            // Real Estate & Property
            "solar:home-bold", "solar:home-outline", "solar:home-2-bold", "solar:home-2-outline",
            "solar:home-smile-bold", "solar:buildings-bold", "solar:buildings-2-bold", "solar:buildings-3-bold",
            "solar:bed-bold", "solar:bath-bold", "solar:bath-outline", "solar:ruler-angular-bold",
            "solar:garage-bold", "solar:swimming-bold", "solar:sofa-bold", "solar:lamp-bold",

            // E-commerce & Shopping
            "solar:bag-bold", "solar:bag-outline", "solar:cart-bold", "solar:cart-outline",
            "solar:cart-large-bold", "solar:cart-large-minimalistic-bold", "solar:tag-price-bold",
            "solar:tag-price-outline", "solar:ticket-sale-bold", "solar:card-bold", "solar:wallet-bold",

            // UI & Elements
            "solar:settings-bold", "solar:settings-outline", "solar:user-bold", "solar:user-outline",
            "solar:users-group-rounded-bold", "solar:magnifer-bold", "solar:magnifer-outline",
            "solar:bell-bold", "solar:bell-outline", "solar:chat-round-dots-bold", "solar:envelope-bold",
            "solar:phone-bold", "solar:map-point-bold", "solar:calendar-bold", "solar:calendar-linear",

            // Files & Content
            "solar:document-bold", "solar:document-outline", "solar:file-text-bold",
            "solar:folder-bold", "solar:folder-with-files-bold", "solar:gallery-bold",

            // Media & Controls
            "solar:play-bold", "solar:pause-bold", "solar:slider-vertical-bold",
            "solar:refresh-square-bold", "solar:alt-arrow-left-bold", "solar:alt-arrow-right-bold",

            // Miscellaneous
            "solar:star-bold", "solar:heart-bold", "solar:eye-bold", "solar:lock-bold",
            "solar:shield-check-bold", "solar:trash-bin-trash-bold", "solar:add-circle-bold",
            "solar:verified-check-bold", "solar:widget-add-bold", "solar:layers-bold"
        ],
    },
    {
        name: "Heroicons",
        prefix: "heroicons",
        icons: [
            "heroicons:star-solid", "heroicons:heart-solid", "heroicons:bolt-solid",
            "heroicons:shield-check-solid", "heroicons:fire-solid",
            "heroicons:check-solid", "heroicons:x-mark-solid",
            "heroicons:bell-solid", "heroicons:gift-solid", "heroicons:trophy-solid",
            "heroicons:light-bulb-solid", "heroicons:chart-bar-solid",
            "heroicons:globe-alt-solid", "heroicons:lock-closed-solid",
            "heroicons:clock-solid", "heroicons:calendar-solid",
            "heroicons:envelope-solid", "heroicons:phone-solid",
            "heroicons:camera-solid", "heroicons:photo-solid",
            "heroicons:folder-solid", "heroicons:document-solid",
            "heroicons:cloud-solid", "heroicons:arrow-down-tray-solid",
            "heroicons:share-solid", "heroicons:magnifying-glass-solid",
            "heroicons:cog-6-tooth-solid", "heroicons:wrench-solid",
            "heroicons:user-solid", "heroicons:home-solid",
            "heroicons:building-office-solid", "heroicons:briefcase-solid",
            "heroicons:shopping-cart-solid", "heroicons:credit-card-solid",
            "heroicons:tag-solid", "heroicons:bookmark-solid", "heroicons:flag-solid",
            "heroicons:arrow-left-solid", "heroicons:arrow-right-solid",
            "heroicons:chevron-left-solid", "heroicons:chevron-right-solid",
            "heroicons:play-solid", "heroicons:pause-solid",
            "heroicons:plus-solid", "heroicons:minus-solid",
            "heroicons:pencil-solid", "heroicons:trash-solid",
            "heroicons:information-circle-solid", "heroicons:exclamation-circle-solid",
            "heroicons:chat-bubble-left-solid", "heroicons:eye-solid",
        ],
    },
    {
        name: "Font Awesome",
        prefix: "fa6-solid",
        icons: [
            "fa6-solid:star", "fa6-solid:heart", "fa6-solid:rocket", "fa6-solid:shield",
            "fa6-solid:bolt", "fa6-solid:fire", "fa6-solid:check", "fa6-solid:xmark",
            "fa6-solid:bell", "fa6-solid:gift", "fa6-solid:trophy", "fa6-solid:medal",
            "fa6-solid:bullseye", "fa6-solid:lightbulb", "fa6-solid:chart-line",
            "fa6-solid:globe", "fa6-solid:lock", "fa6-solid:unlock", "fa6-solid:key",
            "fa6-solid:clock", "fa6-solid:calendar", "fa6-solid:envelope",
            "fa6-solid:phone", "fa6-solid:camera", "fa6-solid:video", "fa6-solid:image",
            "fa6-solid:music", "fa6-solid:headphones", "fa6-solid:microphone",
            "fa6-solid:folder", "fa6-solid:file", "fa6-solid:cloud",
            "fa6-solid:download", "fa6-solid:upload", "fa6-solid:share", "fa6-solid:link",
            "fa6-solid:magnifying-glass", "fa6-solid:gear", "fa6-solid:wrench",
            "fa6-solid:user", "fa6-solid:house", "fa6-solid:building", "fa6-solid:store",
            "fa6-solid:briefcase", "fa6-solid:cart-shopping", "fa6-solid:credit-card",
            "fa6-solid:tag", "fa6-solid:bookmark", "fa6-solid:flag",
            "fa6-solid:arrow-left", "fa6-solid:arrow-right",
            "fa6-solid:chevron-left", "fa6-solid:chevron-right",
            "fa6-solid:play", "fa6-solid:pause", "fa6-solid:stop",
            "fa6-solid:plus", "fa6-solid:minus", "fa6-solid:pen", "fa6-solid:trash",
            "fa6-solid:circle-check", "fa6-solid:circle-info",
            "fa6-solid:comment", "fa6-solid:message", "fa6-solid:eye", "fa6-solid:eye-slash",
        ],
    },
    {
        name: "Lucide",
        prefix: "lucide",
        icons: [
            "lucide:star", "lucide:heart", "lucide:rocket", "lucide:shield",
            "lucide:zap", "lucide:flame", "lucide:check", "lucide:x",
            "lucide:bell", "lucide:gift", "lucide:trophy", "lucide:award",
            "lucide:target", "lucide:lightbulb", "lucide:trending-up",
            "lucide:globe", "lucide:map", "lucide:map-pin", "lucide:compass",
            "lucide:lock", "lucide:unlock", "lucide:key", "lucide:fingerprint",
            "lucide:clock", "lucide:calendar", "lucide:mail", "lucide:phone",
            "lucide:camera", "lucide:video", "lucide:image", "lucide:images",
            "lucide:music", "lucide:headphones", "lucide:mic", "lucide:volume-2",
            "lucide:folder", "lucide:file", "lucide:cloud", "lucide:download",
            "lucide:upload", "lucide:share", "lucide:search", "lucide:settings",
            "lucide:user", "lucide:users", "lucide:home", "lucide:building",
            "lucide:briefcase", "lucide:shopping-bag", "lucide:shopping-cart",
            "lucide:credit-card", "lucide:wallet", "lucide:tag", "lucide:bookmark",
            "lucide:arrow-left", "lucide:arrow-right", "lucide:arrow-up", "lucide:arrow-down",
            "lucide:chevron-left", "lucide:chevron-right", "lucide:chevron-up", "lucide:chevron-down",
            "lucide:plus", "lucide:minus", "lucide:edit", "lucide:trash",
            "lucide:play", "lucide:pause", "lucide:stop-circle",
            "lucide:info", "lucide:alert-circle", "lucide:help-circle",
            "lucide:message-circle", "lucide:send", "lucide:eye", "lucide:eye-off",
            "lucide:bold", "lucide:italic", "lucide:underline",
            "lucide:align-left", "lucide:align-center", "lucide:align-right",
        ],
    },
    {
        name: "Social",
        prefix: "social",
        icons: [
            "mdi:facebook", "mdi:instagram", "mdi:twitter", "mdi:youtube",
            "mdi:linkedin", "mdi:github", "mdi:discord", "mdi:reddit",
            "mdi:whatsapp", "mdi:telegram", "mdi:twitch", "mdi:tiktok",
            "mdi:pinterest", "mdi:snapchat", "mdi:spotify",
            "fa6-brands:facebook", "fa6-brands:instagram", "fa6-brands:twitter",
            "fa6-brands:youtube", "fa6-brands:linkedin", "fa6-brands:github",
            "fa6-brands:discord", "fa6-brands:reddit", "fa6-brands:whatsapp",
            "fa6-brands:telegram", "fa6-brands:tiktok", "fa6-brands:spotify",
        ],
    },
];

export default function IconPicker({
    value,
    onChange,
    label,
    placeholder,
    className = "",
    customCollections = []
}: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [customInputValue, setCustomInputValue] = useState("");
    const [selectedCollection, setSelectedCollection] = useState(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Merge default, custom collections, and dedicated custom tab
    const collections: IconCollection[] = [
        ...DEFAULT_ICON_COLLECTIONS,
        ...customCollections,
        {
            name: "Custom Tab",
            prefix: "custom",
            icons: [] as string[],
        },
    ];

    // Populate the 'All' collection (index 0) with all icons across collections
    collections[0].icons = collections.slice(1).flatMap((c) => c.icons);

    const currentCollection = collections[selectedCollection] || collections[0];
    const isCustomTab = currentCollection.prefix === "custom";

    const filteredIcons = [
        ...new Set(
            currentCollection.icons.filter((icon) =>
                icon.toLowerCase().includes(searchTerm.toLowerCase())
            )
        ),
    ];

    const handleApplyCustom = (iconStr: string) => {
        const trimmed = iconStr.trim();
        if (trimmed) {
            onChange(trimmed);
            setIsOpen(false);
        }
    };

    return (
        <div className={className}>
            {label && (
                <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>
            )}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => {
                        setCustomInputValue(value || "");
                        setIsOpen(!isOpen);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 flex items-center justify-between text-left cursor-pointer transition shadow-2xs"
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        {value ? (
                            <>
                                <Icon icon={value} className="w-5 h-5 text-indigo-600 shrink-0" />
                                <span className="text-sm text-gray-800 font-mono font-medium truncate">{value}</span>
                            </>
                        ) : (
                            <span className="text-sm text-gray-400">{placeholder || "Select an icon"}</span>
                        )}
                    </div>
                    <svg className="w-4 h-4 text-gray-400 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {value && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange("");
                        }}
                        className="p-2 border border-gray-200 hover:border-red-300 rounded-lg text-gray-400 hover:text-red-600 bg-white hover:bg-red-50 transition shrink-0 cursor-pointer"
                        title="Remove icon"
                    >
                        <Icon icon="solar:trash-bin-trash-bold" className="w-4 h-4" />
                    </button>
                )}
            </div>

            {mounted &&
                isOpen &&
                createPortal(
                    <div
                        className="fixed inset-0 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
                        style={{ zIndex: 9999 }}
                        onClick={() => setIsOpen(false)}
                    >
                        <div
                            className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50/80 rounded-t-2xl shrink-0">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-base font-bold text-gray-900">Select Icon</h3>
                                    {value && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onChange("");
                                                setIsOpen(false);
                                            }}
                                            className="px-2.5 py-1 rounded-md bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition flex items-center gap-1.5 border border-red-200 cursor-pointer"
                                        >
                                            <Icon icon="solar:trash-bin-trash-bold" className="w-3.5 h-3.5" />
                                            Remove Icon
                                        </button>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-full transition cursor-pointer"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Search and Direct Input */}
                            <div className="p-4 border-b border-gray-100 shrink-0 bg-white space-y-3">
                                <div className="relative">
                                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search icons or type custom name (e.g. solar:bed-bold, mdi:heart, fa6-solid:car)..."
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                {/* Quick Apply typed custom icon name if entered in search */}
                                {searchTerm.trim().length > 2 && (
                                    <div className="flex items-center justify-between p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-white border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
                                                <Icon icon={searchTerm.trim()} className="w-5 h-5" />
                                            </div>
                                            <div className="truncate">
                                                <div className="text-xs font-bold text-gray-900 truncate">
                                                    Use custom icon name: <code className="text-indigo-600 bg-white px-1.5 py-0.5 rounded border border-indigo-100">{searchTerm.trim()}</code>
                                                </div>
                                                <div className="text-[10px] text-gray-500">
                                                    Works with any Iconify icon name or custom class
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleApplyCustom(searchTerm)}
                                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs shrink-0 ml-2 cursor-pointer"
                                        >
                                            Apply Custom Icon
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Collection tabs */}
                            <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50/50 shrink-0">
                                {collections.map((collection, index) => (
                                    <button
                                        key={collection.prefix}
                                        type="button"
                                        onClick={() => setSelectedCollection(index)}
                                        className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                                            selectedCollection === index
                                                ? "border-indigo-600 text-indigo-600 bg-white"
                                                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                                        }`}
                                    >
                                        {collection.prefix === "custom" && (
                                            <Icon icon="solar:pen-bold" className="w-3.5 h-3.5 text-indigo-500" />
                                        )}
                                        <span>{collection.name}</span>
                                        {collection.icons.length > 0 && (
                                            <span className="px-1.5 py-0.2 text-[10px] bg-gray-100 text-gray-600 rounded-full font-mono">
                                                {collection.icons.length}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Main Content: Icons Grid or Custom Tab */}
                            <div className="flex-1 overflow-y-auto p-4 min-h-0">
                                {isCustomTab ? (
                                    <div className="max-w-md mx-auto py-8 space-y-5">
                                        <div className="text-center space-y-1">
                                            <h4 className="text-sm font-bold text-gray-900">Custom Icon / Class Name</h4>
                                            <p className="text-xs text-gray-500">
                                                Enter any Iconify identifier (e.g. <code className="text-indigo-600 bg-gray-100 px-1 rounded">solar:bed-bold</code>, <code className="text-indigo-600 bg-gray-100 px-1 rounded">mdi:home</code>) or custom class.
                                            </p>
                                        </div>

                                        <div className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-200">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-700">Icon Name or Class</label>
                                                <input
                                                    type="text"
                                                    value={customInputValue}
                                                    onChange={(e) => setCustomInputValue(e.target.value)}
                                                    placeholder="e.g. solar:bed-bold or fa6-solid:car"
                                                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                            </div>

                                            {/* Preview Box */}
                                            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
                                                <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-indigo-600 shrink-0">
                                                    {customInputValue.trim() ? (
                                                        <Icon icon={customInputValue.trim()} className="w-7 h-7" />
                                                    ) : (
                                                        <Icon icon="solar:eye-linear" className="w-6 h-6 text-gray-300" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-xs font-bold text-gray-800 truncate">
                                                        {customInputValue.trim() || "No icon specified"}
                                                    </div>
                                                    <div className="text-[11px] text-gray-400">Live Icon Preview</div>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                disabled={!customInputValue.trim()}
                                                onClick={() => handleApplyCustom(customInputValue)}
                                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                                            >
                                                <Icon icon="solar:check-circle-bold" className="w-4 h-4" />
                                                Set Custom Icon
                                            </button>
                                        </div>
                                    </div>
                                ) : filteredIcons.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-gray-400 space-y-3">
                                        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-xs font-medium">No icons found in this collection</p>
                                        {searchTerm && (
                                            <button
                                                type="button"
                                                onClick={() => handleApplyCustom(searchTerm)}
                                                className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-bold transition border border-indigo-200 cursor-pointer"
                                            >
                                                Use &quot;{searchTerm}&quot; as custom icon
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-10 gap-2">
                                        {filteredIcons.map((icon) => (
                                            <button
                                                key={icon}
                                                type="button"
                                                onClick={() => {
                                                    onChange(icon);
                                                    setIsOpen(false);
                                                }}
                                                className={`group relative aspect-square p-2.5 rounded-xl border hover:border-indigo-500 hover:bg-indigo-50/60 transition flex items-center justify-center cursor-pointer ${
                                                    value === icon ? "bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20" : "bg-white border-gray-200"
                                                }`}
                                                title={icon}
                                            >
                                                <Icon icon={icon} className="w-7 h-7 text-gray-700 group-hover:text-indigo-600 transition-colors" />
                                                {value === icon && (
                                                    <div className="absolute top-1 right-1 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                                                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer info */}
                            <div className="p-3 border-t border-gray-200 bg-gray-50 text-[11px] text-gray-500 flex items-center justify-between px-4 rounded-b-2xl shrink-0 font-mono">
                                <div>
                                    <span>{filteredIcons.length}</span> icons in collection
                                    {searchTerm && <span className="ml-2 text-indigo-600 font-sans">• &quot;{searchTerm}&quot;</span>}
                                </div>
                                <div className="font-sans text-[11px] text-gray-400">
                                    Current value: <strong className="text-gray-700 font-mono">{value || "None"}</strong>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}
