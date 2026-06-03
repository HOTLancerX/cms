import type { ComponentType } from "react";

// ─── Field props that every UI component receives ───
export interface FieldProps {
    name: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    options?: { label: string; value: string }[];
}

// ─── Hook field definition registered by plugins ───
export interface FormHookField {
    key: string;
    label: string;
    type?: string;
    slug?: string;
    active?: boolean;
    style: "left" | "right";
    position: number;
    component?: ComponentType<any>;
    path?: ComponentType<any>;
    options?: { label: string; value: string }[];
    pluginNx?: string; // stamped automatically by addHook
}

// ─── Nav hook field registered by plugins via addHook("admin.nav", ...) ───
export interface NavHookField {
    key: string;       // unique id for this item
    label: string;
    icon: string;      // Iconify icon name
    slug: string;      // URL path segment, e.g. "plugin" or "plugin/list"
    parent: string;    // key of parent item, "" for top-level
    position: number;
    pluginNx?: string; // stamped automatically by addHook
}

// ─── Type alias for Form components to import ───
export type FormHooks = FormHookField[];

// ─── Plugin metadata shape ───
export interface PluginMeta {
    nx: string;       // canonical unique identifier, e.g. "com.system.blog"
    name: string;
    version: string;
    description: string;
    author: string;
    path: string;
    icon: string;     // Iconify icon name, e.g. "solar:document-bold"
    color: string;    // Tailwind gradient classes, e.g. "from-violet-500 to-purple-600"
}

// ─── Post type definition ───
export interface PostTypeField {
    key: string;       // e.g. "blog", "page", "product"
    label: string;      // e.g. "Blog Post", "Page", "Product"
    icon?: string;      // Iconify icon name
    color?: string;    // Tailwind gradient classes
    hasCategory?: boolean; // whether this post type uses categories (default: true)
    position?: number;  // ordering in UI
    pluginNx?: string; // stamped automatically by addPostType
}

// ─── Category type definition ───
export interface CatTypeField {
    key: string;       // e.g. "blog-category", "product-category"
    label: string;      // e.g. "Blog Category", "Product Category"
    postType: string;   // e.g. "blog", "product" (the parent post type key)
    icon?: string;      // Iconify icon name
    color?: string;    // Tailwind gradient classes
    position?: number;  // ordering in UI
    pluginNx?: string; // stamped automatically by addCatType
}

// ─────────────────────────────────────────────────────────────────────────────
// Active-plugin gate
//
// Keyed by `nx` — the canonical unique identifier — so name casing/spacing
// is completely irrelevant.
//
// State: null  → gate not yet initialised (open — allows registrations during
//                early boot / tests where setActivePlugins was never called).
//        Set   → gate is armed; only listed nx values may register hooks.
// ─────────────────────────────────────────────────────────────────────────────

let _activePlugins: Set<string> | null = null;

/**
 * Arm the active-plugin gate.
 * Call this ONCE, before importing any plugin modules, with the `nx` values
 * of every plugin whose status is "active" in the database.
 *
 * @param nxIds - plugin nx identifiers that are allowed to register hooks
 */
export function setActivePlugins(nxIds: string[]): void {
    _activePlugins = new Set(nxIds);
}

/**
 * Returns true when the gate is armed and the given nx is active.
 * Returns true when the gate has not been armed yet (open during boot/tests).
 */
export function isPluginActive(nx: string): boolean {
    if (_activePlugins === null) return true; // gate not armed → open
    return _activePlugins.has(nx);
}

/**
 * Reset the gate (useful for testing).
 */
export function resetActivePlugins(): void {
    _activePlugins = null;
}

// ─── Internal hook registry (module-level singleton) ───
const hooks: Record<string, FormHookField[]> = {};

// ─── Permanent root pages store ───────────────────────────────────────────────
// Written to by every addHook("root.pages", ...) call regardless of gate state.
// Never cleared by clearHooks() so server components always have the full list.
const _rootPages: FormHookField[] = [];

// ─── Permanent admin pages store ─────────────────────────────────────────────
// Written to by every addHook("admin.pages", ...) call regardless of gate state.
// Never cleared by clearHooks() so server components always have the full list.
const _adminPages: FormHookField[] = [];

/**
 * Returns every root.pages entry ever registered across all plugins.
 * Not affected by the gate or clearHooks — safe to call from server components.
 */
export function getAllRootPages(): FormHookField[] {
    return [..._rootPages].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

/**
 * Register form fields for a given hook point.
 *
 * @param hookName  - e.g. "post.form", "cat.form", "admin.pages"
 * @param fields    - array of field definitions to register
 * @param pluginNx  - the plugin's `nx` identifier (used for the gate check)
 */
export function addHook(
    hookName: string,
    fields: FormHookField[] | NavHookField[],
    pluginNx: string
): void {
    // ── admin.nav → permanent nav registry (no gate, never cleared) ──────────
    if (hookName === "admin.nav") {
        (fields as NavHookField[]).forEach((f) => {
            const exists = _navItems.some(
                (n) => n.pluginNx === pluginNx && n.key === f.key
            );
            if (!exists) _navItems.push({ ...f, pluginNx });
        });
        // Gate check still applies for the normal hooks registry
        if (!isPluginActive(pluginNx)) return;
        // nav items don't go into the FormHookField registry
        return;
    }

    const stamped = (fields as FormHookField[]).map((f) => ({ ...f, pluginNx }));

    // root.pages always goes into the permanent store (no gate, never cleared)
    if (hookName === "root.pages") {
        // Avoid duplicates on hot-reload re-registration
        stamped.forEach((f) => {
            const exists = _rootPages.some(
                (r) => r.pluginNx === f.pluginNx && r.label === f.label
            );
            if (!exists) _rootPages.push(f);
        });
        // Also fall through to the normal registry for client-side consumers
    }

    // admin.pages always goes into the permanent store (no gate, never cleared)
    if (hookName === "admin.pages") {
        // Avoid duplicates on hot-reload re-registration
        stamped.forEach((f) => {
            const exists = _adminPages.some(
                (r) => r.pluginNx === f.pluginNx && r.key === f.key
            );
            if (!exists) _adminPages.push(f);
        });
        // Also fall through to the normal registry for client-side consumers
    }

    // ── Gate check for all other hooks (and root.pages in normal registry) ────
    // admin.pages bypasses the gate so plugins can register pages without being activated
    if (!isPluginActive(pluginNx) && hookName !== "admin.pages") {
        return;
    }

    if (!hooks[hookName]) {
        hooks[hookName] = [];
    }
    // Avoid duplicates in the gated registry too
    stamped.forEach((f) => {
        const exists = hooks[hookName].some(
            (h) => h.pluginNx === f.pluginNx && h.key === f.key
        );
        if (!exists) hooks[hookName].push(f);
    });
}

/**
 * Retrieve registered fields for a hook point.
 * Optionally filter by `type`:
 *   - If type is provided, return fields with matching type OR fields with no type (universal).
 *   - If type is omitted, return ALL fields.
 * Results are sorted by `position` ascending.
 *
 * @param hookName - e.g. "post.form", "cat.form"
 * @param type     - optional content-type filter (e.g. "post", "cat")
 */
export function getHooks(hookName: string, type?: string): FormHookField[] {
    const all = hooks[hookName] || [];

    const filtered = type
        ? all.filter((f) => !f.type || f.type === type)
        : all;

    return [...filtered].sort((a, b) => a.position - b.position);
}

/**
 * Clear all registered hooks (useful for testing).
 */
export function clearHooks(): void {
    for (const key of Object.keys(hooks)) {
        delete hooks[key];
    }
}

/**
 * Register built-in core hooks.
 *
 * Accepts a callback (the core register() function) and runs it with the
 * active-plugin gate temporarily opened so CORE_NX always passes through.
 * Called by reregisterHooks() in hook/PluginList.ts after clearHooks() and
 * setActivePlugins(), ensuring core fields are always present regardless of
 * which plugins are active.
 *
 * @param registerFn - the register() export from components/admin/index.ts
 */
export function registerCoreHooks(registerFn: () => void): void {
    const previous = _activePlugins;
    _activePlugins = null; // open gate — CORE_NX always passes
    try {
        registerFn();
    } finally {
        _activePlugins = previous; // restore gate
    }
}

// ─── Nav registry (permanent, never cleared) ──────────────────────────────────
// addHook("admin.nav", ...) writes here. Separate from FormHookField registry.
const _navItems: NavHookField[] = [];

/**
 * Returns all registered admin.nav items across all plugins.
 * Never cleared — safe to call from anywhere.
 */
export function getAllNavItems(): NavHookField[] {
    return [..._navItems].sort((a, b) => a.position - b.position);
}

/**
 * Returns every admin.pages entry ever registered across all plugins.
 * Not affected by the gate or clearHooks — safe to call from server components.
 */
export function getAllAdminPages(): FormHookField[] {
    return [..._adminPages].sort((a, b) => a.position - b.position);
}
// ─── Post types registry (permanent, never cleared) ──────────────────────────
const _postTypes: PostTypeField[] = [];
const _catTypes: CatTypeField[] = [];

/**
 * Register a post type (or array of post types).
 */
export function addPostType(
    pts: PostTypeField | PostTypeField[],
    pluginNx?: string
): void {
    const items = Array.isArray(pts) ? pts : [pts];
    for (const pt of items) {
        if (!_postTypes.some((p) => p.key === pt.key)) {
            // Auto-stamp pluginNx if provided and not already set
            if (pluginNx && !pt.pluginNx) {
                pt.pluginNx = pluginNx;
            }
            _postTypes.push(pt);
        }
    }
}

/**
 * Returns all registered post types.
 */
export function getAllPostTypes(): PostTypeField[] {
    return [..._postTypes];
}

/**
 * Returns a single post type by key, or undefined.
 */
export function getPostType(key: string): PostTypeField | undefined {
    return _postTypes.find((p) => p.key === key);
}

/**
 * Register a category type (or array of category types).
 */
export function addCatType(
    cts: CatTypeField | CatTypeField[],
    pluginNx?: string
): void {
    const items = Array.isArray(cts) ? cts : [cts];
    for (const ct of items) {
        if (!_catTypes.some((c) => c.key === ct.key)) {
            // Auto-stamp pluginNx if provided and not already set
            if (pluginNx && !ct.pluginNx) {
                ct.pluginNx = pluginNx;
            }
            _catTypes.push(ct);
        }
    }
}

/**
 * Returns all registered category types.
 */
export function getAllCatTypes(): CatTypeField[] {
    return [..._catTypes];
}