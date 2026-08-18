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
import { usePathname } from 'next/navigation';
import { Icon } from '@iconify/react';
import type { MenuItem } from '@/models/Menu';

// ─── Active URL Helpers ───────────────────────────────────────────────────────

function checkIsActive(pathname: string, url?: string): boolean {
    if (!url || url === '#' || url === '') return false;
    const normPath = pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    const normUrl = url !== '/' && url.endsWith('/') ? url.slice(0, -1) : url;
    if (normUrl === '/') return normPath === '/';
    return normPath === normUrl || normPath.startsWith(normUrl + '/');
}

function isItemOrChildActive(item: MenuItem, pathname: string): boolean {
    if (checkIsActive(pathname, item.url)) return true;
    if (item.children && item.children.length > 0) {
        return item.children.some((child) => isItemOrChildActive(child, pathname));
    }
    return false;
}

interface MobileDrawerProps {
    items: MenuItem[];
    settings?: Record<string, any>;
    iconColor?: string;
    icon?: string;
    iconSize?: number;
    className?: string;
}

export default function MobileDrawer({
    items,
    settings = {},
    iconColor = 'currentColor',
    icon = 'ep:menu',
    iconSize = 30,
    className = '',
}: MobileDrawerProps) {
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
                className={`p-2 rounded-lg hover:bg-black/10 transition ${className || 'md:hidden'}`}
            >
                <Icon icon={icon} width={iconSize} style={{ color: iconColor }} />
            </button>

            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 bg-black/50 z-9998"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Drawer */}
            <div
                className={`fixed inset-y-0 left-0 z-9999 w-[85vw] max-w-sm bg-white shadow-2xl flex flex-col transition-transform duration-300 ${
                    open ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Drawer header */}
                <div className="flex items-center justify-between p-2 md:p-4 border-b">
                    <Link href="/" className="text-xl font-extrabold text-gray-900 tracking-tight shrink-0 flex items-center">
                        {settings.logo ? (
                            <img
                                src={settings.logo}
                                alt={settings.siteName}
                                className={settings.header_logo_height || settings.headerLogoHeight ? "w-auto object-contain" : "h-8 w-auto object-contain"}
                                style={{
                                    height: settings.header_logo_height
                                        ? `${settings.header_logo_height}px`
                                        : settings.headerLogoHeight
                                        ? `${settings.headerLogoHeight}px`
                                        : undefined,
                                }}
                            />
                        ) : (
                            settings.siteName
                        )}
                    </Link>
                    <button type="button" onClick={() => setOpen(false)}
                        aria-label="Close menu"
                        className="p-2 rounded-lg transition text-gray-500">
                        <Icon icon="material-symbols:close" width={25} />
                    </button>
                </div>

                {/* Nav items */}
                <nav className="flex-1 overflow-y-auto">
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
        <ul className="divide-y divide-gray-200">
            {items.map((item) => (
                <DrawerItem key={item.id} item={item} onClose={onClose} depth={depth} />
            ))}
        </ul>
    );
}

function DrawerItem({ item, onClose, depth }: { item: MenuItem; onClose: () => void; depth: number }) {
    const pathname = usePathname();
    const [expanded, setExpanded] = useState(false);
    const hasChildren = (item.children?.length ?? 0) > 0;
    const isActive = isItemOrChildActive(item, pathname);

    return (
        <li>
            <div
                className={`flex items-center gap-2 rounded-lg px-3 py-2.5 transition ${
                    isActive ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'
                }`}
                style={{ paddingLeft: depth > 0 ? `${12 + depth * 16}px` : undefined }}
            >
                {item.image && (
                    <Image width={24} height={24} src={item.image} alt={item.label}
                        className="w-6 h-6 object-cover rounded shrink-0" unoptimized />
                )}
                <Link
                    href={item.url}
                    onClick={onClose}
                    className={`flex-1 text-sm font-medium transition-colors ${
                        isActive ? 'text-emerald-700 font-bold' : 'text-gray-800'
                    }`}
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
