"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "@iconify/react";

interface Props {
    label: string;
    value: string;
    onChange: (color: string) => void;
}

type Mode = "HEXA" | "RGBA" | "HSLA";

// ─── color math ───────────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, n));
}

/** Parse any CSS color string → { r, g, b, a } (0–1 each). */
function parseColor(raw: string): { r: number; g: number; b: number; a: number } {
    if (!raw || raw === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

    // rgba / rgb
    const rgba = raw.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
    if (rgba) {
        return {
            r: Number(rgba[1]) / 255,
            g: Number(rgba[2]) / 255,
            b: Number(rgba[3]) / 255,
            a: rgba[4] !== undefined ? Number(rgba[4]) : 1,
        };
    }

    // hsla / hsl
    const hsla = raw.match(/hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\s*\)/);
    if (hsla) {
        return hslToRgba(Number(hsla[1]), Number(hsla[2]) / 100, Number(hsla[3]) / 100, hsla[4] !== undefined ? Number(hsla[4]) : 1);
    }

    // hex (#rgb, #rgba, #rrggbb, #rrggbbaa)
    let hex = raw.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
    if (hex.length === 4) hex = hex.split("").map(c => c + c).join("");
    if (hex.length === 6) hex += "ff";
    if (hex.length === 8) {
        return {
            r: parseInt(hex.slice(0, 2), 16) / 255,
            g: parseInt(hex.slice(2, 4), 16) / 255,
            b: parseInt(hex.slice(4, 6), 16) / 255,
            a: parseInt(hex.slice(6, 8), 16) / 255,
        };
    }

    return { r: 0, g: 0, b: 0, a: 1 };
}

function hslToRgba(h: number, s: number, l: number, a: number) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return { r: r + m, g: g + m, b: b + m, a };
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d !== 0) {
        if (max === r) h = ((g - b) / d + 6) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
    }
    return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
    const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return { r: r + m, g: g + m, b: b + m };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    if (d === 0) return { h: 0, s: 0, l };
    const s = d / (1 - Math.abs(2 * l - 1));
    let h = 0;
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return { h: h * 60, s, l };
}

function toHex2(n: number) {
    return Math.round(clamp(n, 0, 1) * 255).toString(16).padStart(2, "0");
}

/** Emit the canonical color string from HSVA. */
function emitFromHsva(h: number, s: number, v: number, a: number): string {
    const { r, g, b } = hsvToRgb(h, s, v);
    if (a >= 1) return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${Math.round(a * 100) / 100})`;
}

/** Format the current color for the text input in the given mode. */
function formatForMode(h: number, s: number, v: number, a: number, mode: Mode): string {
    const { r, g, b } = hsvToRgb(h, s, v);
    const ri = Math.round(r * 255), gi = Math.round(g * 255), bi = Math.round(b * 255);
    const af = Math.round(a * 100) / 100;
    if (mode === "HEXA") {
        const hex = `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
        return a < 1 ? hex + toHex2(a) : hex;
    }
    if (mode === "RGBA") return `rgba(${ri}, ${gi}, ${bi}, ${af})`;
    // HSLA
    const { h: hh, s: ss, l } = rgbToHsl(r, g, b);
    return `hsla(${Math.round(hh)}, ${Math.round(ss * 100)}%, ${Math.round(l * 100)}%, ${af})`;
}

/** Pure hue color (s=1, v=1) as hex — used for canvas background and hue thumb. */
function hueHex(h: number) {
    const { r, g, b } = hsvToRgb(h, 1, 1);
    return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function ColorPickerPopup({ label, value, onChange }: Props) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<Mode>("RGBA");

    // Parse incoming value → HSVA
    // When value is empty/transparent, default alpha to 1 so the picker opens opaque.
    const parsed = parseColor(value);
    const initHsv = rgbToHsv(parsed.r, parsed.g, parsed.b);
    const initAlpha = (!value || value === "transparent") ? 1 : parsed.a;

    const [hue, setHue] = useState(initHsv.h);
    const [sat, setSat] = useState(initHsv.s);
    const [bright, setBright] = useState(initHsv.v);
    const [alpha, setAlpha] = useState(initAlpha);

    // Text input — tracks the formatted string for the active mode
    const [textInput, setTextInput] = useState(() => formatForMode(initHsv.h, initHsv.s, initHsv.v, initAlpha, "RGBA"));

    // Sync state when external value changes
    useEffect(() => {
        const p = parseColor(value);
        const hsv = rgbToHsv(p.r, p.g, p.b);
        const a = (!value || value === "transparent") ? 1 : p.a;
        setHue(hsv.h);
        setSat(hsv.s);
        setBright(hsv.v);
        setAlpha(a);
        setTextInput(formatForMode(hsv.h, hsv.s, hsv.v, a, mode));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    // Sync text input when mode changes
    useEffect(() => {
        setTextInput(formatForMode(hue, sat, bright, alpha, mode));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    // ── drag refs ──
    const satRef = useRef<HTMLDivElement>(null);
    const hueRef = useRef<HTMLDivElement>(null);
    const alphaRef = useRef<HTMLDivElement>(null);
    const dragging = useRef<"sat" | "hue" | "alpha" | null>(null);

    const emit = useCallback((h: number, s: number, v: number, a: number) => {
        const color = emitFromHsva(h, s, v, a);
        onChange(color);
        setTextInput(formatForMode(h, s, v, a, mode));
    }, [onChange, mode]);

    const handleSatMove = useCallback((e: MouseEvent | React.MouseEvent) => {
        if (!satRef.current) return;
        const rect = satRef.current.getBoundingClientRect();
        const nx = clamp((e.clientX - rect.left) / rect.width, 0, 1);
        const ny = clamp((e.clientY - rect.top) / rect.height, 0, 1);
        setSat(nx);
        setBright(1 - ny);
        emit(hue, nx, 1 - ny, alpha);
    }, [hue, alpha, emit]);

    const handleHueMove = useCallback((e: MouseEvent | React.MouseEvent) => {
        if (!hueRef.current) return;
        const rect = hueRef.current.getBoundingClientRect();
        const nx = clamp((e.clientX - rect.left) / rect.width, 0, 1);
        const h = nx * 360;
        setHue(h);
        emit(h, sat, bright, alpha);
    }, [sat, bright, alpha, emit]);

    const handleAlphaMove = useCallback((e: MouseEvent | React.MouseEvent) => {
        if (!alphaRef.current) return;
        const rect = alphaRef.current.getBoundingClientRect();
        const nx = clamp((e.clientX - rect.left) / rect.width, 0, 1);
        setAlpha(nx);
        emit(hue, sat, bright, nx);
    }, [hue, sat, bright, emit]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (dragging.current === "sat") handleSatMove(e);
            if (dragging.current === "hue") handleHueMove(e);
            if (dragging.current === "alpha") handleAlphaMove(e);
        };
        const onUp = () => { dragging.current = null; };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
        return () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };
    }, [handleSatMove, handleHueMove, handleAlphaMove]);

    // ── text input parsing ──
    const handleTextChange = (raw: string) => {
        setTextInput(raw);
        // Try to parse whatever the user typed
        const p = parseColor(raw.trim());
        if (raw.trim() === "") return;
        // Validate: hex needs # prefix + 3/4/6/8 chars; rgba/hsla need parens
        const isHex = /^#[0-9a-fA-F]{3,8}$/.test(raw.trim());
        const isFunc = /^(rgba?|hsla?)\(/.test(raw.trim());
        if (!isHex && !isFunc) return;
        const hsv = rgbToHsv(p.r, p.g, p.b);
        setHue(hsv.h);
        setSat(hsv.s);
        setBright(hsv.v);
        setAlpha(p.a);
        onChange(emitFromHsva(hsv.h, hsv.s, hsv.v, p.a));
    };

    const reset = () => {
        onChange("transparent");
        setHue(0); setSat(0); setBright(1); setAlpha(0);
        setTextInput(formatForMode(0, 0, 1, 0, mode));
    };

    // ── derived display values ──
    const isTransparent = !value || value === "transparent";
    const swatchBg = isTransparent
        ? "repeating-conic-gradient(#d1d5db 0% 25%, transparent 0% 50%) 50% / 8px 8px"
        : value;

    const currentHex = `#${toHex2(hsvToRgb(hue, sat, bright).r)}${toHex2(hsvToRgb(hue, sat, bright).g)}${toHex2(hsvToRgb(hue, sat, bright).b)}`;

    return (
        <div className="mb-1">
            {/* ── Trigger row: label + reset + swatch ── */}
            <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">{label}</span>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={reset}
                        title="Reset color"
                        className="w-6 h-6 border border-gray-200 rounded-[3px] flex items-center justify-center bg-white cursor-pointer hover:bg-gray-50"
                    >
                        <Icon icon="mdi:refresh" width="14" className="text-gray-500" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setOpen(!open)}
                        className="relative w-8 h-8 rounded-[4px] border border-gray-200 cursor-pointer overflow-hidden"
                        style={{ background: swatchBg }}
                    >
                        {isTransparent && (
                            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_45%,#ef4444_45%,#ef4444_55%,transparent_55%)]" />
                        )}
                    </button>
                </div>
            </div>

            {/* ── Inline picker ── */}
            {open && (
                <div className="mt-2 select-none">

                    {/* Saturation / Brightness canvas
                        Layer order (bottom → top):
                        1. Checkerboard  — visible only where both overlays are transparent (top-right)
                        2. Hue color     — the canvas base tint
                        3. White overlay — left=white, right=transparent  (controls saturation)
                        4. Black overlay — top=transparent, bottom=black  (controls brightness)
                    */}
                    <div
                        ref={satRef}
                        className="relative w-full rounded cursor-crosshair mb-3 overflow-hidden"
                        style={{ height: 180 }}
                        onMouseDown={(e) => { dragging.current = "sat"; handleSatMove(e); }}
                    >
                        {/* 1. Checkerboard base */}
                        <div
                            className="absolute inset-0"
                            style={{ background: "repeating-conic-gradient(#bbb 0% 25%, #fff 0% 50%) 0 0 / 14px 14px" }}
                        />
                        {/* 2. Hue color fill */}
                        <div className="absolute inset-0" style={{ background: hueHex(hue) }} />
                        {/* 3. White → transparent (left → right) */}
                        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, #fff, transparent)" }} />
                        {/* 4. Transparent → black (top → bottom) */}
                        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent, #000)" }} />
                        {/* Picker dot */}
                        <div
                            className="absolute w-5 h-5 rounded-full border-[3px] border-white shadow-md pointer-events-none"
                            style={{
                                left: `${sat * 100}%`,
                                top: `${(1 - bright) * 100}%`,
                                transform: "translate(-50%, -50%)",
                                background: currentHex,
                                boxShadow: "0 0 0 1px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.3)",
                            }}
                        />
                    </div>

                    {/* Hue slider — tall pill */}
                    <div
                        ref={hueRef}
                        className="relative w-full cursor-pointer mb-2 rounded-full overflow-hidden"
                        style={{ height: 14, background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }}
                        onMouseDown={(e) => { dragging.current = "hue"; handleHueMove(e); }}
                    >
                        <div
                            className="absolute top-1/2 w-5 h-5 rounded-full border-[3px] border-white pointer-events-none"
                            style={{
                                left: `${(hue / 360) * 100}%`,
                                transform: "translate(-50%, -50%)",
                                background: hueHex(hue),
                                boxShadow: "0 0 0 1px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.3)",
                            }}
                        />
                    </div>

                    {/* Alpha slider — checkerboard + color gradient track, neutral thumb */}
                    <div
                        ref={alphaRef}
                        className="relative w-full cursor-pointer mb-3 rounded-full overflow-hidden"
                        style={{ height: 14 }}
                        onMouseDown={(e) => { dragging.current = "alpha"; handleAlphaMove(e); }}
                    >
                        {/* Checkerboard base */}
                        <div
                            className="absolute inset-0"
                            style={{ background: "repeating-conic-gradient(#bbb 0% 25%, #fff 0% 50%) 0 0 / 14px 14px" }}
                        />
                        {/* transparent → current color overlay */}
                        <div
                            className="absolute inset-0"
                            style={{ background: `linear-gradient(to right, transparent, ${currentHex})` }}
                        />
                        {/* Thumb — neutral grey */}
                        <div
                            className="absolute top-1/2 w-5 h-5 rounded-full border-[3px] border-white pointer-events-none"
                            style={{
                                left: `${alpha * 100}%`,
                                transform: "translate(-50%, -50%)",
                                background: "#888",
                                boxShadow: "0 0 0 1px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.3)",
                            }}
                        />
                    </div>

                    {/* Text input + mode switcher */}
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={textInput}
                            onChange={(e) => handleTextChange(e.target.value)}
                            className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-[13px] font-mono outline-none bg-white"
                            spellCheck={false}
                        />
                        <div className="flex items-center gap-1.5 shrink-0">
                            {(["HEXA", "RGBA", "HSLA"] as Mode[]).map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setMode(m)}
                                    className={`text-[11px] border-none bg-transparent cursor-pointer px-0 ${mode === m
                                        ? "font-bold text-gray-900"
                                        : "font-medium text-gray-400 hover:text-gray-600"
                                        }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
