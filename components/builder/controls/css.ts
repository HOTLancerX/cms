/**
 * CSS Registry — maps control names to CSS generation functions.
 *
 * HOW IT WORKS:
 * 1. Each control (Padding, Margin, Flex, etc.) registers a `toCSS` function here.
 * 2. `CanvasStyles.tsx` iterates over an element definition's controls array.
 * 3. For each control, it finds the value in the schema and calls `cssRegistry[name](value, schema)`.
 * 4. The returned CSS properties are merged into the final class.
 *
 * TO ADD A NEW CONTROLLER:
 * - Create your control component (e.g. `controls/MyControl.tsx`)
 * - Add an entry to `cssRegistry` below with the same `name` used in element definitions
 * - That's it. It will automatically apply to rows, columns, and elements wherever the control is used.
 *
 * The `schema` parameter gives access to the full entity schema for cross-field logic
 * (e.g. contentWidth affects whether width is applied).
 */

export type CSSGeneratorFn = (value: any, schema?: any) => string;

// ============================================================
// HELPERS
// ============================================================

/**
 * Resolve a single border side object (normal or hover) to CSS string.
 * Handles both legacy flat format and new { type, width, color, radius } format.
 */
function resolveBorderSide(side: any, transition?: number): string {
    if (!side) return "";
    const type = side.type ?? side.style ?? "";
    // "" (Default) = inherit browser default — emit nothing
    // "none" = explicitly remove border
    if (type === "") return "";
    if (type === "none") return "border: none;";

    const parts: string[] = [];

    // Width — new format: { top, right, bottom, left, unit } or legacy number
    const rawWidth = side.width;
    if (rawWidth && typeof rawWidth === "object") {
        const u = rawWidth.unit || "px";
        const t = rawWidth.top || 0;
        const r = rawWidth.right || 0;
        const b = rawWidth.bottom || 0;
        const l = rawWidth.left || 0;
        const color = side.color || "#000000";
        // If all sides equal, use shorthand; otherwise use border-width + border-style + border-color
        if (t === r && r === b && b === l) {
            if (t > 0) parts.push(`border: ${t}${u} ${type} ${color};`);
        } else {
            parts.push(`border-style: ${type};`);
            parts.push(`border-color: ${color};`);
            parts.push(`border-width: ${t}${u} ${r}${u} ${b}${u} ${l}${u};`);
        }
    } else {
        // Legacy flat width (number)
        const width = typeof rawWidth === "number" ? rawWidth : 1;
        const color = side.color || "#000000";
        parts.push(`border: ${width}px ${type} ${color};`);
    }

    // Border radius — new format: { top, right, bottom, left, unit }
    const r = side.radius;
    if (r && typeof r === "object") {
        const u = r.unit || "px";
        const top = r.top || 0;
        const right = r.right || 0;
        const bottom = r.bottom || 0;
        const left = r.left || 0;
        if (top || right || bottom || left) {
            parts.push(`border-radius: ${top}${u} ${right}${u} ${bottom}${u} ${left}${u};`);
        }
    } else if (typeof r === "number" && r > 0) {
        // Legacy flat radius
        parts.push(`border-radius: ${r}px;`);
    }

    if (transition && transition > 0) {
        parts.push(`transition: border ${transition}ms ease, border-radius ${transition}ms ease;`);
    }

    return parts.join(" ");
}

function resolveSpacing(obj: any): string {
    if (!obj || typeof obj !== "object") return "";
    const u = obj.unit || "px";
    // "auto" shorthand — only valid when all sides are intentionally auto
    if (u === "auto") {
        const top = obj.top === "" || obj.top === undefined ? 0 : obj.top;
        const right = obj.right === "" || obj.right === undefined ? 0 : obj.right;
        const bottom = obj.bottom === "" || obj.bottom === undefined ? 0 : obj.bottom;
        const left = obj.left === "" || obj.left === undefined ? 0 : obj.left;
        // Only emit "auto" when all sides are truly empty/zero
        if (top === 0 && right === 0 && bottom === 0 && left === 0) return "auto";
        // Mixed numeric + auto unit is not valid CSS — fall back to px
        return `${top}px ${right}px ${bottom}px ${left}px`;
    }
    const top = obj.top === "" || obj.top === undefined ? 0 : obj.top;
    const right = obj.right === "" || obj.right === undefined ? 0 : obj.right;
    const bottom = obj.bottom === "" || obj.bottom === undefined ? 0 : obj.bottom;
    const left = obj.left === "" || obj.left === undefined ? 0 : obj.left;
    // Skip output when all sides are 0 (default state — avoids redundant CSS)
    if (top === 0 && right === 0 && bottom === 0 && left === 0) return "";
    return `${top}${u} ${right}${u} ${bottom}${u} ${left}${u}`;
}

// ============================================================
// REGISTRY
// ============================================================

export const cssRegistry: Record<string, CSSGeneratorFn> = {
    // --- LAYOUT ---

    contentWidth: () => "",
    width: () => "",

    minHeight: (value) => {
        if (!value) return "";
        if (typeof value === "number") return value > 0 ? `min-height: ${value}px;` : "";
        if (value.unit === "auto") return "min-height: auto;";
        return value.value > 0 ? `min-height: ${value.value}${value.unit};` : "";
    },

    flex: (value) => {
        if (!value || typeof value !== "object") return "";
        const parts: string[] = [];
        if (value.direction) parts.push(`flex-direction: ${value.direction};`);
        if (value.justifyContent) parts.push(`justify-content: ${value.justifyContent};`);
        if (value.alignItems) parts.push(`align-items: ${value.alignItems};`);
        return parts.join(" ");
    },

    gap: (value) => {
        if (!value) return "";
        if (typeof value === "number") return value > 0 ? `gap: ${value}px;` : "";
        const unit = value.unit || "px";
        const col = value.column ?? 0;
        const row = value.row ?? 0;
        if (col === 0 && row === 0) return "";
        return `column-gap: ${col}${unit}; row-gap: ${row}${unit};`;
    },

    wrap: (value) => {
        // Always emit — "nowrap" is the CSS default but must be explicit
        // so device overrides can reset it correctly.
        if (!value) return "";
        return `flex-wrap: ${value};`;
    },

    // --- STYLE ---

    background: (value) => {
        if (!value) return "";
        const normal = value.normal || value;
        if (!normal || normal.type === "none") return "";

        let css = "";
        if (normal.type === "color") {
            if (normal.color) css += `background-color: ${normal.color};`;
            if (normal.image) css += ` background-image: url(${normal.image}); background-size: cover; background-position: center;`;
        } else if (normal.type === "gradient" && normal.gradient) {
            const g = normal.gradient;
            if (g.type === "radial") {
                css = `background: radial-gradient(${g.color1} ${g.location1}%, ${g.color2} ${g.location2}%);`;
            } else {
                css = `background: linear-gradient(${g.angle}${g.angleUnit || "deg"}, ${g.color1} ${g.location1}%, ${g.color2} ${g.location2}%);`;
            }
        } else if (normal.type === "image" && normal.image) {
            if (normal.color && normal.color !== "transparent") css += `background-color: ${normal.color}; `;
            css += `background-image: url(${normal.image}); background-size: cover; background-position: center;`;
        }

        if (!css) return "";

        const transition = value.transition;
        if (transition && value.hover && value.hover.type !== "none") {
            css += ` transition: background ${transition}ms ease;`;
        }

        return css;
    },

    backgroundOverlay: () => "",

    border: (value) => {
        if (!value) return "";
        // New schema: { normal: { type, width, color, radius }, hover: {...}, transition, boxShadow }
        // Legacy flat schema: { width, style, color, radius } — handled by resolveBorderSide
        const side = value.normal !== undefined ? value.normal : value;
        return resolveBorderSide(side, value.transition);
    },

    shapeDivider: () => "",

    // --- ADVANCED ---

    margin: (value) => {
        const resolved = resolveSpacing(value);
        return resolved ? `margin: ${resolved};` : "";
    },

    padding: (value) => {
        const resolved = resolveSpacing(value);
        return resolved ? `padding: ${resolved};` : "";
    },

    alignSelf: (value) => {
        if (!value || value === "auto") return "";
        return `align-self: ${value};`;
    },

    // --- TYPOGRAPHY / STYLE (element-level) ---

    color: (value) => {
        if (!value || value === "transparent") return "";
        return `color: ${value};`;
    },

    hoverColor: () => "",

    typography: (value) => {
        if (!value || typeof value !== "object") return "";
        const parts: string[] = [];
        if (value.fontFamily) parts.push(`font-family: ${value.fontFamily};`);
        if (value.fontSize) parts.push(`font-size: ${value.fontSize}${value.fontSizeUnit || "px"};`);
        if (value.fontWeight) parts.push(`font-weight: ${value.fontWeight};`);
        if (value.textTransform) parts.push(`text-transform: ${value.textTransform};`);
        if (value.fontStyle) parts.push(`font-style: ${value.fontStyle};`);
        if (value.textDecoration) parts.push(`text-decoration: ${value.textDecoration};`);
        if (value.lineHeight && value.lineHeight > 0) parts.push(`line-height: ${value.lineHeight}${value.lineHeightUnit || "px"};`);
        if (value.letterSpacing !== undefined && value.letterSpacing !== 0) parts.push(`letter-spacing: ${value.letterSpacing}${value.letterSpacingUnit || "px"};`);
        if (value.wordSpacing !== undefined && value.wordSpacing !== 0) parts.push(`word-spacing: ${value.wordSpacing}${value.wordSpacingUnit || "px"};`);
        return parts.join(" ");
    },

    textAlign: (value) => {
        if (!value) return "";
        return `text-align: ${value};`;
    },

    // --- CONTENT (non-CSS controls) ---
    text: () => "",
    tag: () => "",
    link: () => "",

    // --- CAROUSEL ---
    slidesGap: (value) => {
        if (value === undefined || value === null || value === 0) return "";
        return `gap: ${value}px;`;
    },

    navIconSize: (value) => {
        if (!value) return "";
        return "";
    },

    paginationDotSize: (value) => {
        if (!value) return "";
        return "";
    },

    paginationDotSpacing: (value) => {
        if (value === undefined || value === null) return "";
        return "";
    },

    // --- BOX SHADOW ---
    boxShadow: (value) => {
        if (!value || typeof value !== "object") return "";
        const normal = value.normal || value;
        const { x = 0, y = 0, blur = 0, spread = 0, color = "rgba(0,0,0,0.15)" } = normal;
        // Normalize inset — may be boolean or string "true"/"false"
        const inset = normal.inset === true || normal.inset === "true";
        if (blur === 0 && spread === 0 && x === 0 && y === 0) return "";
        let css = `box-shadow: ${inset ? "inset " : ""}${x}px ${y}px ${blur}px ${spread}px ${color};`;
        const transition = value.transition;
        if (transition && value.hover) {
            css += ` transition: box-shadow ${transition}ms ease;`;
        }
        return css;
    },
};

/**
 * Generate CSS for a single control by name.
 * Returns empty string if the control has no CSS output or isn't registered.
 */
export function controlToCSS(name: string, value: any, schema?: any): string {
    const fn = cssRegistry[name];
    if (!fn) return "";
    return fn(value, schema);
}

// ============================================================
// HOVER REGISTRY
// ============================================================

/**
 * Hover CSS generators — for controls that store { normal: {...}, hover: {...} }.
 * Returns the CSS that should go inside the :hover pseudo-class.
 */
export const hoverRegistry: Record<string, CSSGeneratorFn> = {
    background: (value) => {
        if (!value || !value.hover) return "";
        const hover = value.hover;
        if (!hover || hover.type === "none") return "";

        let css = "";
        if (hover.type === "color") {
            if (hover.color && hover.color !== "transparent") css += `background-color: ${hover.color};`;
            if (hover.image) css += ` background-image: url(${hover.image}); background-size: cover; background-position: center;`;
        } else if (hover.type === "gradient" && hover.gradient) {
            const g = hover.gradient;
            if (g.type === "radial") {
                css = `background: radial-gradient(${g.color1} ${g.location1}%, ${g.color2} ${g.location2}%);`;
            } else {
                css = `background: linear-gradient(${g.angle}${g.angleUnit || "deg"}, ${g.color1} ${g.location1}%, ${g.color2} ${g.location2}%);`;
            }
        } else if (hover.type === "image" && hover.image) {
            if (hover.color && hover.color !== "transparent") css += `background-color: ${hover.color}; `;
            css += `background-image: url(${hover.image}); background-size: cover; background-position: center;`;
        }
        return css;
    },

    border: (value) => {
        if (!value || !value.hover) return "";
        return resolveBorderSide(value.hover, 0);
    },

    boxShadow: (value) => {
        if (!value || !value.hover) return "";
        const hover = value.hover;
        const { x = 0, y = 0, blur = 0, spread = 0, color = "rgba(0,0,0,0.15)" } = hover;
        const inset = hover.inset === true || hover.inset === "true";
        if (blur === 0 && spread === 0 && x === 0 && y === 0) return "";
        return `box-shadow: ${inset ? "inset " : ""}${x}px ${y}px ${blur}px ${spread}px ${color};`;
    },
};

/**
 * Generate hover CSS for a single control by name.
 * Returns empty string if the control has no hover output.
 */
export function controlToHoverCSS(name: string, value: any, schema?: any): string {
    const fn = hoverRegistry[name];
    if (!fn) return "";
    return fn(value, schema);
}
