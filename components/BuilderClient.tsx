"use client";

import React, { useMemo, useRef, useCallback, useEffect, useState, useId } from "react";
import { getElementDef } from "@/components/builder/helpers";
import "@/components/builder/elements/index";
import columnElement from "@/components/builder/elements/column";
import { controlToCSS, controlToHoverCSS, ANIMATION_KEYFRAMES } from "@/components/builder/controls/css";
import { getDeviceValue, getColumnWidth } from "@/components/builder/device";
import { commonAdvancedControls, mergeControls } from "@/components/builder/controls/common";
import { SHAPES } from "@/components/builder/controls/ShapeDivider";
import { useActivePluginsCtx } from "@/context/ActivePluginsContext";

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

    // --- INNER --- (overflow:visible here — does not clip dropdowns / shadow)
    const inner: string[] = ["display:flex", "width:100%", "margin-left:auto", "margin-right:auto", "overflow:visible", "position:relative"];

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

    // Process all commonAdvancedControls for Row outer
    for (const section of commonAdvancedControls) {
        for (const ctrl of section.controls) {
            if (ctrl.name === "margin" || ctrl.name === "padding" || ctrl.name === "alignSelf" || ctrl.name === "customCSS") continue;

            let value: any = undefined;
            if (s.advanced && ctrl.name in s.advanced) {
                value = getDeviceValue(s.advanced[ctrl.name], device);
            }
            if (value === undefined) continue;

            const cssStr = controlToCSS(ctrl.name, value, { ...s, _device: device });
            if (cssStr) outer.push(cssStr);

            const hover = controlToHoverCSS(ctrl.name, value, { ...s, _device: device });
            if (hover) hoverParts.push(hover);
        }
    }

    // Refresh outer CSS with new properties
    css = `.${cls}{${outer.join(";")}}`;
    if (hoverParts.length) css += `\n.${cls}:hover{${hoverParts.join(";")}}`;
    css += `\n.${innerCls}{${inner.join(";")}}`;

    if (s.advanced?.customCSS) {
        const rawCSS = s.advanced.customCSS;
        const processedCSS = rawCSS.replaceAll("selector", `.${cls}`);
        css += `\n${processedCSS}`;
    }

    return css;
}

function generateColumnCSS(col: any, device: "desktop" | "tablet" | "mobile" = "desktop"): string {
    const schema = col.schema;
    if (!schema) return "";

    const cls = `bcol-${col.id}`;
    const wrapCls = `bcol-wrap-${col.id}`;
    const w = getColumnWidth(col, device);

    const wrapLines = [
        "flex:0 0 auto",
        `width:${w}%`,
        `max-width:${w}%`,
        "min-width:0",
        "box-sizing:border-box",
    ];

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

    const allControls = mergeControls(columnElement.controls);

    for (const section of allControls) {
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

            const css = controlToCSS(ctrl.name, value, { ...schema, _device: device });
            if (css) lines.push(css);

            const hover = controlToHoverCSS(ctrl.name, value, { ...schema, _device: device });
            if (hover) hoverLines.push(hover);
        }
    }

    // boxShadow is nested inside border.boxShadow — emit it separately
    const borderVal = getDeviceValue(schema.style?.border, device);
    if (borderVal?.boxShadow) {
        const shadowCSS = controlToCSS("boxShadow", borderVal.boxShadow, { ...schema, _device: device });
        if (shadowCSS) lines.push(shadowCSS);
        const shadowHover = controlToHoverCSS("boxShadow", borderVal.boxShadow, { ...schema, _device: device });
        if (shadowHover) hoverLines.push(shadowHover);
    }

    let css = `.${wrapCls}{${wrapLines.join(";")}} .${cls}{${lines.join(";")}}`;
    if (hoverLines.length) css += `\n.${cls}:hover{${hoverLines.join(";")}}`;

    if (schema.advanced?.customCSS) {
        const rawCSS = schema.advanced.customCSS;
        const processedCSS = rawCSS.replaceAll("selector", `.${cls}`);
        css += `\n${processedCSS}`;
    }

    return css;
}

function generateElementCSS(element: any, device: "desktop" | "tablet" | "mobile" = "desktop"): string {
    const def = getElementDef(element.type);
    if (!def) return "";

    const cls = `bel-${element.id}`;
    const schema = element.schema;
    const lines: string[] = [];
    const hoverLines: string[] = [];

    const allControls = mergeControls(def.controls);

    for (const section of allControls) {
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

            const css = controlToCSS(ctrl.name, value, { ...schema, _device: device });
            if (css) lines.push(css);

            const hover = controlToHoverCSS(ctrl.name, value, { ...schema, _device: device });
            if (hover) hoverLines.push(hover);
        }
    }

    let css = `.${cls}{${lines.join(";")}}`;
    if (hoverLines.length) css += `.${cls}:hover{${hoverLines.join(";")}}`;
    if (schema.style?.hoverColor) {
        css += `.${cls}:hover{color:${schema.style.hoverColor};transition:color 0.3s}`;
    }

    if (schema.advanced?.customCSS) {
        const rawCSS = schema.advanced.customCSS;
        const processedCSS = rawCSS.replaceAll("selector", `.${cls}`);
        css += `\n${processedCSS}`;
    }

    return css;
}

function collectAllCSS(content: any[]): string {
    if (!content || !Array.isArray(content)) return "";
    const parts: string[] = [];
    const tabletParts: string[] = [];
    const mobileParts: string[] = [];

    function walkCarouselSlidesForCSS(el: any, device: "desktop" | "tablet" | "mobile", target: string[]) {
        if (el && el.type === "carousel" && el.schema?.content?.slides) {
            for (const slide of el.schema.content.slides) {
                if (slide && slide.elements) {
                    for (const childEl of slide.elements ?? []) {
                        if (childEl) {
                            const childCSS = generateElementCSSForDevice(childEl, device);
                            if (childCSS) target.push(childCSS);
                        }
                    }
                }
            }
        }
    }

    for (const row of content) {
        if (!row) continue;
        parts.push(generateRowCSSForDevice(row, "desktop"));

        const walkCols = (cols: any[]) => {
            if (!cols) return;
            for (const col of cols) {
                if (!col) continue;
                parts.push(generateColumnCSSForDevice(col, "desktop"));
                if (col.elements) {
                    for (const el of col.elements) {
                        if (!el) continue;
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
                if (!col) continue;
                const colCSS = generateColumnCSSForDevice(col, "tablet");
                if (colCSS) tabletParts.push(colCSS);
                if (col.elements) {
                    for (const el of col.elements) {
                        if (!el) continue;
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
                if (!col) continue;
                const colCSS = generateColumnCSSForDevice(col, "mobile");
                if (colCSS) mobileParts.push(colCSS);
                if (col.elements) {
                    for (const el of col.elements) {
                        if (!el) continue;
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

    let css = ANIMATION_KEYFRAMES + "\n" + parts.join("\n");
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

function shouldDisplay(schema: any): boolean {
    const cond = schema?.advanced?.displayConditions;
    if (!cond || cond.type === "always" || !cond.type) return true;

    if (cond.type === "query") {
        if (typeof window === "undefined") return true;
        const urlParams = new URLSearchParams(window.location.search);
        const hasKey = urlParams.has(cond.key);
        if (!hasKey) return false;
        if (cond.val && urlParams.get(cond.key) !== cond.val) return false;
        return true;
    }

    if (cond.type === "loggedin") {
        if (typeof window === "undefined") return true;
        const hasSession = document.cookie.includes("session") || document.cookie.includes("token") || localStorage.getItem("user") !== null;
        return !!hasSession;
    }

    if (cond.type === "loggedout") {
        if (typeof window === "undefined") return true;
        const hasSession = document.cookie.includes("session") || document.cookie.includes("token") || localStorage.getItem("user") !== null;
        return !hasSession;
    }

    return true;
}

function RenderElement({ element, serverElements }: { element: any; serverElements: Record<string, React.ReactNode> }) {
    if (!element || !shouldDisplay(element.schema)) return null;
    const adv = element.schema?.advanced;
    const idAttr = adv?.cssID || undefined;
    const classAttr = adv?.cssClasses ? ` ${adv.cssClasses}` : "";

    // Server-rendered element — node already built by Builder.tsx
    if (serverElements[element.id] !== undefined) {
        return (
            <div id={idAttr} className={`bel-${element.id}${classAttr}`}>
                {serverElements[element.id]}
            </div>
        );
    }

    const def = getElementDef(element.type);
    if (!def || !def.render) return null;

    return (
        <div id={idAttr} className={`bel-${element.id}${classAttr}`}>
            {def.render(element)}
        </div>
    );
}

function RenderColumn({ column, serverElements }: {
    column: any;
    serverElements: Record<string, React.ReactNode>;
}) {
    if (!column || !shouldDisplay(column.schema)) return null;
    const adv = column.schema?.advanced;
    const idAttr = adv?.cssID || undefined;
    const classAttr = adv?.cssClasses ? ` ${adv.cssClasses}` : "";

    return (
        <div id={idAttr} className={`bcol-wrap-${column.id}${classAttr}`}>
            <div className={`bcol-${column.id}`}>
                {/* Structure: columns[columns[], elements[]] — both can coexist, nest unlimited */}
                {column.columns?.map((nested: any) => (
                    <RenderColumn key={nested.id} column={nested} serverElements={serverElements} />
                ))}
                {column.elements?.map((el: any) => (
                    <RenderElement key={el.id} element={el} serverElements={serverElements} />
                ))}
            </div>
        </div>
    );
}

function RenderRow({ row, serverElements }: { row: any; serverElements: Record<string, React.ReactNode> }) {
    if (!row || !shouldDisplay(row.schema)) return null;
    const s = row.schema;
    const adv = s?.advanced;
    const idAttr = adv?.cssID || undefined;
    const classAttr = adv?.cssClasses ? ` ${adv.cssClasses}` : "";
    const overlay = s?.style?.backgroundOverlay;
    const overlayNormal = overlay?.normal || overlay;
    const overlayEnabled = overlay?.enabled;

    return (
        <section id={idAttr} className={`brow-${row.id}${classAttr}`}>
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
            {/* Shape Divider */}
            <RenderShapeDivider divider={s?.style?.shapeDivider} />
        </section>
    );
}

function RenderShapeDivider({ divider }: { divider: any }) {
    if (!divider || !divider.enabled) return null;
    const shapeKey = divider.shape || "wave";
    const shape = SHAPES[shapeKey];
    if (!shape) return null;

    const pos = divider.position || "bottom";
    const height = divider.height ?? 100;
    const width = divider.width ?? 100;
    
    let scaleX = divider.flip ? -1 : 1;
    let scaleY = divider.invert ? -1 : 1;
    if (pos === "top") scaleY *= -1;

    const gradId = useId().replace(/:/g, "-");
    const isGradient = divider.colorType === "gradient";
    const fill = isGradient ? `url(#${gradId})` : (divider.color || "#ffffff");

    // CSS angle to SVG linearGradient coords mapping
    let gradCoords = { x1: "0%", y1: "0%", x2: "0%", y2: "100%" };
    if (isGradient && divider.gradient) {
        const angle = divider.gradient.angle ?? 180;
        const dx = Math.sin((angle * Math.PI) / 180);
        const dy = -Math.cos((angle * Math.PI) / 180);
        gradCoords = {
            x1: `${Math.round(50 - dx * 50)}%`,
            y1: `${Math.round(50 - dy * 50)}%`,
            x2: `${Math.round(50 + dx * 50)}%`,
            y2: `${Math.round(50 + dy * 50)}%`,
        };
    }

    return (
        <div
            style={{
                position: "absolute",
                left: 0,
                right: 0,
                [pos]: 0,
                height: `${height}px`,
                overflow: "hidden",
                lineHeight: 0,
                zIndex: divider.bringToFront ? 10 : 0,
                pointerEvents: "none",
                transform: "translate3d(0,0,0)",
                opacity: divider.opacity ?? 1,
            }}
        >
            <svg
                viewBox={shape.viewBox}
                preserveAspectRatio="none"
                style={{
                    width: `${width}%`,
                    height: "100%",
                    display: "block",
                    position: "relative",
                    left: "50%",
                    transform: `translateX(-50%) scale(${scaleX}, ${scaleY})`,
                }}
            >
                {isGradient && divider.gradient && (
                    <defs>
                        <linearGradient
                            id={gradId}
                            x1={gradCoords.x1}
                            y1={gradCoords.y1}
                            x2={gradCoords.x2}
                            y2={gradCoords.y2}
                        >
                            <stop offset={`${divider.gradient.location1 ?? 0}%`} stopColor={divider.gradient.color1 || "#ffffff"} />
                            <stop offset={`${divider.gradient.location2 ?? 100}%`} stopColor={divider.gradient.color2 || "#f5f5f5"} />
                        </linearGradient>
                    </defs>
                )}
                <path d={shape.path} fill={fill} />
            </svg>
        </div>
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
    // Re-render once active plugins are loaded so plugin elements (registered
    // inside reregisterHooks) are available to getElementDef at render time.
    const activePlugins = useActivePluginsCtx();

    const css = useMemo(() => collectAllCSS(content), [content, activePlugins]);

    if (!content || !Array.isArray(content) || content.length === 0) return null;

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: css }} />
            {content.map((row: any) => {
                if (!row) return null;
                return <RenderRow key={row.id} row={row} serverElements={serverElements} />;
            })}
        </>
    );
}
