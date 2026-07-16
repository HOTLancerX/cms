'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@iconify/react';
import { MenuItem } from '@/models/Menu';

import dynamic from 'next/dynamic';
const BuilderClient = dynamic(() => import('@/components/BuilderClient'), { ssr: false });

// ─── Props ────────────────────────────────────────────────────────────────────

interface MenuClientsProps {
    menuItems: MenuItem[];
    settings?: Record<string, any>;
    style?: number;
    className?: string;
    /** Builder content pre-fetched server-side keyed by builderId */
    builderContent?: Record<string, any[]>;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

function useNavColors(settings: Record<string, any>) {
    return {
        navBg:          settings.nav_bg           || 'transparent',
        navText:        settings.nav_text         || '#111827',
        navHighlight:   settings.nav_highlight    || settings.color_main || '#00aaa6',
        navBoxBg:       settings.nav_box_bg       || '#ffffff',
        navBoxText:     settings.nav_box_text     || '#111827',
        navHoverBg:     settings.nav_hover_bg     || '#f3f4f6',
        navHoverText:   settings.nav_hover_text   || settings.color_main || '#00aaa6',
        navBorderColor: settings.nav_border_color || '#e5e7eb',
        navActiveBg:    settings.nav_active_bg    || settings.color_main || '#00aaa6',
        navActiveText:  settings.nav_active_text  || '#ffffff',
        navGap:         typeof settings.nav_gap         === 'number' ? settings.nav_gap         : 4,
        navFontSize:    typeof settings.nav_font_size   === 'number' ? settings.nav_font_size   : 14,
        navFontWeight:  typeof settings.nav_font_weight === 'number' ? settings.nav_font_weight : 500,
    };
}

// ─── Root component ───────────────────────────────────────────────────────────

/**
 * MenuClients — interactive nav renderer.
 *
 * Display styles for parent items (set in the Menu Builder):
 *   style-1   Image top, title below  (full-width portal grid)
 *   style-2   Image left, title right (full-width portal grid)
 *   style-3   Title only, clean list  (full-width portal grid)
 *   style-4   Image left, title + url (full-width portal grid, wider card)
 *   style-5   Icon + title, compact   (full-width portal grid)
 *   mega      Full-width mega panel   (legacy)
 *   left      Side dropdown, left-aligned
 *   right     Side dropdown, right-aligned
 *   builder   Full-width panel — renders the linked builder page content
 *   none      Default simple dropdown
 *
 * All colours come from `settings.nav_*` keys (configurable via admin Settings).
 */
export default function MenuClients({ menuItems, settings = {}, style, className, builderContent = {} }: MenuClientsProps) {
    const colors = useNavColors(settings);

    return (
        <nav className={className}>
            <ul className="flex flex-wrap items-center" style={{ gap: colors.navGap }}>
                {menuItems.map((item) => (
                    <NavItem key={item.id} item={item} colors={colors} builderContent={builderContent} />
                ))}
            </ul>
        </nav>
    );
}

// ─── Single top-level nav item ────────────────────────────────────────────────

interface NavItemProps {
    item: MenuItem;
    colors: ReturnType<typeof useNavColors>;
    builderContent: Record<string, any[]>;
}

function NavItem({ item, colors, builderContent }: NavItemProps) {
    const [isOpen, setIsOpen]       = useState(false);
    const liRef                     = useRef<HTMLLIElement>(null);
    const [panelTop, setPanelTop]   = useState(0);
    const closeTimer                = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hasChildren  = !!(item.children && item.children.length > 0);
    const displayStyle = item.displayStyle;
    const gridCols     = item.gridNumber ?? 4;
    const isBuilderItem = (displayStyle === 'builder' || item.type === 'builder') && !!item.builderId;

    // A builder item opens on hover even without child items
    const opensOnHover = hasChildren || isBuilderItem;

    const cancelClose = () => {
        if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    };
    const scheduleClose = () => {
        cancelClose();
        closeTimer.current = setTimeout(() => setIsOpen(false), 80);
    };

    const handleMouseEnter = () => {
        cancelClose();
        if (!opensOnHover) return;
        if (liRef.current) {
            const header = liRef.current.closest('header');
            const anchor = header ?? liRef.current;
            setPanelTop(anchor.getBoundingClientRect().bottom);
        }
        setIsOpen(true);
    };

    const isStyled  = displayStyle && displayStyle.startsWith('style-');
    const styleNum  = isStyled ? parseInt(displayStyle!.replace('style-', ''), 10) : 0;

    return (
        <li ref={liRef} className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={scheduleClose}>
            {/* Top-level label */}
            <Link
                href={item.url}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md whitespace-nowrap transition-colors"
                style={{ color: colors.navText, fontSize: colors.navFontSize, fontWeight: colors.navFontWeight }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color      = colors.navHoverText;
                    (e.currentTarget as HTMLElement).style.background = colors.navHoverBg;
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color      = colors.navText;
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
            >
                {item.image && (
                    <Image width={20} height={20} src={item.image} alt={item.label}
                        className="w-5 h-5 object-cover rounded shrink-0" unoptimized />
                )}
                <span>{item.label}</span>
                {opensOnHover && (
                    <Icon icon="mdi:chevron-down" className="w-3.5 h-3.5 opacity-60 shrink-0" />
                )}
            </Link>

            {/* Dropdown panel */}
            {opensOnHover && isOpen && typeof window !== 'undefined' && (() => {
                // Builder panel — full-width portal with builder content
                if (isBuilderItem) {
                    return createPortal(
                        <BuilderPanel
                            item={item}
                            colors={colors}
                            panelTop={panelTop}
                            content={builderContent[item.builderId!] ?? null}
                            onMouseEnter={cancelClose}
                            onMouseLeave={scheduleClose}
                        />,
                        document.body
                    );
                }

                // Styled panels (style-1 … style-5)
                if (isStyled) {
                    return createPortal(
                        <StyledPanel
                            item={item}
                            styleNum={styleNum}
                            gridCols={gridCols}
                            colors={colors}
                            panelTop={panelTop}
                            onMouseEnter={cancelClose}
                            onMouseLeave={scheduleClose}
                        />,
                        document.body
                    );
                }

                if (displayStyle === 'mega') {
                    return createPortal(
                        <MegaPanel
                            item={item}
                            colors={colors}
                            panelTop={panelTop}
                            onMouseEnter={cancelClose}
                            onMouseLeave={scheduleClose}
                        />,
                        document.body
                    );
                }

                if (displayStyle === 'left' || displayStyle === 'right') {
                    return (
                        <SideDropdown
                            item={item}
                            colors={colors}
                            side={displayStyle}
                            onMouseEnter={cancelClose}
                            onMouseLeave={scheduleClose}
                        />
                    );
                }

                return (
                    <SimpleDropdown
                        item={item}
                        colors={colors}
                        onMouseEnter={cancelClose}
                        onMouseLeave={scheduleClose}
                    />
                );
            })()}
        </li>
    );
}

// ─── Builder panel ────────────────────────────────────────────────────────────

interface BuilderPanelProps {
    item: MenuItem;
    colors: ReturnType<typeof useNavColors>;
    panelTop: number;
    /** Pre-fetched builder rows from Menus.tsx server component */
    content: any[] | null;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

/**
 * Renders pre-fetched builder content as a full-width hover panel.
 * No client-side fetch — content arrives server-side via Menus.tsx.
 */
function BuilderPanel({ colors, panelTop, content, onMouseEnter, onMouseLeave }: BuilderPanelProps) {
    return (
        <div
            className="fixed left-0 right-0 z-9999 shadow-2xl border-t overflow-auto max-h-[80vh]"
            style={{
                top:         panelTop,
                background:  colors.navBoxBg,
                borderColor: colors.navBorderColor,
                color:       colors.navBoxText,
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {content && content.length > 0 ? (
                <BuilderClient content={content} />
            ) : (
                <div className="flex items-center justify-center py-10 text-gray-300 text-sm gap-2">
                    <Icon icon="boxicons:layout" width={20} />
                    Builder panel is empty.
                </div>
            )}
        </div>
    );
}


// ─── Styled panels (style-1 … style-5) ───────────────────────────────────────

interface StyledPanelProps {
    item: MenuItem;
    styleNum: number;
    gridCols: number;
    colors: ReturnType<typeof useNavColors>;
    panelTop: number;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

function StyledPanel({ item, styleNum, gridCols, colors, panelTop, onMouseEnter, onMouseLeave }: StyledPanelProps) {
    const children = item.children ?? [];
    const gridClass: Record<number, string> = {
        1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4',
        5: 'grid-cols-5', 6: 'grid-cols-6', 7: 'grid-cols-7', 8: 'grid-cols-8',
        9: 'grid-cols-9', 10: 'grid-cols-10',
    };
    const colClass = gridClass[gridCols] ?? 'grid-cols-4';

    return (
        <div
            className="fixed left-0 right-0 z-[9999] shadow-2xl border-t"
            style={{ top: panelTop, background: colors.navBoxBg, borderColor: colors.navBorderColor, color: colors.navBoxText }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="container py-6">
                <p className="text-[10px] uppercase tracking-widest font-semibold mb-4 opacity-40">{item.label}</p>
                <div className={`grid ${colClass} gap-4`}>
                    {children.map((child) => {
                        switch (styleNum) {
                            case 1:  return <Style1Card key={child.id} item={child} colors={colors} />;
                            case 2:  return <Style2Card key={child.id} item={child} colors={colors} />;
                            case 3:  return <Style3Card key={child.id} item={child} colors={colors} />;
                            case 4:  return <Style4Card key={child.id} item={child} colors={colors} />;
                            case 5:  return <Style5Card key={child.id} item={child} colors={colors} />;
                            default: return <Style1Card key={child.id} item={child} colors={colors} />;
                        }
                    })}
                </div>
            </div>
        </div>
    );
}

// ── Style 1: image top, title below ──────────────────────────────────────────
function Style1Card({ item, colors }: { item: MenuItem; colors: ReturnType<typeof useNavColors> }) {
    return (
        <Link href={item.url} className="group flex flex-col gap-2 rounded-xl p-2"
            style={{ color: colors.navBoxText }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = colors.navHoverBg; (e.currentTarget as HTMLElement).style.color = colors.navHoverText; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = colors.navBoxText; }}>
            <div className="relative w-full flex items-center justify-center h-20">
                {item.image ? (
                    <Image width={100} height={100} src={item.image} alt={item.label}
                        className="object-cover w-min h-full" unoptimized />
                ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                        <Icon icon="mdi:image-outline" className="w-8 h-8" />
                    </div>
                )}
            </div>
            <span className="font-medium text-center leading-snug line-clamp-1" style={{ fontSize: colors.navFontSize }}>
                {item.label}
            </span>
        </Link>
    );
}

// ── Style 2: image left, title right ─────────────────────────────────────────
function Style2Card({ item, colors }: { item: MenuItem; colors: ReturnType<typeof useNavColors> }) {
    return (
        <Link href={item.url} className="group flex items-center gap-3 rounded-xl p-3 transition-colors"
            style={{ color: colors.navBoxText }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = colors.navHoverBg; (e.currentTarget as HTMLElement).style.color = colors.navHoverText; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = colors.navBoxText; }}>
            <div className="relative w-14 h-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {item.image ? (
                    <Image fill src={item.image} alt={item.label}
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="56px" unoptimized />
                ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                        <Icon icon="mdi:image-outline" className="w-6 h-6" />
                    </div>
                )}
            </div>
            <span className="font-medium leading-snug line-clamp-2 flex-1" style={{ fontSize: colors.navFontSize }}>
                {item.label}
            </span>
        </Link>
    );
}

// ── Style 3: title only, clean list ──────────────────────────────────────────
function Style3Card({ item, colors }: { item: MenuItem; colors: ReturnType<typeof useNavColors> }) {
    return (
        <Link href={item.url} className="group flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors"
            style={{ color: colors.navBoxText }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = colors.navHoverBg; (e.currentTarget as HTMLElement).style.color = colors.navHoverText; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = colors.navBoxText; }}>
            <Icon icon="mdi:chevron-right" className="w-3.5 h-3.5 opacity-40 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            <span className="font-medium" style={{ fontSize: colors.navFontSize }}>{item.label}</span>
        </Link>
    );
}

// ── Style 4: image left, title + url (wider card) ────────────────────────────
function Style4Card({ item, colors }: { item: MenuItem; colors: ReturnType<typeof useNavColors> }) {
    return (
        <Link href={item.url} className="group flex items-center gap-4 rounded-xl p-3 transition-colors"
            style={{ color: colors.navBoxText }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = colors.navHoverBg; (e.currentTarget as HTMLElement).style.color = colors.navHoverText; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = colors.navBoxText; }}>
            <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                {item.image ? (
                    <Image fill src={item.image} alt={item.label}
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="64px" unoptimized />
                ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                        <Icon icon="mdi:image-outline" className="w-7 h-7" />
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold leading-snug line-clamp-1" style={{ fontSize: colors.navFontSize }}>{item.label}</p>
                <p className="opacity-50 truncate mt-0.5" style={{ fontSize: Math.max(10, colors.navFontSize - 2) }}>{item.url}</p>
            </div>
            <Icon icon="mdi:arrow-right" className="w-4 h-4 opacity-30 shrink-0 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all" />
        </Link>
    );
}

// ── Style 5: icon + title, compact ───────────────────────────────────────────
function Style5Card({ item, colors }: { item: MenuItem; colors: ReturnType<typeof useNavColors> }) {
    return (
        <Link href={item.url} className="group flex flex-col items-center gap-2 rounded-xl p-3 transition-colors text-center"
            style={{ color: colors.navBoxText }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = colors.navHoverBg; (e.currentTarget as HTMLElement).style.color = colors.navHoverText; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = colors.navBoxText; }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors"
                style={{ background: colors.navHoverBg }}>
                {item.image ? (
                    <Image width={28} height={28} src={item.image} alt={item.label}
                        className="w-7 h-7 object-cover rounded-full" unoptimized />
                ) : (
                    <Icon icon="mdi:tag-outline" className="w-5 h-5 opacity-60" />
                )}
            </div>
            <span className="font-medium leading-snug line-clamp-2" style={{ fontSize: colors.navFontSize }}>{item.label}</span>
        </Link>
    );
}

// ─── Legacy: Mega panel ───────────────────────────────────────────────────────

interface MegaPanelProps {
    item: MenuItem;
    colors: ReturnType<typeof useNavColors>;
    panelTop: number;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

function MegaPanel({ item, colors, panelTop, onMouseEnter, onMouseLeave }: MegaPanelProps) {
    const children = item.children ?? [];
    const gridCols = item.gridNumber ?? 4;
    const gridClass: Record<number, string> = {
        1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4',
        5: 'grid-cols-5', 6: 'grid-cols-6', 7: 'grid-cols-7', 8: 'grid-cols-8',
        9: 'grid-cols-9', 10: 'grid-cols-10',
    };
    const colClass = gridClass[gridCols] ?? 'grid-cols-4';

    return (
        <div className="fixed left-0 right-0 z-[9999] shadow-2xl border-t"
            style={{ top: panelTop, background: colors.navBoxBg, borderColor: colors.navBorderColor, color: colors.navBoxText }}
            onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            <div className="container py-6">
                <div className={`grid ${colClass} gap-4`}>
                    {children.map((child) => (
                        <Link key={child.id} href={child.url}
                            className="group flex flex-col gap-2 rounded-xl p-3 transition-colors"
                            style={{ color: colors.navBoxText }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = colors.navHoverBg; (e.currentTarget as HTMLElement).style.color = colors.navHoverText; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = colors.navBoxText; }}>
                            {child.image && (
                                <div className="relative w-full aspect-video overflow-hidden rounded-lg bg-gray-100">
                                    <Image fill src={child.image} alt={child.label}
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                        sizes="200px" unoptimized />
                                </div>
                            )}
                            <span className="font-medium leading-snug line-clamp-2" style={{ fontSize: colors.navFontSize }}>{child.label}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Legacy: Side dropdown ────────────────────────────────────────────────────

interface SideDropdownProps {
    item: MenuItem;
    colors: ReturnType<typeof useNavColors>;
    side: 'left' | 'right';
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

function SideDropdown({ item, colors, side, onMouseEnter, onMouseLeave }: SideDropdownProps) {
    return (
        <div
            className={`absolute top-full mt-1 rounded-xl shadow-xl border min-w-[260px] z-50 py-2 ${side === 'right' ? 'right-0' : 'left-0'}`}
            style={{ background: colors.navBoxBg, borderColor: colors.navBorderColor, color: colors.navBoxText }}
            onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            {(item.children ?? []).map((child) => (
                <Link key={child.id} href={child.url}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                    style={{ color: colors.navBoxText, fontSize: colors.navFontSize }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = colors.navHoverBg; (e.currentTarget as HTMLElement).style.color = colors.navHoverText; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = colors.navBoxText; }}>
                    {child.image && (
                        <Image width={36} height={36} src={child.image} alt={child.label}
                            className="w-9 h-9 object-cover rounded-lg shrink-0" unoptimized />
                    )}
                    <span className="font-medium flex-1">{child.label}</span>
                </Link>
            ))}
        </div>
    );
}

// ─── Default simple dropdown ──────────────────────────────────────────────────

interface SimpleDropdownProps {
    item: MenuItem;
    colors: ReturnType<typeof useNavColors>;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

function SimpleDropdown({ item, colors, onMouseEnter, onMouseLeave }: SimpleDropdownProps) {
    return (
        <ul className="absolute left-0 top-full mt-1 rounded-xl shadow-xl border min-w-[220px] z-50 py-2"
            style={{ background: colors.navBoxBg, borderColor: colors.navBorderColor, color: colors.navBoxText }}
            onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            {(item.children ?? []).map((child) => (
                <li key={child.id}>
                    <Link href={child.url}
                        className="flex items-center gap-2.5 px-4 py-2.5 transition-colors"
                        style={{ color: colors.navBoxText, fontSize: colors.navFontSize }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = colors.navHoverBg; (e.currentTarget as HTMLElement).style.color = colors.navHoverText; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = colors.navBoxText; }}>
                        {child.image && (
                            <Image width={20} height={20} src={child.image} alt={child.label}
                                className="w-5 h-5 object-cover rounded shrink-0" unoptimized />
                        )}
                        <span className="font-medium">{child.label}</span>
                    </Link>
                </li>
            ))}
        </ul>
    );
}
