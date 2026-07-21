'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import Search from './Search'

interface SearchPopUpProps {
    currencySymbol?: string
    type?: string
    iconColor?: string
    fontSize?: number | string
}

export default function SearchPopUp({ currencySymbol = '', type = 'products', fontSize, iconColor }: SearchPopUpProps) {
    const [open, setOpen] = useState(false)
    const [visible, setVisible] = useState(false) // controls DOM presence
    const overlayRef = useRef<HTMLDivElement>(null)

    const openPopup = () => {
        setVisible(true)
        // small delay so the element is in DOM before animation starts
        requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)))
    }

    const closePopup = () => {
        setOpen(false)
        // wait for slide-up animation to finish before unmounting
        setTimeout(() => setVisible(false), 300)
    }

    // close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closePopup() }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [])

    return (
        <>
            {/* Trigger icon */}
            <button
                onClick={(e) => { e.stopPropagation(); openPopup() }}
                aria-label="Open search"
                className="hover:opacity-70 transition-opacity"
                style={iconColor ? { color: iconColor } : undefined}
            >
                <Icon icon="mdi:magnify" fontSize={fontSize} />
            </button>

            {/* Popup — always in DOM when visible, animated via class */}
            {visible && (
                <div
                    ref={overlayRef}
                    className="fixed left-0 right-0 top-0 z-50 w-full bg-black overflow-hidden transition-all duration-300 ease-in-out"
                    style={{
                        maxHeight: open ? '120px' : '0px',
                        opacity: open ? 1 : 0,
                    }}
                >
                    <div
                        className="relative container flex items-center p-2 md:gap-2"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <Search type={type} currencySymbol={currencySymbol} className="w-full relative" />
                        <button
                            onClick={closePopup}
                            aria-label="Close search"
                            className="text-white hover:opacity-70 transition-opacity shrink-0"
                        >
                            <Icon icon="mdi:close" width={28} />
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
