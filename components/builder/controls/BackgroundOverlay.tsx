"use client";

import { Icon } from "@iconify/react";
import ColorPickerPopup from "./ColorPickerPopup";
import NumberControl from "./Number";
import Tabs from "./group/Tabs";

/**
 * Background Overlay control — Elementor-style
 * Types: color | gradient
 * Normal / Hover tabs — each stores SEPARATE data.
 *
 * Schema shape:
 * {
 *   enabled: boolean,
 *   normal: { type, color, image, opacity, gradient },
 *   hover:  { type, color, image, opacity, gradient },
 *   transition: number (ms)
 * }
 */

const OVERLAY_TYPES = [
    { value: "color", icon: "mdi:brush", title: "Classic" },
    { value: "gradient", icon: "mdi:gradient-horizontal", title: "Gradient" },
];

const DEFAULT_STATE = {
    type: "color" as string,
    color: "rgba(0,0,0,0.5)",
    image: "",
    opacity: 0.5,
    gradient: {
        color1: "#000000",
        location1: 0,
        color2: "#000000",
        location2: 100,
        type: "linear",
        angle: 180,
    },
};

function normalizeValue(value: any) {
    if (value && !value.normal && value.type !== undefined) {
        return {
            enabled: value.enabled ?? false,
            normal: { ...DEFAULT_STATE, type: value.type, color: value.color, image: value.image, opacity: value.opacity, gradient: value.gradient || DEFAULT_STATE.gradient },
            hover: { ...DEFAULT_STATE },
            transition: 300,
        };
    }
    return {
        enabled: value?.enabled ?? false,
        normal: { ...DEFAULT_STATE, ...(value?.normal || {}) },
        hover: { ...DEFAULT_STATE, ...(value?.hover || {}) },
        transition: value?.transition ?? 300,
    };
}

export default function BackgroundOverlay({ value, onChange }: any) {
    const data = normalizeValue(value);

    const makeTabContent = (tab: "normal" | "hover") => {
        const current = data[tab];

        const emit = (updated: any) => onChange({ ...data, enabled: true, [tab]: updated });
        const update = (field: string, v: any) => emit({ ...current, [field]: v });
        const updateGradient = (field: string, v: any) =>
            emit({ ...current, gradient: { ...current.gradient, [field]: v } });

        return (
            <div>
                {/* Background Type */}
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[13px] text-gray-700">Background Type</span>
                    <div className="flex gap-0.5">
                        {OVERLAY_TYPES.map((t) => (
                            <button
                                key={t.value}
                                type="button"
                                onClick={() => update("type", current.type === t.value ? "none" : t.value)}
                                title={t.title}
                                className={`flex items-center justify-center w-7 h-7 border border-gray-200 rounded-[3px] cursor-pointer ${current.type === t.value ? "bg-gray-100" : "bg-white"}`}
                            >
                                <Icon icon={t.icon} width="16" className={current.type === t.value ? "text-gray-900" : "text-gray-500"} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* COLOR */}
                {current.type === "color" && (
                    <div>
                        <ColorPickerPopup label="Color" value={current.color} onChange={(c) => update("color", c)} />
                    </div>
                )}

                {/* GRADIENT */}
                {current.type === "gradient" && (
                    <div>
                        <ColorPickerPopup label="Color" value={current.gradient.color1} onChange={(c) => updateGradient("color1", c)} />
                        <NumberControl label="Location" value={current.gradient.location1} onChange={(v) => updateGradient("location1", v)} min={0} max={100} unit="%" />
                        <ColorPickerPopup label="Second Color" value={current.gradient.color2} onChange={(c) => updateGradient("color2", c)} />
                        <NumberControl label="Location" value={current.gradient.location2} onChange={(v) => updateGradient("location2", v)} min={0} max={100} unit="%" />
                    </div>
                )}

                {/* Opacity */}
                <div className="mt-2 pt-3 border-t border-gray-100">
                    <NumberControl
                        label="Opacity"
                        value={current.opacity}
                        onChange={(v) => update("opacity", v)}
                        min={0}
                        max={1}
                        step={0.01}
                        unit=""
                    />
                </div>

                {/* Transition — Hover tab only */}
                {tab === "hover" && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <NumberControl
                            label="Transition Duration"
                            unit="ms"
                            value={data.transition}
                            onChange={(v) => onChange({ ...data, transition: v })}
                            min={0}
                            max={2000}
                            step={50}
                        />
                    </div>
                )}
            </div>
        );
    };

    return (
        <Tabs
            tabs={[
                { label: "Normal", content: makeTabContent("normal") },
                { label: "Hover", content: makeTabContent("hover") },
            ]}
        />
    );
}
