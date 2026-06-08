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

            // Food & Drink
            'mdi:coffee', 'mdi:tea', 'mdi:glass-wine', 'mdi:glass-cocktail',
            'mdi:food', 'mdi:silverware', 'mdi:pizza', 'mdi:hamburger', 'mdi:cake',

            // Nature & Weather
            'mdi:weather-sunny', 'mdi:weather-night', 'mdi:weather-cloudy', 'mdi:weather-rainy',
            'mdi:weather-snowy', 'mdi:weather-lightning', 'mdi:weather-windy', 'mdi:weather-fog',
            'mdi:tree', 'mdi:leaf', 'mdi:flower', 'mdi:sprout', 'mdi:pine-tree',
            'mdi:water', 'mdi:waves', 'mdi:mountain',

            // Health & Medical
            'mdi:heart-pulse', 'mdi:hospital', 'mdi:medical-bag', 'mdi:pill',
            'mdi:needle', 'mdi:thermometer', 'mdi:ambulance', 'mdi:bandage',
            'mdi:dna', 'mdi:microscope', 'mdi:test-tube', 'mdi:flask',

            // Education & Learning
            'mdi:book', 'mdi:book-open', 'mdi:book-outline', 'mdi:school', 'mdi:library',
            'mdi:pencil-ruler', 'mdi:ruler', 'mdi:graduation-cap', 'mdi:teach',

            // Sports & Activities
            'mdi:soccer', 'mdi:basketball', 'mdi:football', 'mdi:tennis',
            'mdi:dumbbell', 'mdi:run', 'mdi:swim',

            // Shapes & Symbols
            'mdi:circle', 'mdi:circle-outline', 'mdi:square', 'mdi:square-outline',
            'mdi:triangle', 'mdi:triangle-outline', 'mdi:hexagon', 'mdi:hexagon-outline',
            'mdi:diamond', 'mdi:diamond-outline', 'mdi:crown-outline', 'mdi:infinity',

            // Text & Formatting
            'mdi:format-bold', 'mdi:format-italic', 'mdi:format-underline', 'mdi:format-strikethrough',
            'mdi:format-align-left', 'mdi:format-align-center', 'mdi:format-align-right', 'mdi:format-align-justify',
            'mdi:format-list-bulleted', 'mdi:format-list-numbered', 'mdi:format-indent-increase', 'mdi:format-indent-decrease',

            // Security & Privacy
            'mdi:shield-lock', 'mdi:shield-account', 'mdi:eye', 'mdi:eye-off',
            'mdi:incognito', 'mdi:security', 'mdi:vpn',

            // Social & Sharing
            'mdi:rss', 'mdi:wifi-strength-4', 'mdi:signal', 'mdi:podcast',
            'mdi:share-circle', 'mdi:export', 'mdi:import',

            // Miscellaneous
            'mdi:anchor', 'mdi:umbrella', 'mdi:glasses', 'mdi:sunglasses',
            'mdi:paw', 'mdi:bone', 'mdi:spider-web', 'mdi:ghost',
            'mdi:robot', 'mdi:alien', 'mdi:wizard-hat', 'mdi:magic-staff',
            'mdi:lamp', 'mdi:candle', 'mdi:flashlight', 'mdi:battery-alert'
        ]
    },
    {
        name: 'Heroicons',
        prefix: 'heroicons',
        icons: [
            // Popular & Common (Solid)
            'heroicons:star-solid', 'heroicons:heart-solid', 'heroicons:bolt-solid', 'heroicons:bolt-slash-solid',
            'heroicons:shield-check-solid', 'heroicons:shield-exclamation-solid', 'heroicons:fire-solid',
            'heroicons:check-solid', 'heroicons:check-circle-solid', 'heroicons:x-mark-solid', 'heroicons:x-circle-solid',
            'heroicons:bell-solid', 'heroicons:bell-alert-solid', 'heroicons:bell-slash-solid', 'heroicons:bell-snooze-solid',
            'heroicons:gift-solid', 'heroicons:gift-top-solid', 'heroicons:trophy-solid', 'heroicons:sparkles-solid',
            'heroicons:light-bulb-solid', 'heroicons:chart-bar-solid', 'heroicons:chart-pie-solid', 'heroicons:chart-bar-square-solid',
            'heroicons:globe-alt-solid', 'heroicons:globe-americas-solid', 'heroicons:globe-asia-australia-solid', 'heroicons:globe-europe-africa-solid',
            'heroicons:lock-closed-solid', 'heroicons:lock-open-solid', 'heroicons:key-solid', 'heroicons:finger-print-solid',
            'heroicons:clock-solid', 'heroicons:calendar-solid', 'heroicons:calendar-days-solid',
            'heroicons:envelope-solid', 'heroicons:envelope-open-solid', 'heroicons:inbox-solid', 'heroicons:inbox-arrow-down-solid',
            'heroicons:phone-solid', 'heroicons:phone-arrow-down-left-solid', 'heroicons:phone-arrow-up-right-solid', 'heroicons:phone-x-mark-solid',
            'heroicons:device-phone-mobile-solid', 'heroicons:device-tablet-solid',
            'heroicons:camera-solid', 'heroicons:video-camera-solid', 'heroicons:video-camera-slash-solid',
            'heroicons:photo-solid', 'heroicons:film-solid',
            'heroicons:musical-note-solid', 'heroicons:speaker-wave-solid', 'heroicons:speaker-x-mark-solid',
            'heroicons:microphone-solid', 'heroicons:signal-solid', 'heroicons:signal-slash-solid',
            'heroicons:folder-solid', 'heroicons:folder-open-solid', 'heroicons:folder-plus-solid', 'heroicons:folder-minus-solid',
            'heroicons:document-solid', 'heroicons:document-text-solid', 'heroicons:document-plus-solid', 'heroicons:document-minus-solid',
            'heroicons:cloud-solid', 'heroicons:cloud-arrow-up-solid', 'heroicons:cloud-arrow-down-solid',
            'heroicons:arrow-down-tray-solid', 'heroicons:arrow-up-tray-solid', 'heroicons:arrow-up-on-square-solid', 'heroicons:arrow-up-on-square-stack-solid',
            'heroicons:share-solid', 'heroicons:paper-airplane-solid',
            'heroicons:magnifying-glass-solid', 'heroicons:magnifying-glass-plus-solid', 'heroicons:magnifying-glass-minus-solid', 'heroicons:magnifying-glass-circle-solid',
            'heroicons:cog-6-tooth-solid', 'heroicons:cog-8-tooth-solid', 'heroicons:adjustments-horizontal-solid', 'heroicons:adjustments-vertical-solid',
            'heroicons:wrench-solid', 'heroicons:wrench-screwdriver-solid',
            'heroicons:user-solid', 'heroicons:user-circle-solid', 'heroicons:user-group-solid', 'heroicons:user-plus-solid', 'heroicons:user-minus-solid',
            'heroicons:users-solid', 'heroicons:identification-solid',
            'heroicons:home-solid', 'heroicons:home-modern-solid', 'heroicons:building-office-solid', 'heroicons:building-office-2-solid',
            'heroicons:building-storefront-solid', 'heroicons:building-library-solid',
            'heroicons:briefcase-solid', 'heroicons:shopping-bag-solid', 'heroicons:shopping-cart-solid',
            'heroicons:credit-card-solid', 'heroicons:banknotes-solid', 'heroicons:currency-dollar-solid',
            'heroicons:tag-solid', 'heroicons:ticket-solid', 'heroicons:bookmark-solid', 'heroicons:bookmark-slash-solid', 'heroicons:bookmark-square-solid',
            'heroicons:flag-solid',

            // Navigation & Arrows (Solid)
            'heroicons:arrow-up-solid', 'heroicons:arrow-down-solid', 'heroicons:arrow-left-solid', 'heroicons:arrow-right-solid',
            'heroicons:arrow-up-circle-solid', 'heroicons:arrow-down-circle-solid', 'heroicons:arrow-left-circle-solid', 'heroicons:arrow-right-circle-solid',
            'heroicons:arrow-long-up-solid', 'heroicons:arrow-long-down-solid', 'heroicons:arrow-long-left-solid', 'heroicons:arrow-long-right-solid',
            'heroicons:arrow-top-right-on-square-solid', 'heroicons:arrow-path-solid', 'heroicons:arrow-path-rounded-square-solid',
            'heroicons:arrows-pointing-in-solid', 'heroicons:arrows-pointing-out-solid', 'heroicons:arrows-right-left-solid', 'heroicons:arrows-up-down-solid',
            'heroicons:chevron-up-solid', 'heroicons:chevron-down-solid', 'heroicons:chevron-left-solid', 'heroicons:chevron-right-solid',
            'heroicons:chevron-up-down-solid', 'heroicons:chevron-double-up-solid', 'heroicons:chevron-double-down-solid', 'heroicons:chevron-double-left-solid', 'heroicons:chevron-double-right-solid',
            'heroicons:bars-3-solid', 'heroicons:bars-3-bottom-left-solid', 'heroicons:bars-3-bottom-right-solid', 'heroicons:bars-3-center-left-solid',
            'heroicons:bars-4-solid', 'heroicons:ellipsis-horizontal-solid', 'heroicons:ellipsis-vertical-solid',
            'heroicons:map-solid', 'heroicons:map-pin-solid', 'heroicons:compass-solid',

            // Actions & Controls (Solid)
            'heroicons:play-solid', 'heroicons:play-circle-solid', 'heroicons:play-pause-solid',
            'heroicons:pause-solid', 'heroicons:pause-circle-solid', 'heroicons:stop-solid', 'heroicons:stop-circle-solid',
            'heroicons:forward-solid', 'heroicons:backward-solid',
            'heroicons:plus-solid', 'heroicons:plus-circle-solid', 'heroicons:plus-small-solid',
            'heroicons:minus-solid', 'heroicons:minus-circle-solid', 'heroicons:minus-small-solid',
            'heroicons:pencil-solid', 'heroicons:pencil-square-solid', 'heroicons:pen-solid',
            'heroicons:trash-solid', 'heroicons:archive-box-solid', 'heroicons:archive-box-x-mark-solid', 'heroicons:archive-box-arrow-down-solid',
            'heroicons:clipboard-solid', 'heroicons:clipboard-document-solid', 'heroicons:clipboard-document-check-solid', 'heroicons:clipboard-document-list-solid',
            'heroicons:scissors-solid', 'heroicons:arrow-uturn-left-solid', 'heroicons:arrow-uturn-right-solid',
            'heroicons:printer-solid', 'heroicons:paper-clip-solid', 'heroicons:link-solid', 'heroicons:link-slash-solid',

            // Status & Alerts (Solid)
            'heroicons:information-circle-solid', 'heroicons:exclamation-circle-solid', 'heroicons:exclamation-triangle-solid',
            'heroicons:question-mark-circle-solid', 'heroicons:no-symbol-solid', 'heroicons:hand-raised-solid',
            'heroicons:hand-thumb-up-solid', 'heroicons:hand-thumb-down-solid',
            'heroicons:face-smile-solid', 'heroicons:face-frown-solid',

            // Communication (Solid)
            'heroicons:chat-bubble-left-solid', 'heroicons:chat-bubble-left-right-solid', 'heroicons:chat-bubble-bottom-center-solid', 'heroicons:chat-bubble-bottom-center-text-solid',
            'heroicons:chat-bubble-oval-left-solid', 'heroicons:chat-bubble-oval-left-ellipsis-solid',
            'heroicons:at-symbol-solid', 'heroicons:hashtag-solid',

            // Media & Entertainment (Solid)
            'heroicons:tv-solid', 'heroicons:computer-desktop-solid', 'heroicons:presentation-chart-bar-solid', 'heroicons:presentation-chart-line-solid',
            'heroicons:puzzle-piece-solid', 'heroicons:cube-solid', 'heroicons:cube-transparent-solid',

            // Business & Finance (Solid)
            'heroicons:currency-euro-solid', 'heroicons:currency-pound-solid', 'heroicons:currency-rupee-solid', 'heroicons:currency-yen-solid',
            'heroicons:currency-bangladeshi-solid', 'heroicons:wallet-solid', 'heroicons:receipt-percent-solid', 'heroicons:receipt-refund-solid',
            'heroicons:calculator-solid', 'heroicons:scale-solid',

            // Technology & Devices (Solid)
            'heroicons:wifi-solid', 'heroicons:rss-solid',
            'heroicons:battery-0-solid', 'heroicons:battery-50-solid', 'heroicons:battery-100-solid',
            'heroicons:power-solid',
            'heroicons:server-solid', 'heroicons:server-stack-solid', 'heroicons:cpu-chip-solid',
            'heroicons:qr-code-solid', 'heroicons:command-line-solid', 'heroicons:code-bracket-solid', 'heroicons:code-bracket-square-solid',

            // Transportation (Solid)
            'heroicons:truck-solid', 'heroicons:rocket-launch-solid',

            // Nature & Weather (Solid)
            'heroicons:sun-solid', 'heroicons:moon-solid',

            // Health & Medical (Solid)
            'heroicons:bug-ant-solid',

            // Education & Learning (Solid)
            'heroicons:book-open-solid', 'heroicons:academic-cap-solid',
            'heroicons:language-solid', 'heroicons:newspaper-solid',

            // Shapes & Symbols (Solid)
            'heroicons:square-2-stack-solid', 'heroicons:square-3-stack-3d-solid', 'heroicons:squares-2x2-solid', 'heroicons:squares-plus-solid',
            'heroicons:rectangle-group-solid', 'heroicons:rectangle-stack-solid',

            // Security & Privacy (Solid)
            'heroicons:eye-dropper-solid',

            // Layout & Design (Solid)
            'heroicons:view-columns-solid', 'heroicons:view-finder-circle-solid', 'heroicons:window-solid',
            'heroicons:funnel-solid', 'heroicons:queue-list-solid', 'heroicons:table-cells-solid',
            'heroicons:list-bullet-solid', 'heroicons:numbered-list-solid',

            // Miscellaneous (Solid)
            'heroicons:lifebuoy-solid', 'heroicons:megaphone-solid',
            'heroicons:swatch-solid', 'heroicons:paint-brush-solid'
        ]
    },
    {
        name: 'Font Awesome',
        prefix: 'fa6-solid',
        icons: [
            // Popular & Common
            'fa6-solid:star', 'fa6-solid:heart', 'fa6-solid:rocket', 'fa6-solid:shield', 'fa6-solid:shield-halved',
            'fa6-solid:bolt', 'fa6-solid:fire', 'fa6-solid:fire-flame-curved', 'fa6-solid:check', 'fa6-solid:xmark',
            'fa6-solid:bell', 'fa6-solid:gift', 'fa6-solid:trophy', 'fa6-solid:award', 'fa6-solid:medal',
            'fa6-solid:bullseye', 'fa6-solid:lightbulb', 'fa6-solid:chart-line', 'fa6-solid:chart-bar', 'fa6-solid:chart-pie',
            'fa6-solid:globe', 'fa6-solid:earth-americas', 'fa6-solid:earth-europe', 'fa6-solid:earth-asia',
            'fa6-solid:lock', 'fa6-solid:unlock', 'fa6-solid:key', 'fa6-solid:fingerprint',
            'fa6-solid:clock', 'fa6-solid:calendar', 'fa6-solid:calendar-days', 'fa6-solid:calendar-check',
            'fa6-solid:envelope', 'fa6-solid:envelope-open', 'fa6-solid:phone', 'fa6-solid:mobile',
            'fa6-solid:camera', 'fa6-solid:video', 'fa6-solid:image', 'fa6-solid:images',
            'fa6-solid:music', 'fa6-solid:headphones', 'fa6-solid:microphone', 'fa6-solid:volume-high',
            'fa6-solid:folder', 'fa6-solid:folder-open', 'fa6-solid:file', 'fa6-solid:file-lines',
            'fa6-solid:cloud', 'fa6-solid:cloud-arrow-up', 'fa6-solid:cloud-arrow-down',
            'fa6-solid:download', 'fa6-solid:upload', 'fa6-solid:share', 'fa6-solid:share-nodes',
            'fa6-solid:magnifying-glass', 'fa6-solid:magnifying-glass-plus', 'fa6-solid:magnifying-glass-minus',
            'fa6-solid:gear', 'fa6-solid:gears', 'fa6-solid:sliders', 'fa6-solid:wrench', 'fa6-solid:screwdriver-wrench',
            'fa6-solid:user', 'fa6-solid:users', 'fa6-solid:user-group', 'fa6-solid:user-plus', 'fa6-solid:user-minus',
            'fa6-solid:house', 'fa6-solid:building', 'fa6-solid:store', 'fa6-solid:shop',
            'fa6-solid:briefcase', 'fa6-solid:suitcase', 'fa6-solid:bag-shopping',
            'fa6-solid:cart-shopping', 'fa6-solid:basket-shopping', 'fa6-solid:credit-card', 'fa6-solid:money-bill',
            'fa6-solid:tag', 'fa6-solid:tags', 'fa6-solid:bookmark', 'fa6-solid:flag',

            // Navigation & Arrows
            'fa6-solid:arrow-up', 'fa6-solid:arrow-down', 'fa6-solid:arrow-left', 'fa6-solid:arrow-right',
            'fa6-solid:arrow-up-right-from-square', 'fa6-solid:arrow-rotate-right', 'fa6-solid:arrow-rotate-left',
            'fa6-solid:angles-up', 'fa6-solid:angles-down', 'fa6-solid:angles-left', 'fa6-solid:angles-right',
            'fa6-solid:chevron-up', 'fa6-solid:chevron-down', 'fa6-solid:chevron-left', 'fa6-solid:chevron-right',
            'fa6-solid:circle-arrow-up', 'fa6-solid:circle-arrow-down', 'fa6-solid:circle-arrow-left', 'fa6-solid:circle-arrow-right',
            'fa6-solid:location-dot', 'fa6-solid:map', 'fa6-solid:map-location-dot', 'fa6-solid:compass',

            // Actions & Controls
            'fa6-solid:play', 'fa6-solid:pause', 'fa6-solid:stop', 'fa6-solid:forward', 'fa6-solid:backward',
            'fa6-solid:plus', 'fa6-solid:minus', 'fa6-solid:circle-plus', 'fa6-solid:circle-minus',
            'fa6-solid:pen', 'fa6-solid:pen-to-square', 'fa6-solid:pencil', 'fa6-solid:eraser',
            'fa6-solid:trash', 'fa6-solid:trash-can', 'fa6-solid:copy', 'fa6-solid:paste',
            'fa6-solid:scissors', 'fa6-solid:clone', 'fa6-solid:rotate', 'fa6-solid:rotate-right',
            'fa6-solid:print', 'fa6-solid:floppy-disk', 'fa6-solid:paperclip', 'fa6-solid:link',

            // Status & Alerts
            'fa6-solid:circle-check', 'fa6-solid:circle-xmark', 'fa6-solid:circle-exclamation', 'fa6-solid:circle-info',
            'fa6-solid:triangle-exclamation', 'fa6-solid:circle-question', 'fa6-solid:ban',
            'fa6-solid:thumbs-up', 'fa6-solid:thumbs-down', 'fa6-solid:face-smile', 'fa6-solid:face-frown',

            // Communication
            'fa6-solid:comment', 'fa6-solid:comments', 'fa6-solid:message', 'fa6-solid:inbox',
            'fa6-solid:paper-plane', 'fa6-solid:at', 'fa6-solid:hashtag', 'fa6-solid:quote-left',

            // Media & Entertainment
            'fa6-solid:film', 'fa6-solid:tv', 'fa6-solid:gamepad', 'fa6-solid:puzzle-piece',
            'fa6-solid:dice', 'fa6-solid:chess', 'fa6-solid:palette', 'fa6-solid:paintbrush',

            // Business & Finance
            'fa6-solid:dollar-sign', 'fa6-solid:euro-sign', 'fa6-solid:sterling-sign', 'fa6-solid:yen-sign',
            'fa6-solid:wallet', 'fa6-solid:coins', 'fa6-solid:receipt', 'fa6-solid:calculator',
            'fa6-solid:chart-simple', 'fa6-solid:scale-balanced', 'fa6-solid:handshake',

            // Technology & Devices
            'fa6-solid:laptop', 'fa6-solid:desktop', 'fa6-solid:tablet', 'fa6-solid:mobile-screen',
            'fa6-solid:keyboard', 'fa6-solid:mouse', 'fa6-solid:wifi', 'fa6-solid:signal',
            'fa6-solid:battery-full', 'fa6-solid:battery-half', 'fa6-solid:plug', 'fa6-solid:power-off',
            'fa6-solid:server', 'fa6-solid:database', 'fa6-solid:hard-drive', 'fa6-solid:microchip',

            // Transportation
            'fa6-solid:car', 'fa6-solid:truck', 'fa6-solid:bus', 'fa6-solid:bicycle', 'fa6-solid:motorcycle',
            'fa6-solid:plane', 'fa6-solid:helicopter', 'fa6-solid:ship', 'fa6-solid:train', 'fa6-solid:taxi',

            // Food & Drink
            'fa6-solid:mug-hot', 'fa6-solid:mug-saucer', 'fa6-solid:wine-glass', 'fa6-solid:martini-glass',
            'fa6-solid:utensils', 'fa6-solid:pizza-slice', 'fa6-solid:burger', 'fa6-solid:cake-candles',

            // Nature & Weather
            'fa6-solid:sun', 'fa6-solid:moon', 'fa6-solid:cloud-sun', 'fa6-solid:cloud-moon',
            'fa6-solid:cloud-rain', 'fa6-solid:cloud-bolt', 'fa6-solid:snowflake', 'fa6-solid:wind',
            'fa6-solid:tree', 'fa6-solid:leaf', 'fa6-solid:seedling', 'fa6-solid:mountain',

            // Health & Medical
            'fa6-solid:heart-pulse', 'fa6-solid:stethoscope', 'fa6-solid:syringe', 'fa6-solid:pills',
            'fa6-solid:hospital', 'fa6-solid:truck-medical', 'fa6-solid:user-doctor', 'fa6-solid:notes-medical',
            'fa6-solid:dna', 'fa6-solid:microscope', 'fa6-solid:vial', 'fa6-solid:thermometer',

            // Education & Learning
            'fa6-solid:book', 'fa6-solid:book-open', 'fa6-solid:graduation-cap', 'fa6-solid:school',
            'fa6-solid:chalkboard', 'fa6-solid:chalkboard-user', 'fa6-solid:pen-ruler', 'fa6-solid:highlighter',

            // Sports & Activities
            'fa6-solid:futbol', 'fa6-solid:basketball', 'fa6-solid:baseball', 'fa6-solid:volleyball',
            'fa6-solid:dumbbell', 'fa6-solid:person-running', 'fa6-solid:person-swimming', 'fa6-solid:person-biking',

            // Shapes & Symbols
            'fa6-solid:circle', 'fa6-solid:square', 'fa6-solid:diamond', 'fa6-solid:crown',
            'fa6-solid:gem', 'fa6-solid:infinity',

            // Text & Formatting
            'fa6-solid:bold', 'fa6-solid:italic', 'fa6-solid:underline', 'fa6-solid:strikethrough',
            'fa6-solid:align-left', 'fa6-solid:align-center', 'fa6-solid:align-right', 'fa6-solid:align-justify',
            'fa6-solid:list', 'fa6-solid:list-ul', 'fa6-solid:list-ol', 'fa6-solid:indent',

            // Security & Privacy
            'fa6-solid:shield-virus', 'fa6-solid:user-shield', 'fa6-solid:lock-open', 'fa6-solid:eye',
            'fa6-solid:eye-slash', 'fa6-solid:user-secret', 'fa6-solid:mask',

            // Social & Sharing
            'fa6-solid:rss', 'fa6-solid:podcast',
            'fa6-solid:square-rss', 'fa6-solid:share-from-square', 'fa6-solid:retweet',

            // Miscellaneous
            'fa6-solid:anchor', 'fa6-solid:umbrella', 'fa6-solid:glasses',
            'fa6-solid:paw', 'fa6-solid:bone', 'fa6-solid:spider', 'fa6-solid:ghost',
            'fa6-solid:robot', 'fa6-solid:dragon', 'fa6-solid:hat-wizard', 'fa6-solid:wand-magic-sparkles'
        ]
    },
    {
        name: 'Lucide',
        prefix: 'lucide',
        icons: [
            // Popular & Common
            'lucide:star', 'lucide:heart', 'lucide:rocket', 'lucide:shield', 'lucide:shield-check',
            'lucide:zap', 'lucide:flame', 'lucide:check', 'lucide:check-circle', 'lucide:x',
            'lucide:bell', 'lucide:gift', 'lucide:trophy', 'lucide:award', 'lucide:medal',
            'lucide:target', 'lucide:lightbulb', 'lucide:trending-up', 'lucide:trending-down', 'lucide:bar-chart',
            'lucide:globe', 'lucide:globe-2', 'lucide:earth', 'lucide:map', 'lucide:map-pin',
            'lucide:lock', 'lucide:unlock', 'lucide:key', 'lucide:fingerprint',
            'lucide:clock', 'lucide:calendar', 'lucide:calendar-days', 'lucide:calendar-check',
            'lucide:mail', 'lucide:inbox', 'lucide:phone',
            'lucide:camera', 'lucide:video', 'lucide:image', 'lucide:images',
            'lucide:music', 'lucide:headphones', 'lucide:mic', 'lucide:volume-2',
            'lucide:folder', 'lucide:folder-open', 'lucide:file', 'lucide:file-text',
            'lucide:cloud', 'lucide:cloud-upload', 'lucide:cloud-download',
            'lucide:download', 'lucide:upload', 'lucide:share', 'lucide:share-2',
            'lucide:search', 'lucide:zoom-in', 'lucide:zoom-out',
            'lucide:settings', 'lucide:sliders', 'lucide:tool', 'lucide:wrench',
            'lucide:user', 'lucide:users', 'lucide:user-plus', 'lucide:user-minus', 'lucide:user-check',
            'lucide:home', 'lucide:building', 'lucide:building-2', 'lucide:store',
            'lucide:briefcase', 'lucide:shopping-bag', 'lucide:shopping-cart',
            'lucide:credit-card', 'lucide:wallet', 'lucide:banknote',
            'lucide:tag', 'lucide:tags', 'lucide:bookmark', 'lucide:flag',

            // Navigation & Arrows
            'lucide:arrow-up', 'lucide:arrow-down', 'lucide:arrow-left', 'lucide:arrow-right',
            'lucide:arrow-up-right', 'lucide:arrow-down-left', 'lucide:external-link',
            'lucide:chevron-up', 'lucide:chevron-down', 'lucide:chevron-left', 'lucide:chevron-right',
            'lucide:chevrons-up', 'lucide:chevrons-down', 'lucide:chevrons-left', 'lucide:chevrons-right',
            'lucide:move', 'lucide:move-diagonal', 'lucide:navigation', 'lucide:compass',
            'lucide:corner-up-left', 'lucide:corner-up-right', 'lucide:corner-down-left', 'lucide:corner-down-right',

            // Actions & Controls
            'lucide:play', 'lucide:pause', 'lucide:stop-circle', 'lucide:skip-forward', 'lucide:skip-back',
            'lucide:fast-forward', 'lucide:rewind', 'lucide:repeat', 'lucide:shuffle',
            'lucide:plus', 'lucide:minus', 'lucide:plus-circle', 'lucide:minus-circle',
            'lucide:edit', 'lucide:edit-2', 'lucide:edit-3', 'lucide:pen-tool',
            'lucide:trash', 'lucide:trash-2', 'lucide:copy', 'lucide:clipboard',
            'lucide:scissors', 'lucide:rotate-cw', 'lucide:rotate-ccw', 'lucide:refresh-cw',
            'lucide:printer', 'lucide:save', 'lucide:paperclip', 'lucide:link', 'lucide:link-2',

            // Status & Alerts
            'lucide:check-circle-2', 'lucide:x-circle', 'lucide:alert-circle', 'lucide:info',
            'lucide:alert-triangle', 'lucide:help-circle', 'lucide:ban',
            'lucide:thumbs-up', 'lucide:thumbs-down', 'lucide:smile', 'lucide:frown',
            'lucide:meh', 'lucide:laugh', 'lucide:angry',

            // Communication
            'lucide:message-circle', 'lucide:message-square', 'lucide:messages-square',
            'lucide:send', 'lucide:at-sign', 'lucide:hash', 'lucide:quote',

            // Media & Entertainment
            'lucide:film', 'lucide:tv', 'lucide:monitor', 'lucide:gamepad', 'lucide:gamepad-2',
            'lucide:puzzle', 'lucide:dice-1', 'lucide:dice-2', 'lucide:dice-3',

            // Business & Finance
            'lucide:dollar-sign', 'lucide:euro', 'lucide:pound-sterling', 'lucide:yen',
            'lucide:coins', 'lucide:receipt', 'lucide:calculator',
            'lucide:pie-chart', 'lucide:bar-chart-2', 'lucide:line-chart', 'lucide:activity',
            'lucide:scale', 'lucide:handshake',

            // Technology & Devices
            'lucide:laptop', 'lucide:pc', 'lucide:tablet', 'lucide:smartphone',
            'lucide:keyboard', 'lucide:mouse', 'lucide:wifi',
            'lucide:battery', 'lucide:battery-charging', 'lucide:plug', 'lucide:power',
            'lucide:server', 'lucide:database', 'lucide:hard-drive', 'lucide:cpu',
            'lucide:bluetooth', 'lucide:usb', 'lucide:cast', 'lucide:airplay',

            // Transportation
            'lucide:car', 'lucide:truck', 'lucide:bus', 'lucide:bike', 'lucide:train',
            'lucide:plane', 'lucide:ship', 'lucide:anchor', 'lucide:fuel',

            // Food & Drink
            'lucide:coffee', 'lucide:cup-soda', 'lucide:wine', 'lucide:beer',
            'lucide:utensils', 'lucide:pizza', 'lucide:cake', 'lucide:apple',

            // Nature & Weather
            'lucide:sun', 'lucide:moon', 'lucide:sunrise', 'lucide:sunset',
            'lucide:cloud-rain', 'lucide:cloud-snow', 'lucide:cloud-lightning', 'lucide:wind',
            'lucide:droplet', 'lucide:droplets', 'lucide:umbrella',
            'lucide:tree-deciduous', 'lucide:tree-pine', 'lucide:leaf', 'lucide:sprout',
            'lucide:flower', 'lucide:flower-2', 'lucide:mountain', 'lucide:mountain-snow',

            // Health & Medical
            'lucide:heart-pulse', 'lucide:stethoscope', 'lucide:syringe', 'lucide:pill',
            'lucide:hospital', 'lucide:ambulance', 'lucide:thermometer',
            'lucide:dna', 'lucide:microscope', 'lucide:test-tube', 'lucide:beaker',

            // Education & Learning
            'lucide:book', 'lucide:book-open', 'lucide:graduation-cap', 'lucide:school',
            'lucide:library', 'lucide:pen', 'lucide:highlighter',

            // Sports & Activities
            'lucide:football', 'lucide:dumbbell',

            // Shapes & Symbols
            'lucide:circle', 'lucide:square', 'lucide:triangle', 'lucide:hexagon',
            'lucide:diamond', 'lucide:crown', 'lucide:gem', 'lucide:infinity',

            // Text & Formatting
            'lucide:bold', 'lucide:italic', 'lucide:underline', 'lucide:strikethrough',
            'lucide:align-left', 'lucide:align-center', 'lucide:align-right', 'lucide:align-justify',
            'lucide:list', 'lucide:list-ordered', 'lucide:indent', 'lucide:outdent',
            'lucide:type', 'lucide:heading', 'lucide:heading-1', 'lucide:heading-2',

            // Security & Privacy
            'lucide:shield-alert', 'lucide:lock-keyhole',
            'lucide:eye', 'lucide:eye-off', 'lucide:user-x', 'lucide:scan',

            // Social & Sharing
            'lucide:rss', 'lucide:podcast', 'lucide:radio',

            // Layout & Design
            'lucide:layout', 'lucide:layout-grid', 'lucide:layout-list', 'lucide:columns',
            'lucide:rows', 'lucide:sidebar', 'lucide:panel-left', 'lucide:panel-right',
            'lucide:maximize', 'lucide:minimize', 'lucide:expand', 'lucide:shrink',

            // Code & Development
            'lucide:code', 'lucide:code-2', 'lucide:terminal', 'lucide:command',
            'lucide:git-branch', 'lucide:git-commit', 'lucide:git-merge', 'lucide:git-pull-request',
            'lucide:github', 'lucide:gitlab', 'lucide:package', 'lucide:box',

            // Time & Date
            'lucide:timer', 'lucide:alarm-clock', 'lucide:hourglass', 'lucide:watch',

            // Miscellaneous
            'lucide:glasses', 'lucide:sun-glasses',
            'lucide:lamp', 'lucide:lamp-desk', 'lucide:lamp-floor', 'lucide:lamp-wall-down',
            'lucide:palette', 'lucide:paintbrush', 'lucide:pipette', 'lucide:ruler',
            'lucide:hammer', 'lucide:axe', 'lucide:shovel',
            'lucide:pickaxe', 'lucide:construction', 'lucide:cone', 'lucide:traffic-cone',
            'lucide:package-2', 'lucide:package-check', 'lucide:package-x',
            'lucide:archive', 'lucide:mail-open', 'lucide:mail-plus',
            'lucide:bell-ring', 'lucide:bell-off', 'lucide:volume', 'lucide:volume-1',
            'lucide:volume-x', 'lucide:mic-off', 'lucide:phone-call', 'lucide:phone-incoming',
            'lucide:phone-outgoing', 'lucide:phone-missed', 'lucide:phone-off',
            'lucide:voicemail', 'lucide:bluetooth-connected', 'lucide:bluetooth-searching',
            'lucide:wifi-off', 'lucide:signal', 'lucide:signal-high', 'lucide:signal-low',
            'lucide:signal-medium', 'lucide:signal-zero', 'lucide:antenna',
            'lucide:battery-full', 'lucide:battery-low', 'lucide:battery-medium',
            'lucide:battery-warning', 'lucide:plug-zap', 'lucide:power-off',
            'lucide:zap-off', 'lucide:flashlight', 'lucide:flashlight-off'
        ]
    },
    {
        name: 'Social Media',
        prefix: 'social',
        icons: [
            // Facebook
            'mdi:facebook', 'mdi:facebook-box', 'mdi:facebook-messenger',
            'fa6-brands:facebook', 'fa6-brands:facebook-f', 'fa6-brands:facebook-messenger',
            'logos:facebook',

            // Instagram
            'mdi:instagram', 'fa6-brands:instagram', 'skill-icons:instagram',
            'logos:instagram-icon',

            // Twitter / X
            'mdi:twitter', 'fa6-brands:twitter', 'fa6-brands:x-twitter',
            'simple-icons:x',

            // YouTube
            'mdi:youtube', 'fa6-brands:youtube', 'logos:youtube-icon',
            'mdi:youtube-play',

            // TikTok
            'fa6-brands:tiktok', 'simple-icons:tiktok', 'logos:tiktok-icon',

            // WhatsApp
            'mdi:whatsapp', 'fa6-brands:whatsapp', 'logos:whatsapp-icon',
            'simple-icons:whatsapp',

            // Telegram
            'fa6-brands:telegram', 'mdi:telegram', 'logos:telegram',
            'simple-icons:telegram',

            // LinkedIn
            'mdi:linkedin', 'fa6-brands:linkedin', 'fa6-brands:linkedin-in',
            'logos:linkedin-icon',

            // Pinterest
            'mdi:pinterest', 'fa6-brands:pinterest', 'fa6-brands:pinterest-p',
            'logos:pinterest',

            // Snapchat
            'mdi:snapchat', 'fa6-brands:snapchat', 'simple-icons:snapchat',

            // Reddit
            'mdi:reddit', 'fa6-brands:reddit', 'fa6-brands:reddit-alien',
            'logos:reddit-icon',

            // Discord
            'mdi:discord', 'fa6-brands:discord', 'logos:discord-icon',
            'simple-icons:discord',

            // Twitch
            'mdi:twitch', 'fa6-brands:twitch', 'logos:twitch',

            // GitHub
            'mdi:github', 'fa6-brands:github', 'fa6-brands:github-alt',
            'logos:github-icon',

            // Slack
            'mdi:slack', 'fa6-brands:slack', 'logos:slack-icon',

            // Skype
            'mdi:skype', 'fa6-brands:skype', 'logos:skype',

            // Viber
            'fa6-brands:viber', 'simple-icons:viber',

            // Signal
            'simple-icons:signal',

            // Line
            'fa6-brands:line', 'simple-icons:line',

            // WeChat
            'fa6-brands:weixin', 'simple-icons:wechat',

            // Tumblr
            'mdi:tumblr', 'fa6-brands:tumblr',

            // Vimeo
            'mdi:vimeo', 'fa6-brands:vimeo', 'fa6-brands:vimeo-v',

            // Spotify
            'mdi:spotify', 'fa6-brands:spotify', 'logos:spotify-icon',

            // SoundCloud
            'fa6-brands:soundcloud', 'simple-icons:soundcloud',

            // Medium
            'fa6-brands:medium', 'simple-icons:medium',

            // Quora
            'fa6-brands:quora', 'simple-icons:quora',

            // Dribbble
            'mdi:dribbble', 'fa6-brands:dribbble', 'logos:dribbble-icon',

            // Behance
            'mdi:behance', 'fa6-brands:behance', 'logos:behance',

            // Patreon
            'fa6-brands:patreon', 'simple-icons:patreon',

            // Ko-fi
            'simple-icons:kofi',

            // Buy Me a Coffee
            'simple-icons:buymeacoffee',

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
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2 border border-gray-300 rounded bg-white hover:bg-gray-50 flex items-center justify-between"
            >
                <div className="flex items-center gap-2">
                    {value ? (
                        <>
                            <Icon icon={value} className="w-6 h-6 text-blue-600" />
                            <span className="text-sm text-gray-700">{value}</span>
                        </>
                    ) : (
                        <span className="text-sm text-gray-400">{placeholder || 'Select an icon'}</span>
                    )}
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {mounted && isOpen && createPortal(
                <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/30" style={{ zIndex: 9999 }} onClick={() => setIsOpen(false)}>
                    <div className="relative w-full max-w-7xl bg-white rounded-lg shadow-2xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg shrink-0">
                            <h3 className="text-lg font-semibold text-gray-900">Select Icon</h3>
                            <button type="button" onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-gray-200 rounded-full">
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
                                    className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${selectedCollection === index ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {collection.name}
                                    {index === 0 && <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">{collection.icons.length}</span>}
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
                                <div className="grid grid-cols-4 md:grid-cols-12 gap-2">
                                    {filteredIcons.map((icon) => (
                                        <button
                                            key={icon}
                                            type="button"
                                            onClick={() => { onChange(icon); setIsOpen(false) }}
                                            className={`group relative aspect-square p-2 rounded-lg hover:bg-blue-50 transition-all flex items-center justify-center ${value === icon ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-50'
                                                }`}
                                            title={icon}
                                        >
                                            <Icon icon={icon} className="w-12 h-12 text-gray-700 group-hover:text-blue-600" />
                                            {value === icon && (
                                                <div className="absolute top-1 right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
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
                            <span className="font-medium">{filteredIcons.length}</span> icons available
                            {searchTerm && <span className="ml-2">• "{searchTerm}"</span>}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
