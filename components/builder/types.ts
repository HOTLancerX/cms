import type { ReactNode } from "react";
import rowElement from "./elements/row";
import columnElement from "./elements/column";

export type Device = "desktop" | "tablet" | "mobile";

export interface BuilderElement {
    id: string;
    type: string;
    schema: Record<string, any>;
}

/**
 * Responsive column widths.
 * desktop/tablet/mobile are percentages (0–100).
 * If tablet/mobile are omitted, desktop value is used as fallback.
 */
export interface ColumnWidths {
    desktop: number;
    tablet?: number;
    mobile?: number;
}

export interface Column {
    id: string;
    /** Legacy flat width — kept for backward compat. Use `widths` for responsive. */
    width: number;
    /** Responsive widths per device. Takes precedence over `width` when present. */
    widths?: ColumnWidths;
    elements: BuilderElement[];
    columns: Column[];
    schema: typeof columnElement.schema;
}

export interface Row {
    id: string;
    columns: Column[];
    schema: typeof rowElement.schema;
}

export type LeftPanelMode =
    | "row-controls"
    | "column-controls"
    | "add-columns"
    | "elements"
    | "sections"
    | "element-controls"
    | null;

export type Selection =
    | { type: "row"; id: string }
    | { type: "column"; rowId: string; path: number[] }
    | { type: "element"; rowId: string; colPath: number[]; elementId: string };

/**
 * A single control entry inside an element/row/column definition.
 *
 * responsive: true  → value is stored with device overrides via setDeviceValue.
 *                     The panel shows a device indicator icon next to the label.
 *                     CanvasStyles resolves the correct value per device via getDeviceValue.
 * responsive: false (default) → value is always written flat (desktop only).
 *                     Use for style controls like background, border, boxShadow
 *                     that intentionally apply to all devices equally.
 */
export interface ControlDef {
    name: string;
    responsive?: boolean;
    condition?: (schema: any) => boolean;
    render: (value: any, onChange: (v: any) => void, ctx?: any) => ReactNode;
}

// ─── Preset column definition ─────────────────────────────────────────────────

/**
 * A preset column — may contain nested child columns.
 * widths: responsive percentages for desktop / tablet / mobile.
 * columnSchema: optional schema overrides applied to this column when created.
 */
export interface PresetColumn {
    widths: ColumnWidths;
    children?: PresetColumn[];
    /** Optional column schema overrides (flex, wrap, gap, padding, margin). */
    columnSchema?: {
        layout?: {
            flex?: {
                direction?: "row" | "column" | "row-reverse" | "column-reverse";
                justifyContent?: string;
                alignItems?: string;
            };
            wrap?: "nowrap" | "wrap" | "wrap-reverse";
            gap?: { column: number; row: number; unit: string };
        };
        advanced?: {
            padding?: { top: number; right: number; bottom: number; left: number; unit?: string };
            margin?: { top: number; right: number; bottom: number; left: number; unit?: string };
        };
    };
}

/**
 * Partial row schema overrides applied when a preset is inserted.
 * Only the fields listed here are merged — everything else uses the
 * row element's default schema values.
 */
export interface PresetRowSchema {
    layout?: {
        flex?: {
            direction?: "row" | "column" | "row-reverse" | "column-reverse";
            justifyContent?: string;
            alignItems?: string;
        };
        wrap?: "nowrap" | "wrap" | "wrap-reverse";
        gap?: { column: number; row: number; unit: string };
    };
    advanced?: {
        padding?: { top: number; right: number; bottom: number; left: number; unit?: string };
        margin?: { top: number; right: number; bottom: number; left: number; unit?: string };
    };
}

export interface ColumnPreset {
    /** Short label shown in tooltip */
    label: string;
    /** Top-level columns in this preset */
    cols: PresetColumn[];
    /**
     * SVG string rendered as the preset thumbnail.
     * viewBox="0 0 90 44", rects use fill="currentColor".
     */
    icon: string;
    /**
     * Optional row schema overrides — merged on top of the default row schema
     * when this preset is used to create a new row.
     */
    rowSchema?: PresetRowSchema;
}

// ─── Presets ──────────────────────────────────────────────────────────────────

/** Shorthand helpers for common rowSchema values */
const ROW = (
    direction: "row" | "column",
    wrap: "nowrap" | "wrap",
    gap = 0
): PresetRowSchema => ({
    layout: {
        flex: { direction, justifyContent: "flex-start", alignItems: "stretch" },
        wrap,
        gap: { column: gap, row: gap, unit: "px" },
    },
});

export const COLUMN_PRESETS: ColumnPreset[] = [
    // ── Row 1 ────────────────────────────────────────────────────────────────

    // 01 — 1 col, column flex (stacks content vertically), no gap
    {
        label: "100",
        cols: [{ widths: { desktop: 100, tablet: 100, mobile: 100 } }],
        rowSchema: ROW("column", "nowrap", 0),
        icon: `<rect x="0" y="0" width="90" height="44" rx="2"/>`,
    },

    // 02 — 1 col, row flex (content flows horizontally), no gap
    {
        label: "100 →",
        cols: [{ widths: { desktop: 100, tablet: 100, mobile: 100 } }],
        rowSchema: ROW("row", "nowrap", 0),
        icon: `<rect x="0" y="0" width="90" height="44" rx="2"/>`,
    },

    // 03 — 50/50 desktop → 100/100 tablet/mobile
    {
        label: "50 / 50",
        cols: [
            { widths: { desktop: 50, tablet: 100, mobile: 100 } },
            { widths: { desktop: 50, tablet: 100, mobile: 100 } },
        ],
        rowSchema: ROW("row", "nowrap"),
        icon: `<rect x="0" y="0" width="44" height="44" rx="2"/><rect x="46" y="0" width="44" height="44" rx="2"/>`,
    },

    // 04 — 25/75 desktop → 100/100 tablet/mobile
    {
        label: "25 / 75",
        cols: [
            { widths: { desktop: 25, tablet: 100, mobile: 100 } },
            { widths: { desktop: 75, tablet: 100, mobile: 100 } },
        ],
        rowSchema: ROW("row", "nowrap"),
        icon: `<rect x="0" y="0" width="21" height="44" rx="2"/><rect x="23" y="0" width="67" height="44" rx="2"/>`,
    },

    // 05 — 25/25/25/25 desktop → 50/50 tablet/mobile
    {
        label: "25 × 4",
        cols: [
            { widths: { desktop: 25, tablet: 50, mobile: 50 } },
            { widths: { desktop: 25, tablet: 50, mobile: 50 } },
            { widths: { desktop: 25, tablet: 50, mobile: 50 } },
            { widths: { desktop: 25, tablet: 50, mobile: 50 } },
        ],
        rowSchema: ROW("row", "nowrap"),
        icon: `<rect x="0" y="0" width="20" height="44" rx="2"/><rect x="23" y="0" width="20" height="44" rx="2"/><rect x="46" y="0" width="20" height="44" rx="2"/><rect x="69" y="0" width="21" height="44" rx="2"/>`,
    },

    // 06 — 25/50/25 desktop → 50/50 tablet/mobile
    {
        label: "25 / 50 / 25",
        cols: [
            { widths: { desktop: 25, tablet: 50, mobile: 50 } },
            { widths: { desktop: 50, tablet: 100, mobile: 100 } },
            { widths: { desktop: 25, tablet: 50, mobile: 50 } },
        ],
        rowSchema: ROW("row", "nowrap"),
        icon: `<rect x="0" y="0" width="20" height="44" rx="2"/><rect x="23" y="0" width="44" height="44" rx="2"/><rect x="70" y="0" width="20" height="44" rx="2"/>`,
    },

    // ── Row 2 ────────────────────────────────────────────────────────────────

    // 07 — 4×25 wrap desktop → 50/50 tablet/mobile
    {
        label: "25 × 4 wrap",
        cols: [
            { widths: { desktop: 25, tablet: 50, mobile: 50 } },
            { widths: { desktop: 25, tablet: 50, mobile: 50 } },
            { widths: { desktop: 25, tablet: 50, mobile: 50 } },
            { widths: { desktop: 25, tablet: 50, mobile: 50 } },
        ],
        rowSchema: ROW("row", "wrap"),
        icon: `<rect x="0" y="0" width="44" height="21" rx="2"/><rect x="46" y="0" width="44" height="21" rx="2"/><rect x="0" y="23" width="44" height="21" rx="2"/><rect x="46" y="23" width="44" height="21" rx="2"/>`,
    },

    // 08 — 50/50/100 wrap desktop → 50/50 tablet/mobile
    {
        label: "50 / 50 / 100",
        cols: [
            { widths: { desktop: 50, tablet: 50, mobile: 50 } },
            { widths: { desktop: 50, tablet: 50, mobile: 50 } },
            { widths: { desktop: 100, tablet: 50, mobile: 100 } },
        ],
        rowSchema: ROW("row", "wrap"),
        icon: `<rect x="0" y="0" width="44" height="21" rx="2"/><rect x="46" y="0" width="44" height="21" rx="2"/><rect x="0" y="23" width="90" height="21" rx="2"/>`,
    },

    // 09 — 50 plain + 50 with 2 nested stacked sub-cols
    {
        label: "50 | 50[100+100]",
        cols: [
            { widths: { desktop: 50, tablet: 100, mobile: 100 } },
            {
                widths: { desktop: 50, tablet: 100, mobile: 100 },
                // Parent column stacks its children vertically
                columnSchema: {
                    layout: {
                        flex: { direction: "column", justifyContent: "", alignItems: "" },
                        wrap: "wrap",
                        gap: { column: 0, row: 0, unit: "px" },
                    },
                },
                children: [
                    { widths: { desktop: 100, tablet: 100, mobile: 100 } },
                    { widths: { desktop: 100, tablet: 100, mobile: 100 } },
                ],
            },
        ],
        rowSchema: ROW("row", "nowrap"),
        icon: `<rect x="0" y="0" width="44" height="44" rx="2"/><rect x="46" y="0" width="44" height="21" rx="2"/><rect x="46" y="23" width="44" height="21" rx="2"/>`,
    },

    // 10 — 6×16.66 wrap desktop → 50/50 tablet/mobile
    {
        label: "16 × 6",
        cols: [
            { widths: { desktop: 16.6667, tablet: 50, mobile: 50 } },
            { widths: { desktop: 16.6667, tablet: 50, mobile: 50 } },
            { widths: { desktop: 16.6667, tablet: 50, mobile: 50 } },
            { widths: { desktop: 16.6667, tablet: 50, mobile: 50 } },
            { widths: { desktop: 16.6667, tablet: 50, mobile: 50 } },
            { widths: { desktop: 16.6665, tablet: 50, mobile: 50 } },
        ],
        rowSchema: ROW("row", "wrap"),
        icon: `<rect x="0" y="0" width="27" height="21" rx="2"/><rect x="30" y="0" width="27" height="21" rx="2"/><rect x="60" y="0" width="30" height="21" rx="2"/><rect x="0" y="23" width="27" height="21" rx="2"/><rect x="30" y="23" width="27" height="21" rx="2"/><rect x="60" y="23" width="30" height="21" rx="2"/>`,
    },

    // 11 — 4×16.66 + 1×33.33 wrap desktop → 50/50 tablet/mobile
    {
        label: "16×4 + 33",
        cols: [
            { widths: { desktop: 16.6667, tablet: 50, mobile: 50 } },
            { widths: { desktop: 16.6667, tablet: 50, mobile: 50 } },
            { widths: { desktop: 16.6667, tablet: 50, mobile: 50 } },
            { widths: { desktop: 16.6667, tablet: 50, mobile: 50 } },
            { widths: { desktop: 33.3332, tablet: 50, mobile: 50 } },
        ],
        rowSchema: ROW("row", "wrap"),
        icon: `<rect x="0" y="0" width="18" height="21" rx="2"/><rect x="21" y="0" width="18" height="21" rx="2"/><rect x="42" y="0" width="18" height="21" rx="2"/><rect x="63" y="0" width="27" height="21" rx="2"/><rect x="0" y="23" width="90" height="21" rx="2"/>`,
    },

    // 12 — 34/66/34/66 wrap desktop → 50/50 tablet/mobile
    {
        label: "34 / 66 × 2",
        cols: [
            { widths: { desktop: 34, tablet: 50, mobile: 50 } },
            { widths: { desktop: 66, tablet: 50, mobile: 50 } },
            { widths: { desktop: 34, tablet: 50, mobile: 50 } },
            { widths: { desktop: 66, tablet: 50, mobile: 50 } },
        ],
        rowSchema: ROW("row", "wrap"),
        icon: `<rect x="0" y="0" width="28" height="21" rx="2"/><rect x="31" y="0" width="59" height="21" rx="2"/><rect x="0" y="23" width="28" height="21" rx="2"/><rect x="31" y="23" width="59" height="21" rx="2"/>`,
    },
];
