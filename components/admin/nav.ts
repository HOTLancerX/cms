/**
 * Admin navigation registry.
 *
 * Nav items come from two sources, both via addHook("admin.nav", ...):
 *   1. Core items  — registered by components/admin/index.ts (CORE_NX), always present.
 *   2. Plugin items — registered by each plugin's register(), gated by activeNxIds.
 *
 * buildNavTree() merges both sources and returns a nested tree for rendering.
 */

import type { NavHookField } from "@/hook";
import { getAllNavItems } from "@/hook";
import { CORE_NX } from "@/components/admin";

// ─── Nav tree node ────────────────────────────────────────────────────────────
export interface NavNode extends NavHookField {
    children: NavNode[];
}

/**
 * Merges core nav items with plugin-registered items and builds a tree.
 *
 * - Core items (pluginNx === CORE_NX) are always included.
 * - Plugin items are only included if their pluginNx is in activeNxIds.
 * - Children are nested under their parent by key.
 * - Each level is sorted by position.
 *
 * @param activeNxIds - nx identifiers of plugins with status "active" in the DB
 */
export function buildNavTree(activeNxIds: string[]): NavNode[] {
    const activeSet = new Set(activeNxIds);

    const allItems = getAllNavItems().filter(
        (item) => item.pluginNx === CORE_NX || (item.pluginNx && activeSet.has(item.pluginNx))
    );

    // Build map
    const nodeMap = new Map<string, NavNode>();
    allItems.forEach((item) => {
        nodeMap.set(item.key, { ...item, children: [] });
    });

    // Nest children under parents
    const roots: NavNode[] = [];
    allItems.forEach((item) => {
        const node = nodeMap.get(item.key)!;
        if (item.parent && nodeMap.has(item.parent)) {
            nodeMap.get(item.parent)!.children.push(node);
        } else {
            roots.push(node);
        }
    });

    // Sort each level by position
    const sortNodes = (nodes: NavNode[]) => {
        nodes.sort((a, b) => a.position - b.position);
        nodes.forEach((n) => sortNodes(n.children));
    };
    sortNodes(roots);

    return roots;
}
