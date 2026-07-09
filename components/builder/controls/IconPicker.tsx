"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";

interface Props {
    value: string;
    onChange: (v: string) => void;
    label?: string;
    placeholder?: string;
}

const ICON_COLLECTIONS = [
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

ICON_COLLECTIONS[0].icons = ICON_COLLECTIONS.slice(1).flatMap((c) => c.icons);

export default function IconPicker({ value, onChange, label, placeholder }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCollection, setSelectedCollection] = useState(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const currentCollection = ICON_COLLECTIONS[selectedCollection];
    const filteredIcons = [
        ...new Set(
            currentCollection.icons.filter((icon) =>
                icon.toLowerCase().includes(searchTerm.toLowerCase())
            )
        ),
    ];

    return (
        <div>
            {label && (
                <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>
            )}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2 border border-gray-200 rounded bg-white hover:bg-gray-50 flex items-center justify-between text-left cursor-pointer"
            >
                <div className="flex items-center gap-2 min-w-0">
                    {value ? (
                        <>
                            <Icon icon={value} className="w-5 h-5 text-blue-600 shrink-0" />
                            <span className="text-[13px] text-gray-700 truncate">{value}</span>
                        </>
                    ) : (
                        <span className="text-[13px] text-gray-400">{placeholder || "Select an icon"}</span>
                    )}
                </div>
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {mounted &&
                isOpen &&
                createPortal(
                    <div
                        className="fixed inset-0 flex items-center justify-center p-4 bg-black/30"
                        style={{ zIndex: 9999 }}
                        onClick={() => setIsOpen(false)}
                    >
                        <div
                            className="relative w-full max-w-5xl bg-white rounded-lg shadow-2xl flex flex-col max-h-[85vh]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg shrink-0">
                                <h3 className="text-lg font-semibold text-gray-900">Select Icon</h3>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 hover:bg-gray-200 rounded-full cursor-pointer"
                                >
                                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="p-4 border-b border-gray-200 shrink-0">
                                <div className="relative">
                                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search icons..."
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex overflow-x-auto border-b border-gray-200 bg-white shrink-0">
                                {ICON_COLLECTIONS.map((collection, index) => (
                                    <button
                                        key={collection.prefix}
                                        type="button"
                                        onClick={() => setSelectedCollection(index)}
                                        className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                                            selectedCollection === index
                                                ? "border-blue-600 text-blue-600 bg-blue-50"
                                                : "border-transparent text-gray-600 hover:bg-gray-50"
                                        }`}
                                    >
                                        {collection.name}
                                        {index === 0 && (
                                            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                                                {collection.icons.length}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 min-h-0">
                                {filteredIcons.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-sm font-medium">No icons found</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-6 md:grid-cols-10 gap-2">
                                        {filteredIcons.map((icon) => (
                                            <button
                                                key={icon}
                                                type="button"
                                                onClick={() => {
                                                    onChange(icon);
                                                    setIsOpen(false);
                                                }}
                                                className={`group relative aspect-square p-2 rounded-lg hover:bg-blue-50 transition-all flex items-center justify-center cursor-pointer ${
                                                    value === icon ? "bg-blue-100 ring-2 ring-blue-500" : "bg-gray-50"
                                                }`}
                                                title={icon}
                                            >
                                                <Icon icon={icon} className="w-8 h-8 text-gray-700 group-hover:text-blue-600" />
                                                {value === icon && (
                                                    <div className="absolute top-1 right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
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

                            <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 text-center rounded-b-lg shrink-0">
                                <span className="font-medium">{filteredIcons.length}</span> icons
                                {searchTerm && <span className="ml-2">for &quot;{searchTerm}&quot;</span>}
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}
