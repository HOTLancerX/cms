// hook/builderDataHooks.ts
// Server-only registry. Maps builder element types to async server components.
// Auto-discovers plugin lib/builderData.tsx files via require.context.
// SERVER-ONLY - never import from client components.

import type { ReactNode } from "react";

// A server component factory: receives the element's schema, returns JSX.
type BuilderElementComponent = (schema: any) => ReactNode | Promise<ReactNode>;

const _registry = new Map<string, BuilderElementComponent>();

/**
 * Register a server-side component for a builder element type.
 * Called by plugin lib/builderData.tsx files.
 */
export function registerBuilderElement(
    elementType: string,
    component: BuilderElementComponent
): void {
    _registry.set(elementType, component);
}

/**
 * Returns true when a server component is registered for this element type.
 */
export function hasBuilderElement(elementType: string): boolean {
    return _registry.has(elementType);
}

/**
 * Render the registered server component for an element.
 * Returns null if none is registered.
 */
export async function renderBuilderElement(
    elementType: string,
    schema: any
): Promise<ReactNode> {
    const component = _registry.get(elementType);
    if (!component) return null;
    return component(schema);
}

import React from "react";
import Menus from "@/components/Menus";

registerBuilderElement("menus", async (schema: any) => {
    const location = schema.content?.location || "header-1";
    return React.createElement(Menus, { location, settings: schema.style || {} });
});

// Auto-discovery: scans plugin/*/lib/builderData.ts files.
// Each discovered file calls registerBuilderElement() as a side-effect.

interface RequireContext {
    keys(): string[];
    (id: string): any;
}
declare var require: {
    context(directory: string, useSubdirectories?: boolean, regExp?: RegExp): RequireContext;
    (id: string): any;
};

const ctx = require.context(
    "../plugin",
    true,
    /^\.\/[^/]+\/lib\/builderData\.(ts|tsx|js|jsx)$/
);

ctx.keys().forEach((key: string) => {
    ctx(key);
});
