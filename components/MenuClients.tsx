'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Icon } from '@iconify/react';
import useEmblaCarousel from 'embla-carousel-react';
import { MenuItem } from '@/models/Menu';
import type { PostCardData } from './Menus';

import dynamic from 'next/dynamic';
const BuilderClient = dynamic(() => import('@/components/BuilderClient'), { ssr: false });

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

// ─── Props ────────────────────────────────────────────────────────────────────

interface MenuClientsProps {
    menuItems: MenuItem[];
    settings?: Record<string, any>;
    style?: number;
    className?: string;
    /** Builder content pre-fetched server-side keyed by builderId */
    builderContent?: Record<string, any[]>;
    /** Category posts pre-fetched server-side keyed by menuItem id */
    postContent?: Record<string, PostCardData[]>;
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

export default function MenuClients({
    menuItems,
    settings = {},
    style,
    className,
    builderContent = {},
    postContent = {},
}: MenuClientsProps) {
    const colors = useNavColors(settings);

    return (
        <nav className={className}>
            <ul className="flex flex-wrap items-center" style={{ gap: colors.navGap }}>
                {menuItems.map((item) => (
                    <NavItem
                        key={item.id}
                        item={item}
                        colors={colors}
                        builderContent={builderContent}
                        postContent={postContent}
                    />
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
    postContent: Record<string, PostCardData[]>;
}

function NavItem({ item, colors, builderContent, postContent }: NavItemProps) {
    const pathname                  = usePathname();
    const [isOpen, setIsOpen]       = useState(false);
    const liRef                     = useRef<HTMLLIElement>(null);
    const [panelTop, setPanelTop]   = useState(0);
    const closeTimer                = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hasChildren   = !!(item.children && item.children.length > 0);
    const displayStyle  = item.displayStyle;
    const gridCols      = item.gridNumber ?? 4;
    const isBuilderItem = (displayStyle === 'builder' || item.type === 'builder') && !!item.builderId;
    const isPostItem    = Boolean(item.showPosts);
    const itemPosts     = postContent[item.id] ?? [];
    const isActive      = isItemOrChildActive(item, pathname);

    // Item opens on hover if it has children, is a builder item, or has posts enabled
    const opensOnHover = hasChildren || isBuilderItem || isPostItem;

    const cancelClose = () => {
        if (closeTimer.current) {
            clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
    };
    const scheduleClose = () => {
        cancelClose();
        closeTimer.current = setTimeout(() => {
            setIsOpen(false);
        }, 250);
    };

    const handleMouseEnter = () => {
        cancelClose();
        if (!opensOnHover) return;
        if (liRef.current) {
            const header = liRef.current.closest('header');
            const nav = liRef.current.closest('nav');
            const anchor = header ?? nav ?? liRef.current;
            const rect = anchor.getBoundingClientRect();
            setPanelTop(rect.bottom);
        }
        setIsOpen(true);
    };

    const isStyled  = displayStyle && displayStyle.startsWith('style-');
    const styleNum  = isStyled ? parseInt(displayStyle!.replace('style-', ''), 10) : 1;

    const showIcon = item.showMode !== 'text';
    const showText = item.showMode !== 'icon' || (!item.icon && !item.image);

    return (
        <li ref={liRef} className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={scheduleClose}>
            {/* Top-level label */}
            <Link
                href={item.url}
                title={item.label}
                aria-label={item.label}
                className="flex items-center gap-1.5 p-3 rounded whitespace-nowrap transition-colors"
                style={{
                    color: isActive ? colors.navActiveText : colors.navText,
                    background: isActive ? colors.navActiveBg : 'transparent',
                    fontSize: colors.navFontSize,
                    fontWeight: colors.navFontWeight,
                }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color      = colors.navHoverText;
                    (e.currentTarget as HTMLElement).style.background = colors.navHoverBg;
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color      = isActive ? colors.navActiveText : colors.navText;
                    (e.currentTarget as HTMLElement).style.background = isActive ? colors.navActiveBg : 'transparent';
                }}
            >
                {showIcon && (
                    item.icon ? (
                        <Icon icon={item.icon} width={18} height={18} className="shrink-0" />
                    ) : item.image ? (
                        <Image width={20} height={20} src={item.image} alt={item.label}
                            className="w-5 h-5 object-cover rounded shrink-0" unoptimized />
                    ) : null
                )}

                {showText && <span>{item.label}</span>}

                {opensOnHover && (
                    <Icon icon="mdi:chevron-down" className="w-3.5 h-3.5 opacity-60 shrink-0" />
                )}
            </Link>

            {/* Dropdown panel */}
            {opensOnHover && isOpen && typeof window !== 'undefined' && (() => {
                // 1. Builder panel — full-width portal with builder content
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

                // 2. Category Posts Panel (Grid or Slider powered by Embla Carousel)
                if (isPostItem) {
                    return createPortal(
                        <CategoryPostPanel
                            item={item}
                            posts={itemPosts}
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

                // 3. Styled panels (style-1 … style-5 for child menu items)
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
    content: any[] | null;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

function BuilderPanel({ colors, panelTop, content, onMouseEnter, onMouseLeave }: BuilderPanelProps) {
    return (
        <div
            className="fixed left-0 right-0 z-9999 shadow-2xl border-t overflow-auto max-h-[80vh] before:absolute before:-top-4 before:left-0 before:right-0 before:h-4 before:content-['']"
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
                <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
                    <Icon icon="boxicons:layout" width={20} />
                    Builder panel is empty.
                </div>
            )}
        </div>
    );
}

// ─── Category Posts Mega Panel (Grid or Slider) ──────────────────────────────

interface CategoryPostPanelProps {
    item: MenuItem;
    posts: PostCardData[];
    styleNum: number;
    gridCols: number;
    colors: ReturnType<typeof useNavColors>;
    panelTop: number;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

function CategoryPostPanel({
    item,
    posts: initialPosts = [],
    styleNum,
    gridCols,
    colors,
    panelTop,
    onMouseEnter,
    onMouseLeave,
}: CategoryPostPanelProps) {
    const [posts, setPosts] = useState<PostCardData[]>(initialPosts);
    const [loading, setLoading] = useState(initialPosts.length === 0);
    const hasChildren = (item.children?.length ?? 0) > 0;
    const isSlider = item.layoutType === 'slider';

    // Dynamic client-side fetch if posts were not pre-fetched
    useEffect(() => {
        if (initialPosts.length > 0) {
            setPosts(initialPosts);
            setLoading(false);
            return;
        }

        let isMounted = true;
        setLoading(true);
        const postType = item.postType || 'blog';
        const categoryId = item.postCategory || item.referenceId || '';
        const limit = item.postLimit || 6;

        fetch(`/api/menu/posts?type=${encodeURIComponent(postType)}&category=${encodeURIComponent(categoryId)}&limit=${limit}`)
            .then((r) => r.json())
            .then((data) => {
                if (isMounted && data.success && Array.isArray(data.posts)) {
                    setPosts(data.posts);
                }
            })
            .catch(() => {})
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [item.id, item.postCategory, item.referenceId, item.postType, item.postLimit, initialPosts]);

    return (
        <div
            className="fixed left-0 right-0 z-9999 shadow-2xl border-t transition-all duration-150 before:absolute before:-top-4 before:left-0 before:right-0 before:h-4 before:content-['']"
            style={{
                top:         panelTop,
                background:  colors.navBoxBg,
                borderColor: colors.navBorderColor,
                color:       colors.navBoxText,
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="container py-6">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <h3 className="font-bold text-sm uppercase tracking-wider text-gray-800">
                            {item.label}
                        </h3>
                    </div>
                    <Link
                        href={item.url}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition"
                    >
                        <span>সকল খবর দেখুন</span>
                        <Icon icon="solar:arrow-right-linear" width={14} />
                    </Link>
                </div>

                <div className="flex gap-6">
                    {/* Left Column: Subcategory list if present */}
                    {hasChildren && (
                        <div className="w-1/5 min-w-45 pr-4 border-r border-gray-100 shrink-0 space-y-1">
                            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-2">
                                সাব-ক্যাটাগরি
                            </p>
                            {item.children!.map((child) => (
                                <Link
                                    key={child.id}
                                    href={child.url}
                                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
                                >
                                    <span className="truncate">{child.label}</span>
                                    <Icon icon="solar:alt-arrow-right-linear" width={12} className="opacity-40" />
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Right / Main Column: Posts Display (Slider or Grid) */}
                    <div className="flex-1 min-w-0">
                        {loading ? (
                            <div className="py-12 flex items-center justify-center text-gray-400 gap-2">
                                <Icon icon="svg-spinners:ring-resize" width={24} className="text-emerald-600" />
                                <span className="text-xs">পোস্ট লোড হচ্ছে…</span>
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center text-gray-400 text-xs gap-2">
                                <Icon icon="solar:document-text-linear" width={24} className="opacity-60" />
                                <span>কোনো পোস্ট পাওয়া যায়নি</span>
                            </div>
                        ) : isSlider ? (
                            <PostSlider
                                item={item}
                                posts={posts}
                                styleNum={styleNum}
                                gridCols={gridCols}
                                colors={colors}
                            />
                        ) : (
                            <PostGrid
                                posts={posts}
                                styleNum={styleNum}
                                gridCols={gridCols}
                                colors={colors}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Post Slider Component (Embla Carousel) ───────────────────────────────────

interface PostSliderProps {
    item: MenuItem;
    posts: PostCardData[];
    styleNum: number;
    gridCols: number;
    colors: ReturnType<typeof useNavColors>;
}

function PostSlider({ item, posts, styleNum, gridCols, colors }: PostSliderProps) {
    const autoplay = item.sliderAutoplay !== false;
    const autoplaySpeed = item.sliderSpeed || 3000;
    const showArrows = item.sliderArrows !== false;
    const showDots = item.sliderDots !== false;

    // Embla instance setup
    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop: true,
        align: 'start',
        containScroll: 'trimSnaps',
    });

    const [selectedIndex, setSelectedIndex] = useState(0);
    const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
    const [canPrev, setCanPrev] = useState(false);
    const [canNext, setCanNext] = useState(true);

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setSelectedIndex(emblaApi.selectedScrollSnap());
        setCanPrev(emblaApi.canScrollPrev());
        setCanNext(emblaApi.canScrollNext());
    }, [emblaApi]);

    const onInit = useCallback(() => {
        if (!emblaApi) return;
        setScrollSnaps(emblaApi.scrollSnapList());
        onSelect();
    }, [emblaApi, onSelect]);

    useEffect(() => {
        if (!emblaApi) return;
        emblaApi.on('init', onInit);
        emblaApi.on('reInit', onInit);
        emblaApi.on('select', onSelect);
        return () => {
            emblaApi.off('init', onInit);
            emblaApi.off('reInit', onInit);
            emblaApi.off('select', onSelect);
        };
    }, [emblaApi, onInit, onSelect]);

    // Autoplay logic
    useEffect(() => {
        if (!emblaApi || !autoplay || posts.length <= gridCols) return;

        let timer: ReturnType<typeof setInterval>;
        const play = () => {
            timer = setInterval(() => {
                if (emblaApi.canScrollNext()) {
                    emblaApi.scrollNext();
                } else {
                    emblaApi.scrollTo(0);
                }
            }, autoplaySpeed);
        };
        const stop = () => clearInterval(timer);

        play();
        emblaApi.on('pointerDown', stop);
        emblaApi.on('pointerUp', play);

        return () => {
            clearInterval(timer);
            emblaApi.off('pointerDown', stop);
            emblaApi.off('pointerUp', play);
        };
    }, [emblaApi, autoplay, autoplaySpeed, posts.length, gridCols]);

    const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
    const scrollTo   = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

    const slideWidthPercent = 100 / Math.max(1, Math.min(gridCols, 6));

    return (
        <div className="relative w-full group/slider">
            <div className="overflow-hidden w-full" ref={emblaRef}>
                <div className="flex gap-4 touch-pan-y">
                    {posts.map((post) => (
                        <div
                            key={post._id}
                            style={{ flex: `0 0 ${slideWidthPercent}%`, minWidth: 0 }}
                            className="box-border"
                        >
                            <PostCard post={post} styleNum={styleNum} colors={colors} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Slider Navigation Arrows */}
            {showArrows && posts.length > gridCols && (
                <>
                    <button
                        type="button"
                        onClick={scrollPrev}
                        aria-label="Previous slide"
                        className="absolute -left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 text-gray-700 flex items-center justify-center hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all opacity-0 group-hover/slider:opacity-100 z-20 cursor-pointer"
                    >
                        <Icon icon="mdi:chevron-left" width={20} />
                    </button>
                    <button
                        type="button"
                        onClick={scrollNext}
                        aria-label="Next slide"
                        className="absolute -right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 text-gray-700 flex items-center justify-center hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all opacity-0 group-hover/slider:opacity-100 z-20 cursor-pointer"
                    >
                        <Icon icon="mdi:chevron-right" width={20} />
                    </button>
                </>
            )}

            {/* Slider Pagination Dots */}
            {showDots && scrollSnaps.length > 1 && (
                <div className="flex justify-center items-center gap-1.5 mt-4">
                    {scrollSnaps.map((_, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => scrollTo(idx)}
                            aria-label={`Go to slide ${idx + 1}`}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                idx === selectedIndex
                                    ? 'w-5 bg-emerald-600'
                                    : 'w-1.5 bg-gray-300 hover:bg-gray-400'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Post Grid Component ──────────────────────────────────────────────────────

interface PostGridProps {
    posts: PostCardData[];
    styleNum: number;
    gridCols: number;
    colors: ReturnType<typeof useNavColors>;
}

function PostGrid({ posts, styleNum, gridCols, colors }: PostGridProps) {
    const gridClass: Record<number, string> = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
        4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4',
        5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-5',
        6: 'grid-cols-1 sm:grid-cols-3 md:grid-cols-6',
    };
    const colClass = gridClass[gridCols] ?? 'grid-cols-4';

    return (
        <div className={`grid ${colClass} gap-4`}>
            {posts.map((post) => (
                <PostCard key={post._id} post={post} styleNum={styleNum} colors={colors} />
            ))}
        </div>
    );
}

// ─── Reusable Post Card (Style 1 to 5) ────────────────────────────────────────

interface PostCardProps {
    post: PostCardData;
    styleNum: number;
    colors: ReturnType<typeof useNavColors>;
}

function PostCard({ post, styleNum, colors }: PostCardProps) {
    // Style 2: Image left, Title right
    if (styleNum === 2) {
        return (
            <Link
                href={post.url}
                className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition duration-200"
            >
                <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-100 shadow-2xs">
                    {post.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={post.image}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Icon icon="solar:gallery-bold" width={20} />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-bold text-gray-900 group-hover:text-emerald-600 line-clamp-2 leading-snug transition-colors">
                        {post.title}
                    </h4>
                    {post.category && (
                        <span className="text-[10px] text-emerald-600 font-semibold mt-1 inline-block">
                            {post.category}
                        </span>
                    )}
                </div>
            </Link>
        );
    }

    // Style 3: Title Only / Minimal List
    if (styleNum === 3) {
        return (
            <Link
                href={post.url}
                className="group flex items-center gap-2 p-2.5 rounded-lg hover:bg-gray-50 transition"
            >
                <Icon
                    icon="solar:arrow-right-linear"
                    width={14}
                    className="text-emerald-500 shrink-0 group-hover:translate-x-1 transition-transform"
                />
                <span className="text-[13px] font-medium text-gray-800 group-hover:text-emerald-600 line-clamp-2 transition-colors">
                    {post.title}
                </span>
            </Link>
        );
    }

    // Style 4: Image left, Title + Excerpt / Read More
    if (styleNum === 4) {
        return (
            <Link
                href={post.url}
                className="group flex items-center gap-3.5 p-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition shadow-2xs"
            >
                <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                    {post.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={post.image}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Icon icon="solar:gallery-bold" width={24} />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-bold text-gray-900 group-hover:text-emerald-600 line-clamp-2 leading-snug transition-colors">
                        {post.title}
                    </h4>
                    {post.excerpt && (
                        <p className="text-[11px] text-gray-500 line-clamp-1 mt-1 font-normal">
                            {post.excerpt}
                        </p>
                    )}
                </div>
                <Icon
                    icon="solar:arrow-right-bold"
                    width={16}
                    className="text-gray-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all shrink-0"
                />
            </Link>
        );
    }

    // Style 5: Compact Icon / Tag Card
    if (styleNum === 5) {
        return (
            <Link
                href={post.url}
                className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 text-center transition"
            >
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    {post.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.image} alt={post.title} className="w-full h-full object-cover rounded-full" />
                    ) : (
                        <Icon icon="solar:document-text-bold" width={22} />
                    )}
                </div>
                <span className="text-[12px] font-semibold text-gray-800 group-hover:text-emerald-600 line-clamp-2 transition-colors">
                    {post.title}
                </span>
            </Link>
        );
    }

    // Default Style 1: Image top, Title below (Standard news card)
    return (
        <Link
            href={post.url}
            className="group flex flex-col gap-2 p-2 rounded-xl hover:bg-gray-50/80 transition duration-200"
        >
            <div className="relative w-full aspect-16/10 rounded-lg overflow-hidden bg-gray-100 shadow-2xs">
                {post.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Icon icon="solar:gallery-bold" width={28} />
                    </div>
                )}
                {post.category && (
                    <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                        {post.category}
                    </span>
                )}
            </div>
            <h4 className="text-[13px] font-bold text-gray-900 group-hover:text-emerald-600 line-clamp-2 leading-snug transition-colors">
                {post.title}
            </h4>
        </Link>
    );
}

// ─── Styled panels (style-1 … style-5 for child menu links) ──────────────────

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
            className="fixed left-0 right-0 z-9999 shadow-2xl border-t"
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

// ── Child Menu Style 1: image/icon top, title below ─────────────────────────
function Style1Card({ item, colors }: { item: MenuItem; colors: ReturnType<typeof useNavColors> }) {
    const pathname = usePathname();
    const isActive = checkIsActive(pathname, item.url);
    return (
        <Link href={item.url} className="group flex flex-col gap-2 rounded-xl p-2 transition-colors"
            style={{ color: isActive ? colors.navHoverText : colors.navBoxText, background: isActive ? colors.navHoverBg : 'transparent' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = colors.navHoverBg; (e.currentTarget as HTMLElement).style.color = colors.navHoverText; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isActive ? colors.navHoverBg : 'transparent'; (e.currentTarget as HTMLElement).style.color = isActive ? colors.navHoverText : colors.navBoxText; }}>
            <div className="relative w-full flex items-center justify-center h-20">
                {item.icon ? (
                    <div className="w-12 h-12 rounded-xl bg-gray-100/60 flex items-center justify-center text-emerald-600">
                        <Icon icon={item.icon} width={28} />
                    </div>
                ) : item.image ? (
                    <Image width={100} height={100} src={item.image} alt={item.label}
                        className="object-cover w-min h-full rounded" unoptimized />
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

// ── Child Menu Style 2: image/icon left, title right ────────────────────────
function Style2Card({ item, colors }: { item: MenuItem; colors: ReturnType<typeof useNavColors> }) {
    const pathname = usePathname();
    const isActive = checkIsActive(pathname, item.url);
    return (
        <Link href={item.url} className="group flex items-center gap-3 rounded-xl p-3 transition-colors"
            style={{ color: isActive ? colors.navHoverText : colors.navBoxText, background: isActive ? colors.navHoverBg : 'transparent' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = colors.navHoverBg; (e.currentTarget as HTMLElement).style.color = colors.navHoverText; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isActive ? colors.navHoverBg : 'transparent'; (e.currentTarget as HTMLElement).style.color = isActive ? colors.navHoverText : colors.navBoxText; }}>
            <div className="relative w-14 h-14 shrink-0 overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
                {item.icon ? (
                    <Icon icon={item.icon} width={28} className="text-emerald-600" />
                ) : item.image ? (
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

// ── Child Menu Style 3: title only, clean list ──────────────────────────────
function Style3Card({ item, colors }: { item: MenuItem; colors: ReturnType<typeof useNavColors> }) {
    const pathname = usePathname();
    const isActive = checkIsActive(pathname, item.url);
    return (
        <Link href={item.url} className="group flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors"
            style={{ color: isActive ? colors.navHoverText : colors.navBoxText, background: isActive ? colors.navHoverBg : 'transparent' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = colors.navHoverBg; (e.currentTarget as HTMLElement).style.color = colors.navHoverText; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isActive ? colors.navHoverBg : 'transparent'; (e.currentTarget as HTMLElement).style.color = isActive ? colors.navHoverText : colors.navBoxText; }}>
            <Icon icon="mdi:chevron-right" className="w-3.5 h-3.5 opacity-40 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            <span className="font-medium" style={{ fontSize: colors.navFontSize }}>{item.label}</span>
        </Link>
    );
}

// ── Child Menu Style 4: image/icon left, title + url ────────────────────────
function Style4Card({ item, colors }: { item: MenuItem; colors: ReturnType<typeof useNavColors> }) {
    const pathname = usePathname();
    const isActive = checkIsActive(pathname, item.url);
    return (
        <Link href={item.url} className="group flex items-center gap-4 rounded-xl p-3 transition-colors"
            style={{ color: isActive ? colors.navHoverText : colors.navBoxText, background: isActive ? colors.navHoverBg : 'transparent' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = colors.navHoverBg; (e.currentTarget as HTMLElement).style.color = colors.navHoverText; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isActive ? colors.navHoverBg : 'transparent'; (e.currentTarget as HTMLElement).style.color = isActive ? colors.navHoverText : colors.navBoxText; }}>
            <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-xl bg-gray-100 flex items-center justify-center">
                {item.icon ? (
                    <Icon icon={item.icon} width={32} className="text-emerald-600" />
                ) : item.image ? (
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

// ── Child Menu Style 5: icon + title, compact ───────────────────────────────
function Style5Card({ item, colors }: { item: MenuItem; colors: ReturnType<typeof useNavColors> }) {
    const pathname = usePathname();
    const isActive = checkIsActive(pathname, item.url);
    return (
        <Link href={item.url} className="group flex flex-col items-center gap-2 rounded-xl p-3 transition-colors text-center"
            style={{ color: isActive ? colors.navHoverText : colors.navBoxText, background: isActive ? colors.navHoverBg : 'transparent' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = colors.navHoverBg; (e.currentTarget as HTMLElement).style.color = colors.navHoverText; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isActive ? colors.navHoverBg : 'transparent'; (e.currentTarget as HTMLElement).style.color = isActive ? colors.navHoverText : colors.navBoxText; }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors"
                style={{ background: colors.navHoverBg }}>
                {item.icon ? (
                    <Icon icon={item.icon} width={20} className="text-emerald-600" />
                ) : item.image ? (
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
    const pathname = usePathname();
    const children = item.children ?? [];
    const gridCols = item.gridNumber ?? 4;
    const gridClass: Record<number, string> = {
        1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4',
        5: 'grid-cols-5', 6: 'grid-cols-6', 7: 'grid-cols-7', 8: 'grid-cols-8',
        9: 'grid-cols-9', 10: 'grid-cols-10',
    };
    const colClass = gridClass[gridCols] ?? 'grid-cols-4';

    return (
        <div className="fixed left-0 right-0 z-9999 shadow-2xl border-t before:absolute before:-top-4 before:left-0 before:right-0 before:h-4 before:content-['']"
            style={{ top: panelTop, background: colors.navBoxBg, borderColor: colors.navBorderColor, color: colors.navBoxText }}
            onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            <div className="container py-6">
                <div className={`grid ${colClass} gap-4`}>
                    {children.map((child) => {
                        const isActive = checkIsActive(pathname, child.url);
                        return (
                            <Link key={child.id} href={child.url}
                                className="group flex flex-col gap-2 rounded-xl p-3 transition-colors"
                                style={{ color: isActive ? colors.navHoverText : colors.navBoxText, background: isActive ? colors.navHoverBg : 'transparent' }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = colors.navHoverBg; (e.currentTarget as HTMLElement).style.color = colors.navHoverText; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isActive ? colors.navHoverBg : 'transparent'; (e.currentTarget as HTMLElement).style.color = isActive ? colors.navHoverText : colors.navBoxText; }}>
                                {child.icon ? (
                                    <div className="w-full aspect-video rounded-lg bg-gray-100 flex items-center justify-center text-emerald-600">
                                        <Icon icon={child.icon} width={36} />
                                    </div>
                                ) : child.image ? (
                                    <div className="relative w-full aspect-video overflow-hidden rounded-lg bg-gray-100">
                                        <Image fill src={child.image} alt={child.label}
                                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                                            sizes="200px" unoptimized />
                                    </div>
                                ) : null}
                                <span className="font-medium leading-snug line-clamp-2" style={{ fontSize: colors.navFontSize }}>{child.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── Side dropdown ────────────────────────────────────────────────────────────

interface SideDropdownProps {
    item: MenuItem;
    colors: ReturnType<typeof useNavColors>;
    side: 'left' | 'right';
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

function SideDropdown({ item, colors, side, onMouseEnter, onMouseLeave }: SideDropdownProps) {
    const pathname = usePathname();
    return (
        <div
            className={`absolute top-full mt-1 rounded-xl shadow-xl border min-w-65 z-50 py-2 ${side === 'right' ? 'right-0' : 'left-0'}`}
            style={{ background: colors.navBoxBg, borderColor: colors.navBorderColor, color: colors.navBoxText }}
            onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            {(item.children ?? []).map((child) => {
                const isActive = checkIsActive(pathname, child.url);
                return (
                    <Link key={child.id} href={child.url}
                        className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                        style={{ color: isActive ? colors.navHoverText : colors.navBoxText, background: isActive ? colors.navHoverBg : 'transparent', fontSize: colors.navFontSize }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = colors.navHoverBg; (e.currentTarget as HTMLElement).style.color = colors.navHoverText; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isActive ? colors.navHoverBg : 'transparent'; (e.currentTarget as HTMLElement).style.color = isActive ? colors.navHoverText : colors.navBoxText; }}>
                        {child.icon ? (
                            <Icon icon={child.icon} width={20} className="text-emerald-600 shrink-0" />
                        ) : child.image ? (
                            <Image width={36} height={36} src={child.image} alt={child.label}
                                className="w-9 h-9 object-cover rounded-lg shrink-0" unoptimized />
                        ) : null}
                        <span className="font-medium flex-1">{child.label}</span>
                    </Link>
                );
            })}
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
    const pathname = usePathname();
    return (
        <ul className="absolute left-0 top-full mt-1 rounded-xl shadow-xl border min-w-55 z-50 py-2"
            style={{ background: colors.navBoxBg, borderColor: colors.navBorderColor, color: colors.navBoxText }}
            onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            {(item.children ?? []).map((child) => {
                const isActive = checkIsActive(pathname, child.url);
                return (
                    <li key={child.id}>
                        <Link href={child.url}
                            className="flex items-center gap-2.5 px-4 py-2.5 transition-colors"
                            style={{ color: isActive ? colors.navHoverText : colors.navBoxText, background: isActive ? colors.navHoverBg : 'transparent', fontSize: colors.navFontSize }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = colors.navHoverBg; (e.currentTarget as HTMLElement).style.color = colors.navHoverText; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isActive ? colors.navHoverBg : 'transparent'; (e.currentTarget as HTMLElement).style.color = isActive ? colors.navHoverText : colors.navBoxText; }}>
                            {child.icon ? (
                                <Icon icon={child.icon} width={16} className="text-emerald-600 shrink-0" />
                            ) : child.image ? (
                                <Image width={20} height={20} src={child.image} alt={child.label}
                                    className="w-5 h-5 object-cover rounded shrink-0" unoptimized />
                            ) : null}
                            <span className="font-medium">{child.label}</span>
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}
