/**
 * hook/pluginHooks.ts — WordPress-style dynamic action/filter registry.
 *
 * Self-contained: no imports from @/hook or any other @/ path, so it
 * resolves correctly from plugin subdirectories under Turbopack.
 *
 * ─── Concepts ────────────────────────────────────────────────────────────────
 *
 *  Action  — fire-and-forget. Multiple handlers can listen.
 *            addAction("order.delivered", handler, pluginNx, priority?)
 *            doAction("order.delivered", payload)
 *
 *  Filter  — transform a value through a pipeline of handlers.
 *            addFilter("cart.total", handler, pluginNx, priority?)
 *            applyFilter("cart.total", value, context?)
 *
 *  Service — register / resolve a named async factory (lazy singleton).
 *            registerService("seller.wallet", () => import("..."), pluginNx)
 *            resolveService<T>("seller.wallet")  → T | null
 *
 *  Lazy Component — register a dynamic-import React component by name.
 *            registerLazyComponent("product.ReturnManager", () => import("..."), pluginNx)
 *            resolveLazyComponent("product.ReturnManager") → ComponentType | null
 *
 * ─── Rules ───────────────────────────────────────────────────────────────────
 *  • All stores are permanent (never cleared by clearHooks).
 *  • The active-plugin gate is checked at CALL TIME via _isActive().
 *  • _isActive is wired up by hook/index.ts calling setPluginBusGate() on init.
 *  • Handlers run sequentially in priority order (lower = earlier, default 10).
 */

import type { ComponentType } from "react";

// ─── Gate wiring ──────────────────────────────────────────────────────────────
// hook/index.ts calls setPluginBusGate(isPluginActive) once at module load so
// this file never needs to import from @/hook.

let _isActive: (nx: string) => boolean = () => true; // open by default

export function setPluginBusGate(fn: (nx: string) => boolean): void {
    _isActive = fn;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionHandler<T = any> = (payload: T) => void | Promise<void>;
export type FilterHandler<T = any, C = any> = (value: T, context?: C) => T | Promise<T>;

interface ActionEntry {
    handler:  ActionHandler;
    pluginNx: string;
    priority: number;
}

interface FilterEntry {
    handler:  FilterHandler;
    pluginNx: string;
    priority: number;
}

// ─── Registries ───────────────────────────────────────────────────────────────

const _actions  = new Map<string, ActionEntry[]>();
const _filters  = new Map<string, FilterEntry[]>();
const _services = new Map<string, { factory: () => Promise<any>; pluginNx: string }>();
const _serviceCache  = new Map<string, any>();
const _lazyComponents = new Map<string, { factory: () => Promise<{ default: ComponentType<any> }>; pluginNx: string }>();
const _lazyCache = new Map<string, ComponentType<any>>();

// ─── Action API ───────────────────────────────────────────────────────────────

export function addAction<T = any>(
    hookName: string,
    handler: ActionHandler<T>,
    pluginNx: string,
    priority = 10
): void {
    if (!_actions.has(hookName)) _actions.set(hookName, []);
    _actions.get(hookName)!.push({ handler, pluginNx, priority });
}

export async function doAction<T = any>(hookName: string, payload: T): Promise<void> {
    const entries = (_actions.get(hookName) ?? [])
        .filter((e) => _isActive(e.pluginNx))
        .sort((a, b) => a.priority - b.priority);
    for (const e of entries) await e.handler(payload);
}

export function hasAction(hookName: string): boolean {
    return (_actions.get(hookName) ?? []).some((e) => _isActive(e.pluginNx));
}

// ─── Filter API ───────────────────────────────────────────────────────────────

export function addFilter<T = any, C = any>(
    hookName: string,
    handler: FilterHandler<T, C>,
    pluginNx: string,
    priority = 10
): void {
    if (!_filters.has(hookName)) _filters.set(hookName, []);
    _filters.get(hookName)!.push({ handler, pluginNx, priority });
}

export async function applyFilter<T = any, C = any>(
    hookName: string,
    value: T,
    context?: C
): Promise<T> {
    const entries = (_filters.get(hookName) ?? [])
        .filter((e) => _isActive(e.pluginNx))
        .sort((a, b) => a.priority - b.priority);
    let current = value;
    for (const e of entries) current = await e.handler(current, context);
    return current;
}

// ─── Service Registry ─────────────────────────────────────────────────────────

export function registerService(
    name: string,
    factory: () => Promise<any>,
    pluginNx: string
): void {
    _services.set(name, { factory, pluginNx });
}

export async function resolveService<T = any>(name: string): Promise<T | null> {
    const entry = _services.get(name);
    if (!entry || !_isActive(entry.pluginNx)) return null;
    if (_serviceCache.has(name)) return _serviceCache.get(name) as T;
    const resolved = await entry.factory();
    _serviceCache.set(name, resolved);
    return resolved as T;
}

export function invalidateService(name: string): void {
    _serviceCache.delete(name);
}

export function hasService(name: string): boolean {
    const entry = _services.get(name);
    return !!entry && _isActive(entry.pluginNx);
}

// ─── Lazy Component Registry ──────────────────────────────────────────────────

export function registerLazyComponent(
    name: string,
    factory: () => Promise<{ default: ComponentType<any> }>,
    pluginNx: string
): void {
    _lazyComponents.set(name, { factory, pluginNx });
}

export async function resolveLazyComponent(
    name: string
): Promise<ComponentType<any> | null> {
    const entry = _lazyComponents.get(name);
    if (!entry || !_isActive(entry.pluginNx)) return null;
    if (_lazyCache.has(name)) return _lazyCache.get(name)!;
    const mod = await entry.factory();
    _lazyCache.set(name, mod.default);
    return mod.default;
}

// ─── Debug helpers ────────────────────────────────────────────────────────────

export function getRegisteredActions(): string[]  { return [..._actions.keys()]; }
export function getRegisteredFilters(): string[]  { return [..._filters.keys()]; }
export function getRegisteredServices(): string[] { return [..._services.keys()]; }
