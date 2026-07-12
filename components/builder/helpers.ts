import { Column, Row, PresetColumn, ColumnWidths } from "./types";
import columnElement from "./elements/column";
import { getBuilderElements, getBuilderElement } from "@/hook";

// ============================================================
// UID
// ============================================================

let _uid = 0;
export const uid = () => `b_${Date.now()}_${++_uid}`;

// ============================================================
// COLUMN FACTORY  (Elementor-style Container)
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

/**
 * Elementor-style single Container (full-width nested column).
 * Can hold unlimited nested columns[] + elements[] as siblings.
 */
export function makeEmptyColumn(
    widths: ColumnWidths = { desktop: 100, tablet: 100, mobile: 100 }
): Column {
    return makeColumns([{ widths }])[0];
}

/**
 * True for structural containers added from the widget panel.
 * "column" → Container, never stored as a leaf element.
 */
export function isContainerType(type: string): boolean {
    return type === "column" || type === "container";
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

/** Parent path of a column path (empty array = top-level row.columns). */
export function parentPathOf(path: number[]): number[] {
    return path.slice(0, -1);
}

/** Sibling list that owns the column at path. */
export function getSiblingColumns(row: Row, path: number[]): Column[] {
    if (path.length === 1) return row.columns;
    return getColumnByPath(row, parentPathOf(path)).columns;
}

// ============================================================
// ELEMENT REGISTRY (dynamic from hook registry)
// ============================================================

/**
 * Catalog of widgets shown in the elements panel.
 * Elementor model: Container is a nestable widget; Row is structure-only (not listed).
 */
export function getElementCatalog() {
    const elements = getBuilderElements();
    return elements
        .filter((el) => el.type !== "row")
        .map((el) => ({
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

export function regenElements(elements: any[]): any[] {
    return elements.map((el) => {
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
}

/** Recursively regenerate IDs for a column tree (Elementor container paste/duplicate). */
export function regenColumnIds(col: Column): Column {
    return {
        ...col,
        id: uid(),
        elements: regenElements(col.elements || []),
        columns: (col.columns || []).map(regenColumnIds),
    };
}

/** Recursively regenerate all IDs in a row, including nested columns, elements, and carousel slide elements. */
export function regenRowIds(row: Row): Row {
    return {
        ...row,
        id: uid(),
        columns: row.columns.map(regenColumnIds),
    };
}
