import { Column, Row, PresetColumn } from "./types";
import headingElement from "./elements/heading";
import columnElement from "./elements/column";

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
// ELEMENT REGISTRY
// ============================================================

const ELEMENTS = [headingElement, columnElement];

export const ELEMENT_CATALOG = [
    {
        type: headingElement.type,
        label: headingElement.label || "Heading",
        icon: headingElement.icon || "mdi:cube-outline",
        category: headingElement.category || "General",
        element: headingElement,
    },
    {
        type: columnElement.type,
        label: columnElement.label || "Container",
        icon: columnElement.icon || "mdi:cube-outline",
        category: columnElement.category || "General",
        element: columnElement,
    },
];

export function getElementDef(type: string) {
    return ELEMENTS.find((e) => e.type === type);
}
