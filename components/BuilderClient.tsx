"use client";

import React, { useMemo, useRef, useCallback, useEffect, useState } from "react";
import { getElementDef } from "@/components/builder/helpers";
import "@/components/builder/elements/index";
import columnElement from "@/components/builder/elements/column";
import { controlToCSS, controlToHoverCSS } from "@/components/builder/controls/css";
import { getDeviceValue } from "@/components/builder/device";

/**
 * BuilderClient — front-end renderer for saved builder content.
 * Uses the same CSS registry as the editor — zero duplication.
 * Generates desktop CSS + @media queries for tablet/mobile overrides.
 * No loading state, no flicker — CSS is computed synchronously on first render.
 */

// Breakpoints
const TABLET_MAX = 1024;
const MOBILE_MAX = 767;

// ============================================================
// CSS GENERATION (same logic as CanvasStyles but for front-end)
// ============================================================

function generateRowCSS(row: any, device: "desktop" | "tablet" | "mobile" = "desktop"): string {
    const s = row.schema;
    if (!s) return "";

    const cls = `brow-${row.id}`;
    const innerCls = `brow-${row.id}-inner`;

    // --- OUTER --- (no overflow:hidden — it clips box-shadow)
    const outer: string[] = ["width:100%", "position:relative"];

    const bg = controlToCSS("background", getDeviceValue(s.style?.background, device), s);
    if (bg) outer.push(bg);

    const border = controlToCSS("border", getDeviceValue(s.style?.border, device), s);
    if (border) outer.push(border);

    const margin = controlToCSS("margin", getDeviceValue(s.advanced?.margin, device), s);
    if (margin) outer.push(margin);

    // boxShadow is nested inside border.boxShadow
    const borderVal = getDeviceValue(s.style?.border, device);
    const shadow = controlToCSS("boxShadow", borderVal?.boxShadow, s);
    if (shadow) outer.push(shadow);

    let css = `.${cls}{${outer.join(";")}}`;

    // Hover on outer
    const hoverParts: string[] = [];
    const bgHover = controlToHoverCSS("background", getDeviceValue(s.style?.background, device), s);
    if (bgHover) hoverParts.push(bgHover);
    const borderHover = controlToHoverCSS("border", getDeviceValue(s.style?.border, device), s);
    if (borderHover) hoverParts.push(borderHover);
    const shadowHover = controlToHoverCSS("boxShadow", borderVal?.boxShadow, s);
    if (shadowHover) hoverParts.push(shadowHover);
    if (hoverParts.length) css += `.${cls}:hover{${hoverParts.join(";")}}`;

    // --- INNER --- (overflow:hidden here — clips background/content, not shadow)
    const inner: string[] = ["display:flex", "width:100%", "margin-left:auto", "margin-right:auto", "overflow:hidden", "position:relative"];

    const contentWidth = getDeviceValue(s.layout?.contentWidth, device);
    if (contentWidth === "boxed") {
        const w = getDeviceValue(s.layout?.width, device);
        if (!w) inner.push("max-width:1200px");
        else if (typeof w === "number") inner.push(`max-width:${w}px`);
        else inner.push(`max-width:${w.value}${w.unit || "px"}`);
    } else {
        inner.push("max-width:100%");
    }

    const flex = controlToCSS("flex", getDeviceValue(s.layout?.flex, device), s);
    if (flex) inner.push(flex);

    const gap = controlToCSS("gap", getDeviceValue(s.layout?.gap, device), s);
    if (gap) inner.push(gap);

    const wrap = controlToCSS("wrap", getDeviceValue(s.layout?.wrap, device), s);
    if (wrap) inner.push(wrap);

    const minH = controlToCSS("minHeight", getDeviceValue(s.layout?.minHeight, device), s);
    if (minH) inner.push(minH);

    const padding = controlToCSS("padding", getDeviceValue(s.advanced?.padding, device), s);
    if (padding) inner.push(padding);

    const align = controlToCSS("alignSelf", getDeviceValue(s.advanced?.alignSelf, device), s);
    if (align) inner.push(align);

    css += `.${innerCls}{${inner.join(";")}}`;

    return css;
}

function generateColumnCSS(col: any, device: "desktop" | "tablet" | "mobile" = "desktop"): string {
    const schema = col.schema;
    if (!schema) return "";

    const cls = `bcol-${col.id}`;

    const lines: string[] = [
        "display:flex",
        "width:100%",
        "min-width:0",
        "box-sizing:border-box",
    ];

    // Nested sub-columns: read the column's own flex/wrap schema, fall back to row+wrap
    const hasNestedCols = col.columns && col.columns.length > 0;
    if (hasNestedCols) {
        const storedFlex = getDeviceValue(schema.layout?.flex, device);
        const storedWrap = getDeviceValue(schema.layout?.wrap, device);
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
                const group = schema[groupKey];
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
    const borderVal = getDeviceValue(schema.style?.border, device);
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

function generateElementCSS(element: any, device: "desktop" | "tablet" | "mobile" = "desktop"): string {
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

function collectAllCSS(content: any[]): string {
    const parts: string[] = [];
    const tabletParts: string[] = [];
    const mobileParts: string[] = [];

    function walkCarouselSlidesForCSS(el: any, device: "desktop" | "tablet" | "mobile", target: string[]) {
        if (el.type === "carousel" && el.schema?.content?.slides) {
            for (const slide of el.schema.content.slides) {
                for (const childEl of slide.elements ?? []) {
                    const childCSS = generateElementCSSForDevice(childEl, device);
                    if (childCSS) target.push(childCSS);
                }
            }
        }
    }

    for (const row of content) {
        parts.push(generateRowCSSForDevice(row, "desktop"));

        const walkCols = (cols: any[]) => {
            if (!cols) return;
            for (const col of cols) {
                parts.push(generateColumnCSSForDevice(col, "desktop"));
                if (col.elements) {
                    for (const el of col.elements) {
                        const elCSS = generateElementCSSForDevice(el, "desktop");
                        if (elCSS) parts.push(elCSS);
                        walkCarouselSlidesForCSS(el, "desktop", parts);
                    }
                }
                if (col.columns?.length > 0) walkCols(col.columns);
            }
        };
        walkCols(row.columns);

        // Tablet overrides
        const tabletRow = generateRowCSSForDevice(row, "tablet");
        if (tabletRow) tabletParts.push(tabletRow);

        const walkColsTablet = (cols: any[]) => {
            if (!cols) return;
            for (const col of cols) {
                const colCSS = generateColumnCSSForDevice(col, "tablet");
                if (colCSS) tabletParts.push(colCSS);
                if (col.elements) {
                    for (const el of col.elements) {
                        const elCSS = generateElementCSSForDevice(el, "tablet");
                        if (elCSS) tabletParts.push(elCSS);
                        walkCarouselSlidesForCSS(el, "tablet", tabletParts);
                    }
                }
                if (col.columns?.length > 0) walkColsTablet(col.columns);
            }
        };
        walkColsTablet(row.columns);

        // Mobile overrides
        const mobileRow = generateRowCSSForDevice(row, "mobile");
        if (mobileRow) mobileParts.push(mobileRow);

        const walkColsMobile = (cols: any[]) => {
            if (!cols) return;
            for (const col of cols) {
                const colCSS = generateColumnCSSForDevice(col, "mobile");
                if (colCSS) mobileParts.push(colCSS);
                if (col.elements) {
                    for (const el of col.elements) {
                        const elCSS = generateElementCSSForDevice(el, "mobile");
                        if (elCSS) mobileParts.push(elCSS);
                        walkCarouselSlidesForCSS(el, "mobile", mobileParts);
                    }
                }
                if (col.columns?.length > 0) walkColsMobile(col.columns);
            }
        };
        walkColsMobile(row.columns);
    }

    let css = parts.join("\n");
    if (tabletParts.length) css += `\n@media(max-width:${TABLET_MAX}px){${tabletParts.join("\n")}}`;
    if (mobileParts.length) css += `\n@media(max-width:${MOBILE_MAX}px){${mobileParts.join("\n")}}`;

    return css;
}

// Device-specific generators (reuse the same logic but resolve per device)
function generateRowCSSForDevice(row: any, device: "desktop" | "tablet" | "mobile"): string {
    return generateRowCSS(row, device);
}
function generateColumnCSSForDevice(col: any, device: "desktop" | "tablet" | "mobile"): string {
    return generateColumnCSS(col, device);
}
function generateElementCSSForDevice(element: any, device: "desktop" | "tablet" | "mobile"): string {
    return generateElementCSS(element, device);
}

// ============================================================
// RENDER COMPONENTS
// ============================================================

// ============================================================
// RENDER COMPONENTS
// ============================================================

function RenderElement({ element, serverElements }: { element: any; serverElements: Record<string, React.ReactNode> }) {
    // Server-rendered element — node already built by Builder.tsx
    if (serverElements[element.id] !== undefined) {
        return (
            <div className={`bel-${element.id}`}>
                {serverElements[element.id]}
            </div>
        );
    }

    const def = getElementDef(element.type);
    if (!def || !def.render) return null;

    return (
        <div className={`bel-${element.id}`}>
            {def.render(element)}
        </div>
    );
}

function RenderColumn({ column, device = "desktop", serverElements }: {
    column: any;
    device?: "desktop" | "tablet" | "mobile";
    serverElements: Record<string, React.ReactNode>;
}) {
    const w = column.widths
        ? (device === "mobile" && column.widths.mobile !== undefined ? column.widths.mobile
            : device === "tablet" && column.widths.tablet !== undefined ? column.widths.tablet
                : column.widths.desktop)
        : column.width;
    return (
        <div style={{ flex: "0 0 auto", width: `${w}%`, maxWidth: `${w}%`, minWidth: 0, boxSizing: "border-box" }}>
            <div className={`bcol-${column.id}`}>
                {/* Structure: columns[columns[], elements[]] — both can coexist, nest unlimited */}
                {column.columns?.map((nested: any) => (
                    <RenderColumn key={nested.id} column={nested} device={device} serverElements={serverElements} />
                ))}
                {column.elements?.map((el: any) => (
                    <RenderElement key={el.id} element={el} serverElements={serverElements} />
                ))}
            </div>
        </div>
    );
}

function RenderRow({ row, serverElements }: { row: any; serverElements: Record<string, React.ReactNode> }) {
    const s = row.schema;
    const overlay = s?.style?.backgroundOverlay;
    const overlayNormal = overlay?.normal || overlay;
    const overlayEnabled = overlay?.enabled;

    return (
        <section className={`brow-${row.id}`}>
            {overlayEnabled && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background: overlayNormal?.color || "rgba(0,0,0,0.5)",
                        opacity: overlayNormal?.opacity ?? 0.5,
                        pointerEvents: "none",
                    }}
                />
            )}
            <div className={`brow-${row.id}-inner`}>
                {row.columns?.map((col: any) => (
                    <RenderColumn key={col.id} column={col} serverElements={serverElements} />
                ))}
            </div>
            {s?.style?.shapeDivider?.enabled && (
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        [s.style.shapeDivider.position || "bottom"]: 0,
                        height: "60px",
                        background: "linear-gradient(to right, transparent, #000, transparent)",
                    }}
                />
            )}
        </section>
    );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

interface Props {
    content: any[];
    /** Pre-rendered server nodes keyed by element id, provided by Builder.tsx */
    serverElements?: Record<string, React.ReactNode>;
}

export default function BuilderClient({ content, serverElements = {} }: Props) {
    const css = useMemo(() => collectAllCSS(content), [content]);

    if (!content || !Array.isArray(content) || content.length === 0) return null;

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: css }} />
            {content.map((row: any) => (
                <RenderRow key={row.id} row={row} serverElements={serverElements} />
            ))}
        </>
    );
}
