"use client";

import { useMemo } from "react";
import { Row, Column, BuilderElement, Device } from "../types";
import { getElementDef } from "../helpers";
import columnElement from "../elements/column";
import { controlToCSS, controlToHoverCSS } from "../controls/css";
import { getDeviceValue, getColumnWidth } from "../device";

/**
 * Unified DYNAMIC CSS generation for all builder entities.
 *
 * Device-aware: in the editor, shows CSS for the active device.
 * Values with `_tablet` or `_mobile` overrides are resolved per device.
 * If no override exists, desktop (base) value is used.
 */

// ============================================================
// ROW CSS
// ============================================================

function generateRowCSS(row: Row, device: Device): string {
    const s = row.schema;
    const cls = `brow-${row.id}`;
    const innerCls = `brow-${row.id}-inner`;

    // --- OUTER --- (no overflow:hidden here — it clips box-shadow)
    const outer: string[] = ["width:100%", "position:relative"];

    const bg = controlToCSS("background", getDeviceValue(s.style.background, device), s);
    if (bg) outer.push(bg);

    const border = controlToCSS("border", getDeviceValue(s.style.border, device), s);
    if (border) outer.push(border);

    const margin = controlToCSS("margin", getDeviceValue(s.advanced.margin, device), s);
    if (margin) outer.push(margin);

    // boxShadow is now nested inside border.boxShadow
    const borderVal = getDeviceValue(s.style.border, device);
    const shadow = controlToCSS("boxShadow", borderVal?.boxShadow, s);
    if (shadow) outer.push(shadow);

    let css = `.${cls}{${outer.join(";")}}`;

    // Hover
    const hoverParts: string[] = [];
    const bgHover = controlToHoverCSS("background", getDeviceValue(s.style.background, device), s);
    if (bgHover) hoverParts.push(bgHover);
    const borderHover = controlToHoverCSS("border", getDeviceValue(s.style.border, device), s);
    if (borderHover) hoverParts.push(borderHover);
    const shadowHover = controlToHoverCSS("boxShadow", borderVal?.boxShadow, s);
    if (shadowHover) hoverParts.push(shadowHover);
    if (hoverParts.length) css += `.${cls}:hover{${hoverParts.join(";")}}`;

    // --- INNER ---
    const inner: string[] = ["display:flex", "width:100%", "margin-left:auto", "margin-right:auto", "overflow:hidden", "position:relative"];

    const contentWidth = getDeviceValue(s.layout.contentWidth, device);
    if (contentWidth === "boxed") {
        const w = getDeviceValue(s.layout.width, device);
        if (!w) inner.push("max-width:1200px");
        else if (typeof w === "number") inner.push(`max-width:${w}px`);
        else inner.push(`max-width:${w.value}${w.unit || "px"}`);
    } else {
        inner.push("max-width:100%");
    }

    const flex = controlToCSS("flex", getDeviceValue(s.layout.flex, device), s);
    if (flex) inner.push(flex);

    const gap = controlToCSS("gap", getDeviceValue(s.layout.gap, device), s);
    if (gap) inner.push(gap);

    const wrap = controlToCSS("wrap", getDeviceValue(s.layout.wrap, device), s);
    if (wrap) inner.push(wrap);

    const minH = controlToCSS("minHeight", getDeviceValue(s.layout.minHeight, device), s);
    if (minH) inner.push(minH);

    const padding = controlToCSS("padding", getDeviceValue(s.advanced.padding, device), s);
    if (padding) inner.push(padding);

    const align = controlToCSS("alignSelf", getDeviceValue(s.advanced.alignSelf, device), s);
    if (align) inner.push(align);

    css += `.${innerCls}{${inner.join(";")}}`;

    return css;
}

// ============================================================
// COLUMN CSS
// ============================================================

function generateColumnCSS(col: Column, device: Device): string {
    const cls = `bcol-${col.id}`;
    const schema = col.schema;
    const hasNestedCols = col.columns && col.columns.length > 0;

    const lines: string[] = [
        "display:flex",
        "width:100%",
        "min-width:0",
        "box-sizing:border-box",
    ];

    // For nested containers, read the column's own flex/wrap schema.
    // Fall back to row+wrap only when no explicit direction is stored.
    if (hasNestedCols) {
        const storedFlex = getDeviceValue((schema as any).layout?.flex, device);
        const storedWrap = getDeviceValue((schema as any).layout?.wrap, device);
        const direction = storedFlex?.direction || "row";
        const wrap = storedWrap || "wrap";
        lines.push(
            `flex-direction:${direction}`,
            `flex-wrap:${wrap}`,
            "align-content:flex-start",
        );
    }

    const hoverLines: string[] = [];

    for (const section of columnElement.controls) {
        for (const ctrl of section.controls) {
            let value: any = undefined;
            for (const groupKey of Object.keys(schema)) {
                const group = (schema as any)[groupKey];
                if (typeof group === "object" && group !== null && ctrl.name in group) {
                    value = getDeviceValue(group[ctrl.name], device);
                    break;
                }
            }
            if (value === undefined) continue;

            // Skip flex and wrap for nested containers — already handled above
            if (hasNestedCols && (ctrl.name === "flex" || ctrl.name === "wrap")) continue;

            const css = controlToCSS(ctrl.name, value, schema);
            if (css) lines.push(css);

            const hover = controlToHoverCSS(ctrl.name, value, schema);
            if (hover) hoverLines.push(hover);
        }
    }

    // boxShadow is nested inside border.boxShadow — emit it separately
    const borderVal = getDeviceValue((schema as any).style?.border, device);
    if (borderVal?.boxShadow) {
        const shadowCSS = controlToCSS("boxShadow", borderVal.boxShadow, schema);
        if (shadowCSS) lines.push(shadowCSS);
        const shadowHover = controlToHoverCSS("boxShadow", borderVal.boxShadow, schema);
        if (shadowHover) hoverLines.push(shadowHover);
    }

    let css = `.${cls}{${lines.join(";")}}`;
    if (hoverLines.length) css += `.${cls}:hover{${hoverLines.join(";")}}`;
    return css;
}

// ============================================================
// ELEMENT CSS
// ============================================================

function generateElementCSS(element: BuilderElement, device: Device): string {
    const def = getElementDef(element.type);
    if (!def) return "";

    const cls = `bel-${element.id}`;
    const schema = element.schema;
    const lines: string[] = [];
    const hoverLines: string[] = [];

    for (const section of def.controls) {
        for (const ctrl of section.controls) {
            let value: any = undefined;
            for (const groupKey of Object.keys(schema)) {
                const group = schema[groupKey];
                if (typeof group === "object" && group !== null && ctrl.name in group) {
                    value = getDeviceValue(group[ctrl.name], device);
                    break;
                }
            }
            if (value === undefined) continue;

            const css = controlToCSS(ctrl.name, value, schema);
            if (css) lines.push(css);

            const hover = controlToHoverCSS(ctrl.name, value, schema);
            if (hover) hoverLines.push(hover);
        }
    }

    if (lines.length === 0 && hoverLines.length === 0) return "";

    let css = `.${cls}{${lines.join(";")}}`;
    if (hoverLines.length) css += `.${cls}:hover{${hoverLines.join(";")}}`;
    if (schema.style?.hoverColor) {
        css += `.${cls}:hover{color:${schema.style.hoverColor};transition:color 0.3s}`;
    }
    return css;
}

// ============================================================
// COLLECT HELPERS
// ============================================================

function collectColumns(columns: Column[]): Column[] {
    const result: Column[] = [];
    const walk = (cols: Column[]) => {
        for (const col of cols) {
            result.push(col);
            if (col.columns.length > 0) walk(col.columns);
        }
    };
    walk(columns);
    return result;
}

function collectElements(columns: Column[]): BuilderElement[] {
    const result: BuilderElement[] = [];
    const walk = (cols: Column[]) => {
        for (const col of cols) {
            for (const el of col.elements) result.push(el);
            if (col.columns.length > 0) walk(col.columns);
        }
    };
    walk(columns);
    return result;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

interface Props {
    rows: Row[];
    device: Device;
}

export default function CanvasStyles({ rows, device }: Props) {
    const css = useMemo(() => {
        const parts: string[] = [];

        for (const row of rows) {
            parts.push(generateRowCSS(row, device));

            const cols = collectColumns(row.columns);
            for (const col of cols) parts.push(generateColumnCSS(col, device));

            const elements = collectElements(row.columns);
            for (const el of elements) {
                const elCSS = generateElementCSS(el, device);
                if (elCSS) parts.push(elCSS);
            }
        }

        return parts.join("\n");
    }, [rows, device]);

    return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
