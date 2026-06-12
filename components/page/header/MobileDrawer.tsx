'use client';

/**
 * MobileDrawer
 *
 * Full-screen slide-in drawer for mobile navigation.
 * Receives pre-fetched menu items from the parent server component.
 * Handles its own open/close state.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@iconify/react';
import type { MenuItem } from '@/models/Menu';

interface MobileDrawerProps {
    items: MenuItem[];
    siteName?: string;
    /** CSS colour for the burger button icon */
    iconColor?: string;
}

export default function MobileDrawer({ items, siteName = 'MySite', iconColor = 'currentColor' }: MobileDrawerProps) {
    const [open, setOpen] = useState(false);

    // Prevent body scroll when drawer is open
    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    return (
        <>
            {/* Hamburger trigger */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Open mobile menu"
                className="md:hidden p-2 rounded-lg hover:bg-black/10 transition"
            >
                <Icon icon="solar:hamburger-menu-bold" width={22} style={{ color: iconColor }} />
            </button>

            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 bg-black/50 z-[9998] md:hidden"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Drawer */}
            <div
                className={`fixed inset-y-0 left-0 z-[9999] w-[85vw] max-w-sm bg-white shadow-2xl flex flex-col transition-transform duration-300 md:hidden ${
                    open ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Drawer header */}
                <div className="flex items-center justify-between px-5 py-4 border-b">
                    <Link href="/" onClick={() => setOpen(false)}
                        className="text-lg font-extrabold text-gray-900 tracking-tight">
                        {siteName}
                    </Link>
                    <button type="button" onClick={() => setOpen(false)}
                        aria-label="Close menu"
                        className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500">
                        <Icon icon="solar:close-bold" width={20} />
                    </button>
                </div>

                {/* Nav items */}
                <nav className="flex-1 overflow-y-auto py-4 px-3">
                    {items.length === 0 ? (
                        <p className="text-sm text-gray-400 px-3 py-2">No menu items.</p>
                    ) : (
                        <DrawerItems items={items} onClose={() => setOpen(false)} depth={0} />
                    )}
                </nav>
            </div>
        </>
    );
}

// ─── Recursive drawer items ───────────────────────────────────────────────────

function DrawerItems({ items, onClose, depth }: { items: MenuItem[]; onClose: () => void; depth: number }) {
    return (
        <ul className="space-y-0.5">
            {items.map((item) => (
                <DrawerItem key={item.id} item={item} onClose={onClose} depth={depth} />
            ))}
        </ul>
    );
}

function DrawerItem({ item, onClose, depth }: { item: MenuItem; onClose: () => void; depth: number }) {
    const [expanded, setExpanded] = useState(false);
    const hasChildren = (item.children?.length ?? 0) > 0;

    return (
        <li>
            <div
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-gray-50 transition"
                style={{ paddingLeft: depth > 0 ? `${12 + depth * 16}px` : undefined }}
            >
                {item.image && (
                    <Image width={24} height={24} src={item.image} alt={item.label}
                        className="w-6 h-6 object-cover rounded shrink-0" unoptimized />
                )}
                <Link
                    href={item.url}
                    onClick={onClose}
                    className="flex-1 text-sm font-medium text-gray-800"
                >
                    {item.label}
                </Link>
                {hasChildren && (
                    <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition"
                        aria-label={expanded ? 'Collapse' : 'Expand'}
                    >
                        <Icon
                            icon={expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}
                            width={18}
                        />
                    </button>
                )}
            </div>

            {hasChildren && expanded && (
                <DrawerItems items={item.children!} onClose={onClose} depth={depth + 1} />
            )}
        </li>
    );
}
