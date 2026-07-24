'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'

type IconifyPickerProps = {
    value: string
    onChange: (value: string) => void
    placeholder?: string
}

const ICON_COLLECTIONS = [
    {
        name: 'All',
        prefix: 'all',
        icons: []
    },
    {
        name: 'Material Design',
        prefix: 'mdi',
        icons: [
            // Popular & Common
            'mdi:star', 'mdi:star-outline', 'mdi:star-half-full', 'mdi:heart', 'mdi:heart-outline',
            'mdi:rocket-launch', 'mdi:rocket', 'mdi:shield-check', 'mdi:shield', 'mdi:shield-outline',
            'mdi:lightning-bolt', 'mdi:flash', 'mdi:fire', 'mdi:check', 'mdi:check-circle',
            'mdi:check-circle-outline', 'mdi:close', 'mdi:close-circle', 'mdi:close-circle-outline',
            'mdi:bell', 'mdi:bell-outline', 'mdi:bell-ring', 'mdi:gift', 'mdi:gift-outline',
            'mdi:trophy', 'mdi:trophy-outline', 'mdi:medal', 'mdi:award', 'mdi:crown',
            'mdi:target', 'mdi:bullseye', 'mdi:lightbulb', 'mdi:lightbulb-outline', 'mdi:lightbulb-on',
            'mdi:chart-line', 'mdi:chart-bar', 'mdi:chart-pie', 'mdi:chart-areaspline', 'mdi:trending-up',
            'mdi:earth', 'mdi:web', 'mdi:map', 'mdi:map-marker', 'mdi:compass',
            'mdi:lock', 'mdi:lock-outline', 'mdi:lock-open', 'mdi:key', 'mdi:fingerprint',
            'mdi:clock', 'mdi:clock-outline', 'mdi:timer', 'mdi:alarm', 'mdi:hourglass',
            'mdi:calendar', 'mdi:calendar-blank', 'mdi:calendar-check', 'mdi:calendar-clock',
            'mdi:email', 'mdi:email-outline', 'mdi:email-open', 'mdi:inbox', 'mdi:send',
            'mdi:phone', 'mdi:phone-outline', 'mdi:cellphone', 'mdi:tablet',
            'mdi:camera', 'mdi:camera-outline', 'mdi:video', 'mdi:video-outline', 'mdi:image', 'mdi:image-multiple',
            'mdi:music', 'mdi:music-note', 'mdi:headphones', 'mdi:microphone', 'mdi:volume-high',
            'mdi:folder', 'mdi:folder-outline', 'mdi:folder-open', 'mdi:file', 'mdi:file-document',
            'mdi:cloud', 'mdi:cloud-outline', 'mdi:cloud-upload', 'mdi:cloud-download',
            'mdi:download', 'mdi:upload', 'mdi:share', 'mdi:share-variant',
            'mdi:magnify', 'mdi:magnify-plus', 'mdi:magnify-minus', 'mdi:zoom-in', 'mdi:zoom-out',
            'mdi:cog', 'mdi:cog-outline', 'mdi:settings', 'mdi:tune', 'mdi:wrench',
            'mdi:account', 'mdi:account-outline', 'mdi:account-circle', 'mdi:account-group', 'mdi:account-multiple',
            'mdi:home', 'mdi:home-outline', 'mdi:office-building', 'mdi:store', 'mdi:domain',
            'mdi:briefcase', 'mdi:briefcase-outline', 'mdi:bag-personal', 'mdi:wallet',
            'mdi:cart', 'mdi:cart-outline', 'mdi:shopping', 'mdi:basket', 'mdi:credit-card',
            'mdi:tag', 'mdi:tag-outline', 'mdi:tag-multiple', 'mdi:bookmark', 'mdi:bookmark-outline',

            // Navigation & Arrows
            'mdi:arrow-up', 'mdi:arrow-down', 'mdi:arrow-left', 'mdi:arrow-right',
            'mdi:arrow-up-bold', 'mdi:arrow-down-bold', 'mdi:arrow-left-bold', 'mdi:arrow-right-bold',
            'mdi:chevron-up', 'mdi:chevron-down', 'mdi:chevron-left', 'mdi:chevron-right',
            'mdi:chevron-double-up', 'mdi:chevron-double-down', 'mdi:chevron-double-left', 'mdi:chevron-double-right',
            'mdi:menu', 'mdi:menu-open', 'mdi:dots-vertical', 'mdi:dots-horizontal',
            'mdi:navigation', 'mdi:crosshairs', 'mdi:map-marker-radius',

            // Actions & Controls
            'mdi:play', 'mdi:pause', 'mdi:stop', 'mdi:skip-forward', 'mdi:skip-backward',
            'mdi:fast-forward', 'mdi:rewind', 'mdi:repeat', 'mdi:shuffle',
            'mdi:plus', 'mdi:minus', 'mdi:plus-circle', 'mdi:minus-circle',
            'mdi:pencil', 'mdi:pencil-outline', 'mdi:pen', 'mdi:eraser',
            'mdi:delete', 'mdi:delete-outline', 'mdi:trash-can', 'mdi:restore',
            'mdi:content-copy', 'mdi:content-cut', 'mdi:content-paste', 'mdi:clipboard',
            'mdi:rotate-left', 'mdi:rotate-right', 'mdi:refresh', 'mdi:sync',
            'mdi:printer', 'mdi:floppy', 'mdi:paperclip', 'mdi:link', 'mdi:link-variant',

            // Status & Alerts
            'mdi:information', 'mdi:information-outline', 'mdi:alert', 'mdi:alert-circle',
            'mdi:alert-outline', 'mdi:help-circle', 'mdi:help-circle-outline',
            'mdi:thumb-up', 'mdi:thumb-down', 'mdi:emoticon', 'mdi:emoticon-happy',
            'mdi:emoticon-sad', 'mdi:emoticon-neutral', 'mdi:flag', 'mdi:flag-outline',

            // Communication
            'mdi:comment', 'mdi:comment-outline', 'mdi:comment-multiple', 'mdi:message',
            'mdi:message-text', 'mdi:forum', 'mdi:chat', 'mdi:at',

            // Media & Entertainment
            'mdi:movie', 'mdi:film', 'mdi:television', 'mdi:monitor', 'mdi:gamepad',
            'mdi:controller', 'mdi:puzzle', 'mdi:dice-multiple', 'mdi:cards',
            'mdi:palette', 'mdi:palette-outline', 'mdi:brush', 'mdi:format-paint',

            // Business & Finance
            'mdi:currency-usd', 'mdi:currency-eur', 'mdi:currency-gbp', 'mdi:currency-jpy',
            'mdi:cash', 'mdi:cash-multiple', 'mdi:coin', 'mdi:receipt',
            'mdi:calculator', 'mdi:finance', 'mdi:bank', 'mdi:scale-balance',

            // Technology & Devices
            'mdi:laptop', 'mdi:desktop-mac', 'mdi:tablet-android', 'mdi:cellphone-android',
            'mdi:keyboard', 'mdi:mouse', 'mdi:wifi', 'mdi:wifi-off',
            'mdi:battery', 'mdi:battery-charging', 'mdi:power', 'mdi:power-plug',
            'mdi:server', 'mdi:database', 'mdi:harddisk', 'mdi:memory', 'mdi:chip',
            'mdi:usb', 'mdi:bluetooth', 'mdi:cast', 'mdi:airplay',

            // Transportation
            'mdi:car', 'mdi:truck', 'mdi:bus', 'mdi:bike', 'mdi:motorbike',
            'mdi:airplane', 'mdi:helicopter', 'mdi:ship', 'mdi:train', 'mdi:taxi',
            'mdi:ferry', 'mdi:tram', 'mdi:subway', 'mdi:walk',
        ]
    },
    {
        name: 'Solar Icons',
        prefix: 'solar',
        icons: [
            // E-commerce & Shopping
            'solar:bag-bold', 'solar:bag-outline', 'solar:cart-bold', 'solar:cart-outline',
            'solar:cart-large-bold', 'solar:cart-large-minimalistic-bold', 'solar:tag-price-bold',
            'solar:tag-price-outline', 'solar:ticket-sale-bold', 'solar:card-bold', 'solar:wallet-bold',

            // UI & Elements
            'solar:home-bold', 'solar:home-outline', 'solar:settings-bold', 'solar:settings-outline',
            'solar:user-bold', 'solar:user-outline', 'solar:users-group-rounded-bold',
            'solar:magnifer-bold', 'solar:magnifer-outline', 'solar:bell-bold', 'solar:bell-outline',
            'solar:chat-round-dots-bold', 'solar:envelope-bold', 'solar:phone-bold',

            // Files & Content
            'solar:document-bold', 'solar:document-outline', 'solar:file-text-bold',
            'solar:folder-bold', 'solar:folder-with-files-bold', 'solar:gallery-bold',

            // Media & Controls
            'solar:play-bold', 'solar:pause-bold', 'solar:slider-vertical-bold',
            'solar:refresh-square-bold', 'solar:alt-arrow-left-bold', 'solar:alt-arrow-right-bold',

            // Miscellaneous
            'solar:star-bold', 'solar:heart-bold', 'solar:eye-bold', 'solar:lock-bold',
            'solar:shield-check-bold', 'solar:trash-bin-trash-bold', 'solar:add-circle-bold'
        ]
    },
    {
        name: 'Social & Brands',
        prefix: 'social',
        icons: [
            // Facebook
            'mdi:facebook', 'mdi:facebook-box', 'fa6-brands:facebook', 'fa6-brands:facebook-f', 'logos:facebook',

            // Twitter / X
            'mdi:twitter', 'fa6-brands:twitter', 'fa6-brands:x-twitter', 'simple-icons:x',

            // Instagram
            'mdi:instagram', 'fa6-brands:instagram', 'logos:instagram-icon',

            // LinkedIn
            'mdi:linkedin', 'fa6-brands:linkedin', 'fa6-brands:linkedin-in', 'logos:linkedin-icon',

            // YouTube
            'mdi:youtube', 'fa6-brands:youtube', 'logos:youtube-icon',

            // TikTok
            'fa6-brands:tiktok', 'simple-icons:tiktok',

            // Pinterest
            'mdi:pinterest', 'fa6-brands:pinterest', 'fa6-brands:pinterest-p',

            // WhatsApp
            'mdi:whatsapp', 'fa6-brands:whatsapp', 'logos:whatsapp-icon',

            // Telegram
            'fa6-brands:telegram', 'logos:telegram',

            // Reddit
            'mdi:reddit', 'fa6-brands:reddit', 'fa6-brands:reddit-alien',

            // Discord
            'fa6-brands:discord', 'logos:discord-icon',

            // Snapchat
            'fa6-brands:snapchat', 'logos:snapchat-icon',

            // GitHub
            'mdi:github', 'fa6-brands:github',

            // Gitlab
            'mdi:gitlab', 'fa6-brands:gitlab',

            // Email / RSS
            'mdi:email', 'mdi:rss', 'fa6-solid:rss', 'fa6-solid:envelope',
        ]
    }
]

ICON_COLLECTIONS[0].icons = ICON_COLLECTIONS.slice(1).flatMap(c => c.icons)

export default function IconifyPicker({ value, onChange, placeholder }: IconifyPickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCollection, setSelectedCollection] = useState(0)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const currentCollection = ICON_COLLECTIONS[selectedCollection]
    const filteredIcons = [...new Set(currentCollection.icons.filter(icon =>
        icon.toLowerCase().includes(searchTerm.toLowerCase())
    ))]

    return (
        <div className="relative group">
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 flex items-center justify-between transition shadow-sm"
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        {value ? (
                            <>
                                <Icon icon={value} className="w-5 h-5 text-indigo-600 shrink-0" />
                                <span className="text-sm text-gray-800 font-mono font-medium truncate">{value}</span>
                            </>
                        ) : (
                            <span className="text-sm text-gray-400">{placeholder || 'Select an icon'}</span>
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
                            onChange('');
                        }}
                        className="p-2 border border-gray-200 hover:border-red-300 rounded-lg text-gray-400 hover:text-red-600 bg-white hover:bg-red-50 transition shrink-0"
                        title="Remove icon"
                    >
                        <Icon icon="solar:trash-bin-trash-bold" className="w-4 h-4" />
                    </button>
                )}
            </div>

            {mounted && isOpen && createPortal(
                <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" style={{ zIndex: 9999 }} onClick={() => setIsOpen(false)}>
                    <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50/80 shrink-0">
                            <div className="flex items-center gap-3">
                                <h3 className="text-base font-bold text-gray-900">Select Icon</h3>
                                {value && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onChange('');
                                            setIsOpen(false);
                                        }}
                                        className="px-2.5 py-1 rounded-md bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition flex items-center gap-1.5 border border-red-200"
                                    >
                                        <Icon icon="solar:trash-bin-trash-bold" className="w-3.5 h-3.5" />
                                        Remove Icon
                                    </button>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-full transition"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Search input */}
                        <div className="p-4 border-b border-gray-100 shrink-0 bg-white">
                            <div className="relative">
                                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search icons by name..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Collection tabs */}
                        <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50/50 shrink-0">
                            {ICON_COLLECTIONS.map((collection, index) => (
                                <button
                                    key={collection.prefix}
                                    type="button"
                                    onClick={() => setSelectedCollection(index)}
                                    className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${selectedCollection === index ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                                        }`}
                                >
                                    {collection.name}
                                    {index === 0 && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-indigo-100 text-indigo-700 rounded-full font-mono">{collection.icons.length}</span>}
                                </button>
                            ))}
                        </div>

                        {/* Icons Grid */}
                        <div className="flex-1 overflow-y-auto p-4 min-h-0">
                            {filteredIcons.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                    <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-xs font-medium">No icons found</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-10 gap-2">
                                    {filteredIcons.map((icon) => (
                                        <button
                                            key={icon}
                                            type="button"
                                            onClick={() => { onChange(icon); setIsOpen(false) }}
                                            className={`group relative aspect-square p-2.5 rounded-xl border hover:border-indigo-500 hover:bg-indigo-50/60 transition flex items-center justify-center ${value === icon ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20' : 'bg-white border-gray-200'
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
                        <div className="p-3 border-t border-gray-200 bg-gray-50 text-[11px] text-gray-500 text-center rounded-b-2xl shrink-0 font-mono">
                            <span>{filteredIcons.length}</span> icons available
                            {searchTerm && <span className="ml-2 text-indigo-600 font-sans">• "{searchTerm}"</span>}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
