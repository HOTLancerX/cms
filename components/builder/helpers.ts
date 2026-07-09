import { Column, Row, PresetColumn } from "./types";
import columnElement from "./elements/column";
import { getBuilderElements, getBuilderElement } from "@/hook";

// ============================================================
// UID
// ============================================================

let _uid = 0;
export const uid = () => `b_${Date.now()}_${++_uid}`;

// ============================================================
// COLUMN FACTORY
// ============================================================

/** Build Column[] from a PresetColumn[] definition (supports nested children + columnSchema). */
export function makeColumns(presetCols: PresetColumn[]): Column[] {
    return presetCols.map((p) => {
        const schema = JSON.parse(JSON.stringify(columnElement.schema));

        // Apply columnSchema overrides if present
        if (p.columnSchema) {
            const cs = p.columnSchema;
            if (cs.layout) {
                if (cs.layout.flex) Object.assign(schema.layout.flex, cs.layout.flex);
                if (cs.layout.wrap !== undefined) schema.layout.wrap = cs.layout.wrap;
                if (cs.layout.gap) Object.assign(schema.layout.gap, cs.layout.gap);
            }
            if (cs.advanced) {
                if (cs.advanced.padding) Object.assign(schema.advanced.padding, cs.advanced.padding);
                if (cs.advanced.margin) Object.assign(schema.advanced.margin, cs.advanced.margin);
            }
        }

        return {
            id: uid(),
            width: p.widths.desktop,
            widths: p.widths,
            elements: [],
            columns: p.children ? makeColumns(p.children) : [],
            schema,
        };
    });
}

// ============================================================
// PATH TRAVERSAL
// ============================================================

export function getColumnByPath(row: Row, path: number[]): Column {
    let col = row.columns[path[0]];
    for (let i = 1; i < path.length; i++) {
        col = col.columns[path[i]];
    }
    return col;
}

// ============================================================
// ELEMENT REGISTRY (dynamic from hook registry)
// ============================================================

/**
 * Returns the catalog of all registered builder elements.
 * Includes core elements + plugin elements from active plugins.
 */
export function getElementCatalog() {
    const elements = getBuilderElements();
    return elements.map((el) => ({
        type: el.type,
        label: el.label || "Element",
        icon: el.icon || "mdi:cube-outline",
        category: el.category || "General",
        element: el,
    }));
}

/** @deprecated Use getElementCatalog() directly — this is a static snapshot taken at module load. */
export const ELEMENT_CATALOG = getElementCatalog();

/**
 * Returns the element definition by type.
 * Respects the active-plugin gate — plugin elements only returned when active.
 */
export function getElementDef(type: string) {
    return getBuilderElement(type);
}

// ============================================================
// DEEP ID REGENERATION (for copy/paste, drag-drop)
// ============================================================

/** Recursively regenerate all IDs in a row, including nested columns, elements, and carousel slide elements. */
export function regenRowIds(row: Row): Row {
    const regenElements = (elements: any[]): any[] =>
        elements.map((el) => {
            const newEl = { ...el, id: uid() };
            if (el.type === "carousel" && el.schema?.content?.slides) {
                newEl.schema = JSON.parse(JSON.stringify(el.schema));
                newEl.schema.content.slides = newEl.schema.content.slides.map((slide: any) => ({
                    ...slide,
                    id: uid(),
                    elements: regenElements(slide.elements || []),
                }));
            }
            return newEl;
        });

    const regenCol = (col: Column): Column => ({
        ...col,
        id: uid(),
        elements: regenElements(col.elements),
        columns: col.columns.map(regenCol),
    });

    return {
        ...row,
        id: uid(),
        columns: row.columns.map(regenCol),
    };
}
