'use client';

/**
 * MenuForm
 *
 * The item panel is 100 % dynamic:
 *  • useActivePlugins() arms the hook gate and populates post/cat type registries
 *  • getAllPostTypes() / getAllCatTypes() are read — only types from active
 *    plugins (plus core) appear, exactly like the Permalink page
 *  • For each type the component fetches items from Express (/post or /cat)
 *    and uses /permalink to build the correct URL prefix
 *  • A "Page Builder" section lists every builder document (GET /builder).
 *    A builder item can be linked to any menu item as a sub-panel:
 *    set displayStyle = 'builder' and builderId = the builder document _id.
 *    The front-end MenuClients will then render that builder content as the
 *    hover panel instead of a standard child list.
 *  • No type is hardcoded — adding a plugin automatically adds its sections here
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { useActivePlugins } from '@/hook/useActivePlugins';
import { getAllPostTypes, getAllCatTypes } from '@/hook';
import type { PostTypeField, CatTypeField } from '@/hook';
import { xFetch } from '@/lib/express';
import Gallery from '@/components/Gallery';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MenuDisplayStyle =
    | 'none' | 'left' | 'right' | 'mega'
    | 'style-1' | 'style-2' | 'style-3' | 'style-4' | 'style-5'
    | 'builder';

export interface MenuItem {
    id: string;
    type: string;
    label: string;
    url: string;
    referenceId?: string;
    image?: string;
    displayStyle?: MenuDisplayStyle;
    gridNumber?: number;
    /** Set when displayStyle === 'builder' — the Builder document _id to render */
    builderId?: string;
    children?: MenuItem[];
    order: number;
}

interface AvailableItem {
    id: string;
    title: string;
    slug: string;
    image?: string;
    parentId?: string | null;
}

interface BuilderDoc {
    _id: string;
    title: string;
    status: string;
}

interface ItemGroup {
    label: string;
    pluginNx: string;
    kind: 'post' | 'cat';
    typeKey: string;
    urlPrefix: string;
    icon: string;
    color: string;
    items: AvailableItem[];
    loading: boolean;
}

interface DragInfo { id: string; parentId: string | null; index: number }

const MAX_LEVELS = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildUrl(prefix: string, slug: string): string {
    const p = prefix.trim().replace(/^\/+|\/+$/g, '');
    return p ? `/${p}/${slug}` : `/${slug}`;
}

function buildGroupedItems(items: AvailableItem[]): { item: AvailableItem; depth: number }[] {
    const roots = items.filter((i) => !i.parentId);
    const childMap: Record<string, AvailableItem[]> = {};
    items.forEach((i) => {
        if (i.parentId) {
            if (!childMap[i.parentId]) childMap[i.parentId] = [];
            childMap[i.parentId].push(i);
        }
    });
    const result: { item: AvailableItem; depth: number }[] = [];
    const walk = (list: AvailableItem[], depth: number) => {
        list.forEach((item) => {
            result.push({ item, depth });
            if (childMap[item.id]) walk(childMap[item.id], depth + 1);
        });
    };
    walk(roots, 0);
    items.forEach((i) => {
        if (i.parentId && !items.find((p) => p.id === i.parentId)) {
            if (!result.find((r) => r.item.id === i.id)) result.push({ item: i, depth: 0 });
        }
    });
    return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MenuFormProps { menuId?: string }

export default function MenuForm({ menuId }: MenuFormProps) {
    const router = useRouter();
    const activePlugins = useActivePlugins();

    // ── Menu state ────────────────────────────────────────────────────────────
    const [title,     setTitle]     = useState('');
    const [locations, setLocations] = useState<string[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading,   setLoading]   = useState(false);
    const [saving,    setSaving]    = useState(false);
    const [saved,     setSaved]     = useState(false);

    // ── Dynamic item groups ───────────────────────────────────────────────────
    const [groups,      setGroups]      = useState<ItemGroup[]>([]);
    const [permalinks,  setPermalinks]  = useState<Record<string, string>>({});
    const [permsLoaded, setPermsLoaded] = useState(false);

    // ── Builder pages ─────────────────────────────────────────────────────────
    const [builderDocs,        setBuilderDocs]        = useState<BuilderDoc[]>([]);
    const [builderDocsLoading, setBuilderDocsLoading] = useState(false);
    const [selectedBuilderIds, setSelectedBuilderIds] = useState<Set<string>>(new Set());

    // ── Left-panel UI ─────────────────────────────────────────────────────────
    const [expandedSections,   setExpandedSections]   = useState<Set<string>>(new Set());
    const [selectedItemsToAdd, setSelectedItemsToAdd] = useState<Set<string>>(new Set());
    const [searchQuery,        setSearchQuery]         = useState('');
    const [activeTab,          setActiveTab]           = useState<'recent' | 'all' | 'search'>('all');

    // ── Custom link ───────────────────────────────────────────────────────────
    const [customLabel, setCustomLabel] = useState('');
    const [customUrl,   setCustomUrl]   = useState('');
    const [customImage, setCustomImage] = useState('');

    // ── Drag state ────────────────────────────────────────────────────────────
    const [expandedItems,     setExpandedItems]     = useState<Set<string>>(new Set());
    const [draggedItem,       setDraggedItem]       = useState<DragInfo | null>(null);
    const [dropTarget,        setDropTarget]        = useState<{ id: string; position: 'before' | 'after' | 'inside' } | null>(null);
    const [selectedMenuItems, setSelectedMenuItems] = useState<Set<string>>(new Set());

    // ── Edit modal ────────────────────────────────────────────────────────────
    const [editingItem,      setEditingItem]      = useState<MenuItem | null>(null);
    const [editLabel,        setEditLabel]        = useState('');
    const [editUrl,          setEditUrl]          = useState('');
    const [editImage,        setEditImage]        = useState('');
    const [editDisplayStyle, setEditDisplayStyle] = useState<MenuDisplayStyle>('none');
    const [editGridNumber,   setEditGridNumber]   = useState<number>(3);
    const [editBuilderId,    setEditBuilderId]    = useState<string>('');

    // ── Step 1: load permalinks ───────────────────────────────────────────────
    useEffect(() => {
        xFetch('/permalink', { cache: 'no-store' })
            .then((r) => r.json())
            .then((data) => { if (data && typeof data === 'object' && !data.error) setPermalinks(data); })
            .catch(() => {})
            .finally(() => setPermsLoaded(true));
    }, []);

    // ── Step 2: build groups once plugins + permalinks are ready ──────────────
    useEffect(() => {
        if (activePlugins === null || !permsLoaded) return;

        const postTypes: PostTypeField[] = getAllPostTypes();
        const catTypes:  CatTypeField[]  = getAllCatTypes();

        setGroups([
            ...postTypes.map((pt): ItemGroup => ({
                label:     pt.label,
                pluginNx:  pt.pluginNx ?? '',
                kind:      'post',
                typeKey:   pt.key,
                urlPrefix: permalinks[pt.key] ?? pt.key,
                icon:      pt.icon  ?? 'solar:document-bold',
                color:     pt.color ?? 'from-sky-500 to-blue-600',
                items:     [],
                loading:   false,
            })),
            ...catTypes.map((ct): ItemGroup => ({
                label:     ct.label,
                pluginNx:  ct.pluginNx ?? '',
                kind:      'cat',
                typeKey:   ct.key,
                urlPrefix: permalinks[ct.key] ?? `${ct.postType}/category`,
                icon:      ct.icon  ?? 'solar:folder-bold',
                color:     ct.color ?? 'from-emerald-500 to-teal-600',
                items:     [],
                loading:   false,
            })),
        ]);
    }, [activePlugins, permsLoaded, permalinks]);

    // ── Load existing menu ────────────────────────────────────────────────────
    useEffect(() => { if (menuId) loadMenu(); }, [menuId]);

    const loadMenu = async () => {
        setLoading(true);
        try {
            const res = await xFetch(`/menu?id=${menuId}`);
            if (res.ok) {
                const data = await res.json();
                const m = data.menu;
                setTitle(m.title);
                setLocations(m.location ?? []);
                setMenuItems(m.items ?? []);
            }
        } catch (e) { console.error('Error loading menu:', e); }
        finally { setLoading(false); }
    };

    // ── Lazy-load items for a group when first opened ─────────────────────────
    const loadGroupItems = async (typeKey: string, kind: 'post' | 'cat') => {
        setGroups((prev) => prev.map((g) => g.typeKey === typeKey ? { ...g, loading: true } : g));
        try {
            const res = await xFetch(`/menu/items?type=${typeKey}&kind=${kind}`);
            if (res.ok) {
                const data = await res.json();
                setGroups((prev) => prev.map((g) =>
                    g.typeKey === typeKey ? { ...g, items: data.items ?? [], loading: false } : g
                ));
            } else {
                setGroups((prev) => prev.map((g) => g.typeKey === typeKey ? { ...g, loading: false } : g));
            }
        } catch {
            setGroups((prev) => prev.map((g) => g.typeKey === typeKey ? { ...g, loading: false } : g));
        }
    };

    // ── Load builder docs when builder section is first opened ────────────────
    const loadBuilderDocs = async () => {
        if (builderDocs.length > 0 || builderDocsLoading) return;
        setBuilderDocsLoading(true);
        try {
            const res = await xFetch('/builder');
            if (res.ok) {
                const data = await res.json();
                // controller returns an array directly (not wrapped)
                setBuilderDocs(Array.isArray(data) ? data : []);
            }
        } catch { /* silent */ }
        finally { setBuilderDocsLoading(false); }
    };

    const toggleSection = (key: string, kind?: 'post' | 'cat') => {
        const isOpen = expandedSections.has(key);
        setExpandedSections((prev) => {
            const next = new Set(prev);
            isOpen ? next.delete(key) : next.add(key);
            return next;
        });
        if (!isOpen) {
            if (key === '__builder__') {
                loadBuilderDocs();
            } else if (kind) {
                const group = groups.find((g) => g.typeKey === key);
                if (group && group.items.length === 0 && !group.loading) {
                    loadGroupItems(key, kind);
                }
            }
        }
    };

    // ── Selection helpers ─────────────────────────────────────────────────────
    const handleItemSelectToAdd = (id: string) => {
        setSelectedItemsToAdd((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleSelectAllInSection = (sectionItems: AvailableItem[]) => {
        const ids = sectionItems.map((i) => i.id);
        const allSelected = ids.every((id) => selectedItemsToAdd.has(id));
        setSelectedItemsToAdd((prev) => {
            const next = new Set(prev);
            allSelected ? ids.forEach((id) => next.delete(id)) : ids.forEach((id) => next.add(id));
            return next;
        });
    };

    const addSelectedItemsToMenu = () => {
        const newItems: MenuItem[] = [];
        for (const group of groups) {
            for (const item of group.items) {
                if (!selectedItemsToAdd.has(item.id)) continue;
                newItems.push({
                    id: `${Date.now()}-${Math.random()}`,
                    type: group.typeKey,
                    label: item.title,
                    url: buildUrl(group.urlPrefix, item.slug),
                    referenceId: item.id,
                    image: item.image,
                    order: menuItems.length + newItems.length,
                    children: [],
                });
            }
        }
        setMenuItems((prev) => [...prev, ...newItems]);
        setSelectedItemsToAdd(new Set());
    };

    // ── Add selected builder pages to menu ────────────────────────────────────
    const addSelectedBuilderToMenu = () => {
        const newItems: MenuItem[] = [];
        for (const doc of builderDocs) {
            if (!selectedBuilderIds.has(doc._id)) continue;
            newItems.push({
                id:           `builder-${Date.now()}-${Math.random()}`,
                type:         'builder',
                label:        doc.title,
                url:          '#',
                referenceId:  doc._id,
                builderId:    doc._id,
                displayStyle: 'builder',
                order:        menuItems.length + newItems.length,
                children:     [],
            });
        }
        setMenuItems((prev) => [...prev, ...newItems]);
        setSelectedBuilderIds(new Set());
    };

    // ── Custom link ───────────────────────────────────────────────────────────
    const addCustomLink = () => {
        if (!customLabel || !customUrl) return;
        setMenuItems((prev) => [...prev, {
            id: `custom-${Date.now()}`, type: 'custom', label: customLabel,
            url: customUrl, image: customImage || undefined,
            order: prev.length, children: [],
        }]);
        setCustomLabel(''); setCustomUrl(''); setCustomImage('');
    };

    // ── Menu item manipulation ────────────────────────────────────────────────
    const removeMenuItem = (id: string) => {
        const rec = (items: MenuItem[]): MenuItem[] =>
            items.filter((i) => i.id !== id).map((i) => ({ ...i, children: rec(i.children ?? []) }));
        setMenuItems(rec);
        setSelectedMenuItems((prev) => { const n = new Set(prev); n.delete(id); return n; });
    };

    const cloneMenuItemById = (id: string) => {
        const deepClone = (item: MenuItem): MenuItem => ({
            ...item, id: `${Date.now()}-${Math.random()}`,
            children: (item.children ?? []).map(deepClone),
        });
        const insertAfter = (items: MenuItem[]): MenuItem[] => {
            const result: MenuItem[] = [];
            for (const item of items) {
                result.push({ ...item, children: insertAfter(item.children ?? []) });
                if (item.id === id) result.push(deepClone(item));
            }
            return result;
        };
        setMenuItems(insertAfter);
    };

    const removeSelectedMenuItems = () => {
        if (selectedMenuItems.size === 0) return;
        if (!confirm(`Remove ${selectedMenuItems.size} selected item(s)?`)) return;
        const rec = (items: MenuItem[]): MenuItem[] =>
            items.filter((i) => !selectedMenuItems.has(i.id)).map((i) => ({ ...i, children: rec(i.children ?? []) }));
        setMenuItems(rec);
        setSelectedMenuItems(new Set());
    };

    const getAllMenuItemIds = (items: MenuItem[]): string[] => {
        const ids: string[] = [];
        const collect = (list: MenuItem[]) => list.forEach((i) => { ids.push(i.id); collect(i.children ?? []); });
        collect(items);
        return ids;
    };

    const toggleSelectAllMenuItems = () => {
        const allIds = getAllMenuItemIds(menuItems);
        setSelectedMenuItems(selectedMenuItems.size === allIds.length ? new Set() : new Set(allIds));
    };

    const updateMenuItem = (id: string, updates: Partial<MenuItem>) => {
        const rec = (items: MenuItem[]): MenuItem[] =>
            items.map((item) =>
                item.id === id ? { ...item, ...updates } : { ...item, children: rec(item.children ?? []) }
            );
        setMenuItems(rec);
    };

    // ── Edit modal ────────────────────────────────────────────────────────────
    const openEditModal = (item: MenuItem) => {
        setEditingItem(item);
        setEditLabel(item.label);
        setEditUrl(item.url);
        setEditImage(item.image ?? '');
        setEditDisplayStyle(item.displayStyle ?? 'none');
        setEditGridNumber(item.gridNumber ?? 3);
        setEditBuilderId(item.builderId ?? '');
        // Pre-load builder docs so the dropdown is ready
        loadBuilderDocs();
    };

    const closeEditModal = () => {
        setEditingItem(null);
        setEditLabel(''); setEditUrl(''); setEditImage('');
        setEditDisplayStyle('none'); setEditGridNumber(3); setEditBuilderId('');
    };

    const saveEdit = () => {
        if (!editingItem) return;
        updateMenuItem(editingItem.id, {
            label:        editLabel,
            url:          editUrl,
            image:        editImage || undefined,
            displayStyle: editDisplayStyle,
            gridNumber:   editDisplayStyle.startsWith('style-') ? editGridNumber : undefined,
            builderId:    editDisplayStyle === 'builder' ? (editBuilderId || undefined) : undefined,
        });
        closeEditModal();
    };

    // ── Drag & drop ───────────────────────────────────────────────────────────
    const findMenuItem = (items: MenuItem[], id: string): MenuItem | null => {
        for (const item of items) {
            if (item.id === id) return item;
            const found = findMenuItem(item.children ?? [], id);
            if (found) return found;
        }
        return null;
    };

    const removeMenuItemById = (items: MenuItem[], id: string): MenuItem[] =>
        items.filter((i) => i.id !== id)
             .map((i) => ({ ...i, children: removeMenuItemById(i.children ?? [], id) }));

    const handleDragStart = (e: React.DragEvent, id: string, parentId: string | null, index: number) => {
        setDraggedItem({ id, parentId, index });
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        if (!draggedItem || draggedItem.id === id) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const y = e.clientY - rect.top;
        const h = rect.height;
        setDropTarget({ id, position: y < h * 0.25 ? 'before' : y > h * 0.75 ? 'after' : 'inside' });
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!draggedItem || !dropTarget) { setDraggedItem(null); setDropTarget(null); return; }
        const draggedNode = findMenuItem(menuItems, draggedItem.id);
        if (!draggedNode) return;
        let newItems = removeMenuItemById([...menuItems], draggedItem.id);
        const insert = (items: MenuItem[], targetId: string, pos: 'before' | 'after' | 'inside', level = 0): MenuItem[] =>
            items.flatMap((item) => {
                if (item.id === targetId) {
                    if (pos === 'before') return [draggedNode, item];
                    if (pos === 'after')  return [item, draggedNode];
                    if (pos === 'inside' && level < MAX_LEVELS)
                        return [{ ...item, children: [...(item.children ?? []), draggedNode] }];
                }
                return [{ ...item, children: insert(item.children ?? [], targetId, pos, level + 1) }];
            });
        setMenuItems(insert(newItems, dropTarget.id, dropTarget.position, 1));
        setDraggedItem(null);
        setDropTarget(null);
    };

    const handleDragEnd = () => { setDraggedItem(null); setDropTarget(null); };

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await xFetch('/menu', {
                method: menuId ? 'PUT' : 'POST',
                body: JSON.stringify({
                    ...(menuId ? { _id: menuId } : {}),
                    title, location: locations, items: menuItems, status: 'active',
                }),
            });
            if (res.ok) {
                if (menuId) {
                    // Editing — stay on the page, just show a brief confirmation
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2500);
                    setSaving(false);
                    return;
                }
                router.push('/admin/menu');
            } else {
                alert('Failed to save menu');
            }
        } catch { alert('Error saving menu'); }
        finally { setSaving(false); }
    };

    // ── Render a single menu item row ─────────────────────────────────────────
    const renderMenuItem = (item: MenuItem, parentId: string | null = null, index = 0, level = 0) => {
        const isExpanded  = !expandedItems.has(item.id);
        const isDropped   = dropTarget?.id === item.id;
        const hasChildren = (item.children?.length ?? 0) > 0;
        const isBuilder   = item.type === 'builder' || item.displayStyle === 'builder';

        return (
            <div key={item.id} className="w-full">
                <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id, parentId, index)}
                    onDragOver={(e)  => handleDragOver(e, item.id)}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    className={`relative flex items-center gap-1 p-2 border bg-white cursor-move rounded-lg transition-all
                        ${isDropped && dropTarget!.position === 'inside' ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}
                        ${draggedItem?.id === item.id ? 'opacity-50' : ''}`}
                    style={{ marginLeft: level > 0 ? `${level * 1.5}rem` : undefined }}
                >
                    {isDropped && dropTarget!.position === 'before' && (
                        <div className="absolute -top-1 left-0 right-0 h-1.5 bg-blue-500 rounded" />
                    )}
                    {isDropped && dropTarget!.position === 'after' && (
                        <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-blue-500 rounded" />
                    )}

                    <svg className="h-5 w-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>

                    {hasChildren && (
                        <button type="button" onClick={() => {
                            setExpandedItems((prev) => {
                                const n = new Set(prev);
                                n.has(item.id) ? n.delete(item.id) : n.add(item.id);
                                return n;
                            });
                        }} className="p-1 hover:bg-gray-100 rounded shrink-0">
                            <Icon icon={isExpanded ? 'mdi-light:chevron-down' : 'mdi-light:chevron-right'} width={20} />
                        </button>
                    )}

                    {item.image && (
                        <img src={item.image} alt={item.label} className="w-8 h-8 object-cover rounded shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.label}</div>
                        {isBuilder && item.builderId && (
                            <div className="flex items-center gap-1 mt-0.5">
                                <Icon icon="boxicons:layout" width={12} className="text-indigo-400 shrink-0" />
                                <span className="text-xs text-indigo-500 font-mono truncate">
                                    builder:{item.builderId.slice(-8)}
                                </span>
                            </div>
                        )}
                    </div>

                    {level > 0 && <span className="text-xs text-gray-400 italic shrink-0">Level {level}</span>}

                    {isBuilder && (
                        <span className="shrink-0 text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-medium">
                            Builder
                        </span>
                    )}

                    <div className="flex gap-1 shrink-0">
                        <button type="button" onClick={() => openEditModal(item)}
                            className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 hover:bg-blue-50 rounded">
                            Edit
                        </button>
                        <button type="button" onClick={() => cloneMenuItemById(item.id)}
                            className="text-green-600 hover:text-green-800 text-sm px-2 py-1 hover:bg-green-50 rounded">
                            Clone
                        </button>
                        <button type="button" onClick={() => removeMenuItem(item.id)}
                            className="text-red-600 hover:text-red-800 text-sm px-2 py-1 hover:bg-red-50 rounded">
                            Remove
                        </button>
                    </div>
                </div>

                {hasChildren && isExpanded && (
                    <div className="mt-1">
                        {item.children!.map((child, idx) => renderMenuItem(child, item.id, idx, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    // ── Render a dynamic content group in the left panel ──────────────────────
    const renderGroup = (group: ItemGroup) => {
        const isOpen = expandedSections.has(group.typeKey);
        const filtered = group.items.filter((i) => i.title.toLowerCase().includes(searchQuery.toLowerCase()));
        const displayed = activeTab === 'recent' ? filtered.slice(0, 5) : filtered;
        const allSelected = displayed.length > 0 && displayed.every((i) => selectedItemsToAdd.has(i.id));

        return (
            <div key={group.typeKey} className="border rounded-lg bg-white">
                <button
                    type="button"
                    onClick={() => toggleSection(group.typeKey, group.kind)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Icon icon={group.icon} width={16} className="text-gray-500" />
                        <span className="font-semibold text-sm">{group.label}</span>
                    </div>
                    <Icon icon={isOpen ? 'mdi-light:chevron-down' : 'mdi-light:chevron-right'} width={20} />
                </button>

                {isOpen && (
                    <div className="border-t">
                        <div className="flex gap-2 p-2 border-b bg-gray-50">
                            {(['recent', 'all', 'search'] as const).map((tab) => (
                                <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                                    className={`px-3 py-1 text-xs rounded ${activeTab === tab ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>
                                    {tab === 'recent' ? 'Most Recent' : tab === 'all' ? 'View All' : 'Search'}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'search' && (
                            <div className="p-2 border-b">
                                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full p-2 border rounded text-sm" placeholder="Search..." />
                            </div>
                        )}

                        <div className="max-h-64 overflow-y-auto p-2">
                            {group.loading ? (
                                <div className="flex justify-center py-6">
                                    <Icon icon="svg-spinners:ring-resize" width={20} className="text-gray-400" />
                                </div>
                            ) : displayed.length === 0 ? (
                                <p className="text-center text-gray-400 py-4 text-xs">No items found</p>
                            ) : group.kind === 'cat' ? (
                                buildGroupedItems(displayed).map(({ item, depth }) => (
                                    <label key={item.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer rounded"
                                        style={{ paddingLeft: `${8 + depth * 16}px` }}>
                                        {depth > 0 && <span className="text-gray-300 text-xs shrink-0">└</span>}
                                        <input type="checkbox" checked={selectedItemsToAdd.has(item.id)}
                                            onChange={() => handleItemSelectToAdd(item.id)} className="w-4 h-4 shrink-0" />
                                        <span className="text-sm truncate flex-1">{item.title}</span>
                                    </label>
                                ))
                            ) : (
                                displayed.map((item) => (
                                    <label key={item.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer rounded">
                                        <input type="checkbox" checked={selectedItemsToAdd.has(item.id)}
                                            onChange={() => handleItemSelectToAdd(item.id)} className="w-4 h-4 shrink-0" />
                                        <span className="text-sm truncate flex-1">{item.title}</span>
                                    </label>
                                ))
                            )}
                        </div>

                        <div className="p-2 border-t flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                                <input type="checkbox" checked={allSelected}
                                    onChange={() => handleSelectAllInSection(displayed)} className="w-4 h-4" />
                                Select All
                            </label>
                            <button type="button" onClick={addSelectedItemsToMenu}
                                disabled={selectedItemsToAdd.size === 0}
                                className="px-4 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed">
                                Add to Menu
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ── Builder section ───────────────────────────────────────────────────────
    const renderBuilderSection = () => {
        const isOpen = expandedSections.has('__builder__');
        const allSelected = builderDocs.length > 0 && builderDocs.every((d) => selectedBuilderIds.has(d._id));

        return (
            <div className="border rounded-lg bg-white">
                <button
                    type="button"
                    onClick={() => toggleSection('__builder__')}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Icon icon="boxicons:layout" width={16} className="text-indigo-500" />
                        <span className="font-semibold text-sm">Page Builder</span>
                        <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">Panel</span>
                    </div>
                    <Icon icon={isOpen ? 'mdi-light:chevron-down' : 'mdi-light:chevron-right'} width={20} />
                </button>

                {isOpen && (
                    <div className="border-t">
                        <div className="px-3 py-2 bg-indigo-50 border-b text-xs text-indigo-700">
                            Add a builder page as a menu item. In the Edit modal, set its
                            Display Style to <strong>Builder Panel</strong> and choose the
                            builder ID — the hover panel will render that page's content.
                        </div>

                        <div className="max-h-64 overflow-y-auto p-2">
                            {builderDocsLoading ? (
                                <div className="flex justify-center py-6">
                                    <Icon icon="svg-spinners:ring-resize" width={20} className="text-gray-400" />
                                </div>
                            ) : builderDocs.length === 0 ? (
                                <p className="text-center text-gray-400 py-4 text-xs">No builder pages found</p>
                            ) : (
                                builderDocs.map((doc) => (
                                    <label key={doc._id} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer rounded">
                                        <input
                                            type="checkbox"
                                            checked={selectedBuilderIds.has(doc._id)}
                                            onChange={() => {
                                                setSelectedBuilderIds((prev) => {
                                                    const n = new Set(prev);
                                                    n.has(doc._id) ? n.delete(doc._id) : n.add(doc._id);
                                                    return n;
                                                });
                                            }}
                                            className="w-4 h-4 shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{doc.title}</p>
                                            <p className="text-xs text-gray-400 font-mono">{doc._id.slice(-12)}</p>
                                        </div>
                                        <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${doc.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {doc.status}
                                        </span>
                                    </label>
                                ))
                            )}
                        </div>

                        <div className="p-2 border-t flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                                <input type="checkbox" checked={allSelected}
                                    onChange={() => {
                                        const ids = builderDocs.map((d) => d._id);
                                        const all = ids.every((id) => selectedBuilderIds.has(id));
                                        setSelectedBuilderIds(all ? new Set() : new Set(ids));
                                    }}
                                    className="w-4 h-4" />
                                Select All
                            </label>
                            <button type="button" onClick={addSelectedBuilderToMenu}
                                disabled={selectedBuilderIds.size === 0}
                                className="px-4 py-1 bg-indigo-500 text-white rounded text-sm hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed">
                                Add to Menu
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ── Edit modal portal ─────────────────────────────────────────────────────
    const EditModal = () => {
        if (!editingItem) return null;
        const content = (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="p-6 border-b sticky top-0 bg-white flex justify-between items-center">
                        <h2 className="text-xl font-bold">Edit Menu Item</h2>
                        <button type="button" onClick={closeEditModal} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">✕</button>
                    </div>

                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block mb-2 font-medium text-sm">Menu Label</label>
                            <input type="text" value={editLabel} onChange={(e) => setEditLabel(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter menu label" />
                        </div>
                        <div>
                            <label className="block mb-2 font-medium text-sm">URL</label>
                            <input type="text" value={editUrl} onChange={(e) => setEditUrl(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="/page-url or # for panel-only items" />
                        </div>
                        <div>
                            <label className="block mb-2 font-medium text-sm">Menu Icon / Image (Optional)</label>
                            <Gallery multiple={false} value={editImage}
                                onChange={(v) => setEditImage(typeof v === 'string' ? v : v[0] ?? '')}
                                placeholder="Select an image for this menu item" />
                        </div>

                        {/* Display style */}
                        <div>
                            <label className="block mb-2 font-medium text-sm">Display Style (For Parent Menu)</label>
                            <select value={editDisplayStyle} onChange={(e) => setEditDisplayStyle(e.target.value as MenuDisplayStyle)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option value="none">None (Default Dropdown)</option>
                                <option value="left">Menu Left Side</option>
                                <option value="right">Menu Right Side</option>
                                <option value="mega">Mega Menu</option>
                                <option value="style-1">Style 1 — Image top, title below</option>
                                <option value="style-2">Style 2 — Image left, title right</option>
                                <option value="style-3">Style 3 — Title only, clean list</option>
                                <option value="style-4">Style 4 — Image left, title + url</option>
                                <option value="style-5">Style 5 — Icon + title, compact</option>
                                <option value="builder">Builder Panel</option>
                            </select>

                            {/* Grid columns (style-1 … style-5) */}
                            {editDisplayStyle.startsWith('style-') && (
                                <div className="mt-3">
                                    <label className="block mb-2 font-medium text-sm">Grid Columns</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                                            <button key={n} type="button" onClick={() => setEditGridNumber(n)}
                                                className={`w-10 h-10 rounded-lg border-2 text-sm font-semibold transition-colors ${
                                                    editGridNumber === n
                                                        ? 'border-blue-500 bg-blue-500 text-white'
                                                        : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                                                }`}>{n}</button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Number of grid columns for sub-items layout</p>
                                </div>
                            )}

                            {/* Builder ID picker */}
                            {editDisplayStyle === 'builder' && (
                                <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                    <label className="block mb-2 font-medium text-sm text-indigo-800">
                                        Builder Page
                                    </label>
                                    {builderDocsLoading ? (
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Icon icon="svg-spinners:ring-resize" width={16} />
                                            Loading builder pages…
                                        </div>
                                    ) : builderDocs.length === 0 ? (
                                        <p className="text-sm text-gray-500">No builder pages available.</p>
                                    ) : (
                                        <select
                                            value={editBuilderId}
                                            onChange={(e) => setEditBuilderId(e.target.value)}
                                            className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 bg-white"
                                        >
                                            <option value="">— Select a builder page —</option>
                                            {builderDocs.map((doc) => (
                                                <option key={doc._id} value={doc._id}>
                                                    {doc.title}
                                                    {doc.status !== 'active' ? ` (${doc.status})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    <p className="text-xs text-indigo-600 mt-2">
                                        When a visitor hovers this menu item, the selected builder page
                                        will render as the dropdown panel instead of a child list.
                                    </p>
                                    {editBuilderId && (
                                        <p className="text-xs text-gray-400 font-mono mt-1">ID: {editBuilderId}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Item info */}
                        <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 space-y-1">
                            <p className="font-medium text-gray-800 mb-1">Item Information</p>
                            <p><span className="font-medium">Type:</span> {editingItem.type}</p>
                            {editingItem.referenceId && (
                                <p><span className="font-medium">Reference ID:</span> {editingItem.referenceId}</p>
                            )}
                            {editingItem.builderId && (
                                <p><span className="font-medium">Builder ID:</span> {editingItem.builderId}</p>
                            )}
                            {(editingItem.children?.length ?? 0) > 0 && (
                                <p><span className="font-medium">Children:</span> {editingItem.children!.length} sub-items</p>
                            )}
                        </div>
                    </div>

                    <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 sticky bottom-0">
                        <button type="button" onClick={closeEditModal}
                            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="button" onClick={saveEdit} disabled={!editLabel || !editUrl}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        );
        return typeof window !== 'undefined' ? createPortal(content, document.body) : null;
    };

    // ── Loading gates ─────────────────────────────────────────────────────────
    if (loading) return <div className="p-8">Loading...</div>;

    if (activePlugins === null || !permsLoaded) {
        return (
            <div className="flex items-center justify-center py-24 text-gray-400">
                <Icon icon="svg-spinners:ring-resize" width={32} />
            </div>
        );
    }

    // ─── Main render ──────────────────────────────────────────────────────────
    return (
        <>
            <EditModal />
            <form onSubmit={handleSubmit}>
                {/* Title + Save */}
                <div className="mb-6 flex items-end gap-2">
                    <div className="flex-1">
                        <label className="block mb-2 font-medium">{menuId ? 'Edit Title' : 'Create Title'}</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 bg-white" required />
                    </div>
                    <button type="submit" disabled={saving}
                        className={`px-6 py-2 rounded transition-colors text-white ${saved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-400`}>
                        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Menu'}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* ── Left panel ── */}
                    <div className="lg:col-span-1 h-fit sticky top-4 space-y-4">
                        {/* Location multi-select */}
                        <div>
                            <label className="block mb-2 font-medium">Menu Locations</label>
                            <select multiple value={locations}
                                onChange={(e) => setLocations(Array.from(e.target.selectedOptions, (o) => o.value))}
                                className="w-full p-2 border rounded h-32 bg-white focus:ring-2 focus:ring-blue-500">
                                {[
                                    ...Array.from({ length: 10 }, (_, i) => `header-${i + 1}`),
                                    ...Array.from({ length: 10 }, (_, i) => `footer-${i + 1}`),
                                    ...Array.from({ length: 10 }, (_, i) => `mobile-${i + 1}`),
                                    ...Array.from({ length: 5 },  (_, i) => `style-${i + 1}`),
                                ].map((v) => (
                                    <option key={v} value={v}>
                                        {v.replace(/-(\d+)$/, ' $1').replace(/^\w/, (c) => c.toUpperCase())}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Hold Ctrl / Cmd to select multiple</p>
                        </div>

                        {/* Dynamic item groups + builder */}
                        <div>
                            <h2 className="font-bold mb-3 text-lg">Add Menu Items</h2>
                            <div className="space-y-2">
                                {groups.map((group) => renderGroup(group))}

                                {/* Builder section */}
                                {renderBuilderSection()}

                                {/* Custom Links */}
                                <div className="border rounded-lg bg-white">
                                    <button type="button" onClick={() => toggleSection('__custom__')}
                                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <Icon icon="solar:link-bold" width={16} className="text-gray-500" />
                                            <span className="font-semibold text-sm">Custom Links</span>
                                        </div>
                                        <Icon icon={expandedSections.has('__custom__') ? 'mdi-light:chevron-down' : 'mdi-light:chevron-right'} width={20} />
                                    </button>

                                    {expandedSections.has('__custom__') && (
                                        <div className="border-t p-3 space-y-2">
                                            <input type="text" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)}
                                                className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                                                placeholder="URL" />
                                            <input type="text" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)}
                                                className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                                                placeholder="Link Text" />
                                            <button type="button" onClick={addCustomLink}
                                                disabled={!customLabel || !customUrl}
                                                className="w-full bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed">
                                                Add to Menu
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Right panel: Menu Structure ── */}
                    <div className="lg:col-span-2 border rounded-lg p-4 bg-white">
                        <h2 className="font-bold mb-4 text-lg">Menu Structure</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Drag items to reorder. Drop in the middle to nest (up to {MAX_LEVELS} levels).
                            Items with a <span className="text-indigo-600 font-medium">Builder</span> badge
                            will render their linked page-builder content as the hover panel.
                        </p>

                        {menuItems.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-lg">
                                <p className="text-gray-400">No menu items yet. Add items from the left panel.</p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-3 flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox"
                                            checked={selectedMenuItems.size > 0 && selectedMenuItems.size === getAllMenuItemIds(menuItems).length}
                                            onChange={toggleSelectAllMenuItems} className="w-4 h-4" />
                                        <span className="text-sm font-medium">Bulk Select</span>
                                    </label>
                                    {selectedMenuItems.size > 0 && (
                                        <button type="button" onClick={removeSelectedMenuItems}
                                            className="text-red-600 hover:text-red-800 text-sm underline">
                                            Remove Selected ({selectedMenuItems.size})
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    {menuItems.map((item, idx) => renderMenuItem(item, null, idx))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </form>
        </>
    );
}
