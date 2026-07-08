/**
 * hook/pluginHooks.ts — WordPress-style dynamic action/filter registry.
 *
 * This is the central cross-plugin integration bus. Instead of plugins
 * importing each other directly (tight coupling), they communicate through
 * named hooks — exactly like WordPress's add_action / do_action / apply_filters.
 *
 * ─── Concepts ────────────────────────────────────────────────────────────────
 *
 *  Action  — fire-and-forget. Multiple handlers can listen.
 *            Like WordPress do_action / add_action.
 *
 *            addAction("order.delivered", handler, pluginNx, priority?)
 *            doAction("order.delivered", payload)
 *
 *  Filter  — transform a value through a chain of handlers.
 *            Like WordPress apply_filters / add_filter.
 *
 *            addFilter("cart.total", handler, pluginNx, priority?)
 *            applyFilter("cart.total", value, context?)
 *
 *  Service — register / resolve a named async factory (lazy singleton).
 *            Replaces direct cross-plugin model/utility imports.
 *
 *            registerService("seller.wallet", () => import("..."))
 *            resolveService<WalletModule>("seller.wallet")  → WalletModule | null
 *
 * ─── Rules ───────────────────────────────────────────────────────────────────
 *  • All stores are permanent (never cleared by clearHooks).
 *  • The active-plugin gate is checked at CALL TIME (doAction / applyFilter /
 *    resolveService), not at registration time.
 *  • Handlers are sorted by priority ascending (lower = earlier, WP default = 10).
 *  • Works on both client and server — service resolution is server-only by
 *    convention (lazy imports of Mongoose models).
 */

import type { ComponentType } from "react";
import { isPluginActive } from "@/hook";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionHandler<T = any> = (payload: T) => void | Promise<void>;
export type FilterHandler<T = any, C = any> = (value: T, context?: C) => T | Promise<T>;

interface ActionEntry<T = any> {
    handler: ActionHandler<T>;
    pluginNx: string;
    priority: number;
}

interface FilterEntry<T = any> {
    handler: FilterHandler<T>;
    pluginNx: string;
    priority: number;
}

// ─── Internal registries (permanent, never cleared) ──────────────────────────

const _actions = new Map<string, ActionEntry[]>();
const _filters = new Map<string, FilterEntry[]>();
const _services = new Map<string, { factory: () => Promise<any>; pluginNx: string }>();
const _serviceCache = new Map<string, any>();

// ─── Action API ──────────────────────────────────────────────────────────────

/**
 * Register a handler for a named action.
 *
 * @param hookName  - e.g. "order.delivered", "return.approved"
 * @param handler   - async function that receives the action payload
 * @param pluginNx  - the registering plugin's nx identifier (gate check at call time)
 * @param priority  - lower fires first (default: 10, same as WordPress)
 *
 * @example
 *   // In plugin/seller/index.ts register():
 *   addAction("order.delivered", async ({ orderId, items }) => {
 *     await creditSellerWallet(orderId, items);
 *   }, PLUGINS.nx, 10);
 */
export function addAction<T = any>(
    hookName: string,
    handler: ActionHandler<T>,
    pluginNx: string,
    priority = 10
): void {
    if (!_actions.has(hookName)) _actions.set(hookName, []);
    _actions.get(hookName)!.push({ handler, pluginNx, priority });
}

/**
 * Fire all registered handlers for a named action.
 * Handlers are called in priority order. Inactive-plugin handlers are skipped.
 * All handlers run sequentially (await each in order).
 *
 * @param hookName - e.g. "order.delivered"
 * @param payload  - arbitrary data passed to every handler
 */
export async function doAction<T = any>(hookName: string, payload: T): Promise<void> {
    const entries = (_actions.get(hookName) ?? [])
        .filter((e) => isPluginActive(e.pluginNx))
        .sort((a, b) => a.priority - b.priority);

    for (const entry of entries) {
        await entry.handler(payload);
    }
}

/**
 * Returns true if at least one active handler is registered for the action.
 */
export function hasAction(hookName: string): boolean {
    return (_actions.get(hookName) ?? []).some((e) => isPluginActive(e.pluginNx));
}

// ─── Filter API ───────────────────────────────────────────────────────────────

/**
 * Register a handler that transforms a value for a named filter.
 *
 * @param hookName  - e.g. "cart.total", "order.items"
 * @param handler   - receives (value, context?) and returns the (modified) value
 * @param pluginNx  - the registering plugin's nx identifier
 * @param priority  - lower fires first (default: 10)
 *
 * @example
 *   // In plugin/flash-sale/index.ts register():
 *   addFilter("cart.total", (total, { items }) => {
 *     return applyFlashSaleDiscount(total, items);
 *   }, PLUGINS.nx, 20);
 */
export function addFilter<T = any, C = any>(
    hookName: string,
    handler: FilterHandler<T, C>,
    pluginNx: string,
    priority = 10
): void {
    if (!_filters.has(hookName)) _filters.set(hookName, []);
    _filters.get(hookName)!.push({ handler, pluginNx, priority });
}

/**
 * Pass a value through all registered filter handlers.
 * Each handler receives the output of the previous one (pipeline).
 * Inactive-plugin handlers are skipped.
 *
 * @param hookName - e.g. "cart.total"
 * @param value    - the initial value
 * @param context  - optional read-only context (not transformed)
 * @returns        - the final transformed value
 */
export async function applyFilter<T = any, C = any>(
    hookName: string,
    value: T,
    context?: C
): Promise<T> {
    const entries = (_filters.get(hookName) ?? [])
        .filter((e) => isPluginActive(e.pluginNx))
        .sort((a, b) => a.priority - b.priority);

    let current = value;
    for (const entry of entries) {
        current = await entry.handler(current, context);
    }
    return current;
}

// ─── Service Registry ─────────────────────────────────────────────────────────

/**
 * Register a named lazy service factory.
 * The factory is only called when resolveService() is first invoked and the
 * owning plugin is active. The resolved module is cached indefinitely.
 *
 * Use this to replace direct cross-plugin Mongoose model / utility imports:
 *
 * @example
 *   // In plugin/seller/index.ts register():
 *   registerService(
 *     "seller.wallet",
 *     () => import("@/plugin/seller/models/Wallet"),
 *     PLUGINS.nx
 *   );
 *
 *   // In plugin/product/api/returns/route.ts (instead of direct import):
 *   const walletMod = await resolveService<typeof import("@/plugin/seller/models/Wallet")>(
 *     "seller.wallet"
 *   );
 *   if (walletMod) await walletMod.updateWallet(userId, { balance: -amount });
 *
 * @param name      - unique service identifier, e.g. "seller.wallet"
 * @param factory   - async factory that returns the module / object
 * @param pluginNx  - the owning plugin's nx identifier
 */
export function registerService(
    name: string,
    factory: () => Promise<any>,
    pluginNx: string
): void {
    // Last registration wins (hot-reload / re-register safety)
    _services.set(name, { factory, pluginNx });
}

/**
 * Resolve a named service.
 * Returns null if:
 *  - No service is registered with that name
 *  - The owning plugin is not currently active
 *
 * The result is cached after first resolution.
 *
 * @param name - the service identifier, e.g. "seller.wallet"
 * @returns    - the resolved module, or null
 */
export async function resolveService<T = any>(name: string): Promise<T | null> {
    const entry = _services.get(name);
    if (!entry) return null;
    if (!isPluginActive(entry.pluginNx)) return null;

    if (_serviceCache.has(name)) {
        return _serviceCache.get(name) as T;
    }

    const resolved = await entry.factory();
    _serviceCache.set(name, resolved);
    return resolved as T;
}

/**
 * Invalidate a cached service (useful for testing or plugin deactivation).
 */
export function invalidateService(name: string): void {
    _serviceCache.delete(name);
}

/**
 * Returns true if a service is registered AND its owning plugin is active.
 */
export function hasService(name: string): boolean {
    const entry = _services.get(name);
    if (!entry) return false;
    return isPluginActive(entry.pluginNx);
}

// ─── Lazy Component Registry ──────────────────────────────────────────────────
//
// Replaces direct top-level React component imports in plugin index.ts files.
// Instead of:
//   import HeavyComponent from "./heavy/HeavyComponent";
//   addHook("admin.pages", [{ ..., path: HeavyComponent }], nx)
//
// Do:
//   registerLazyComponent("product.ReturnManager", () => import("./orders/ReturnManager"));
//   addHook("admin.pages", [{ ..., lazyPath: "product.ReturnManager" }], nx)
//
// The admin/account/root page renderers call resolveLazyComponent() to get
// the actual component before rendering.

const _lazyComponents = new Map<string, {
    factory: () => Promise<{ default: ComponentType<any> }>;
    pluginNx: string;
}>();
const _lazyComponentCache = new Map<string, ComponentType<any>>();

/**
 * Register a lazy React component by name.
 *
 * @param name      - unique key, e.g. "product.ReturnManager"
 * @param factory   - () => import("./...") — standard dynamic import
 * @param pluginNx  - the owning plugin's nx identifier
 *
 * @example
 *   registerLazyComponent(
 *     "product.ReturnManager",
 *     () => import("./orders/ReturnManager"),
 *     PLUGINS.nx
 *   );
 */
export function registerLazyComponent(
    name: string,
    factory: () => Promise<{ default: ComponentType<any> }>,
    pluginNx: string
): void {
    _lazyComponents.set(name, { factory, pluginNx });
}

/**
 * Resolve a lazy component by name.
 * Returns null if not registered or plugin is inactive.
 * Result is cached after first resolution.
 */
export async function resolveLazyComponent(
    name: string
): Promise<ComponentType<any> | null> {
    const entry = _lazyComponents.get(name);
    if (!entry) return null;
    if (!isPluginActive(entry.pluginNx)) return null;

    if (_lazyComponentCache.has(name)) {
        return _lazyComponentCache.get(name)!;
    }

    const mod = await entry.factory();
    const component = mod.default;
    _lazyComponentCache.set(name, component);
    return component;
}

// ─── Debug helpers ────────────────────────────────────────────────────────────

/**
 * Returns a snapshot of all registered action hook names.
 * Useful for admin tooling / debugging.
 */
export function getRegisteredActions(): string[] {
    return [..._actions.keys()];
}

/**
 * Returns a snapshot of all registered filter hook names.
 */
export function getRegisteredFilters(): string[] {
    return [..._filters.keys()];
}

/**
 * Returns a snapshot of all registered service names.
 */
export function getRegisteredServices(): string[] {
    return [..._services.keys()];
}
