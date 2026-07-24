"use client";

import React, { useState } from "react";
import Dimensions from "./Dimensions";
import AlignSelf from "./AlignSelf";
import Toggle from "./Toggle";
import Select from "./Select";
import Text from "./Text";
import Textarea from "./Textarea";
import NumberControl from "./Number";
import Slider from "./Slider";
import ButtonGroup from "./ButtonGroup";
import Tabs from "./group/Tabs";
import Background from "./Background";
import BackgroundOverlay from "./BackgroundOverlay";
import Border from "./Border";
import { ControlDef } from "../types";

// ============================================================
// HELPER CONTROLS FOR ADVANCED TAB
// ============================================================

export function OrderControl({ value, onChange }: { value: any; onChange: (v: any) => void }) {
    const type = value?.type || "default";
    return (
        <div className="space-y-2 border-t border-gray-100 pt-2">
            <ButtonGroup
                label="Order"
                value={type}
                onChange={(t) => onChange({ ...value, type: t })}
                options={[
                    { value: "default", label: "Default", icon: "mdi:reorder-horizontal" },
                    { value: "first", label: "First", icon: "mdi:arrow-collapse-left" },
                    { value: "last", label: "Last", icon: "mdi:arrow-collapse-right" },
                    { value: "custom", label: "Custom", icon: "mdi:dots-horizontal" },
                ]}
            />
            {type === "custom" && (
                <NumberControl
                    label="Custom Order Index"
                    showSlider={false}
                    value={value?.customValue}
                    onChange={(val) => onChange({ ...value, customValue: val })}
                    min={-999}
                    max={999}
                />
            )}
            <p className="text-[10px] text-gray-400 italic">This control will affect contained elements only.</p>
        </div>
    );
}

export function SizeControl({ value, onChange }: { value: any; onChange: (v: any) => void }) {
    return (
        <div className="space-y-2 border-t border-gray-100 pt-2">
            <ButtonGroup
                label="Size"
                value={value || "default"}
                onChange={onChange}
                options={[
                    { value: "default", label: "Default", icon: "mdi:close-circle-outline" },
                    { value: "grow", label: "Grow", icon: "mdi:arrow-expand-horizontal" },
                    { value: "shrink", label: "Shrink", icon: "mdi:arrow-collapse-horizontal" },
                    { value: "none", label: "None", icon: "mdi:dots-horizontal" },
                ]}
            />
            <p className="text-[10px] text-gray-400 italic">This control will affect contained elements only.</p>
        </div>
    );
}

export function PositionControl({ value, onChange }: { value: any; onChange: (v: any) => void }) {
    const type = value?.type || "default";
    return (
        <div className="space-y-3 border-t border-gray-100 pt-2">
            <Select
                label="Position"
                value={type}
                onChange={(t) => onChange({ ...value, type: t })}
                options={[
                    { value: "default", label: "Default" },
                    { value: "absolute", label: "Absolute" },
                    { value: "fixed", label: "Fixed" },
                ]}
            />
            {type !== "default" && (
                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2 rounded border border-gray-200">
                    <NumberControl
                        label="Top (px)"
                        showSlider={false}
                        value={value?.top}
                        onChange={(val) => onChange({ ...value, top: val })}
                        min={-2000}
                        max={2000}
                    />
                    <NumberControl
                        label="Right (px)"
                        showSlider={false}
                        value={value?.right}
                        onChange={(val) => onChange({ ...value, right: val })}
                        min={-2000}
                        max={2000}
                    />
                    <NumberControl
                        label="Bottom (px)"
                        showSlider={false}
                        value={value?.bottom}
                        onChange={(val) => onChange({ ...value, bottom: val })}
                        min={-2000}
                        max={2000}
                    />
                    <NumberControl
                        label="Left (px)"
                        showSlider={false}
                        value={value?.left}
                        onChange={(val) => onChange({ ...value, left: val })}
                        min={-2000}
                        max={2000}
                    />
                </div>
            )}
        </div>
    );
}

export function DisplayConditionsControl({ value, onChange }: { value: any; onChange: (v: any) => void }) {
    const type = value?.type || "always";
    return (
        <div className="space-y-2 border-t border-gray-100 pt-2">
            <Select
                label="Display Conditions"
                value={type}
                onChange={(t) => onChange({ ...value, type: t })}
                options={[
                    { value: "always", label: "Always Show" },
                    { value: "query", label: "Query Parameter Present" },
                    { value: "loggedin", label: "Logged In Users Only" },
                    { value: "loggedout", label: "Logged Out Users Only" },
                ]}
            />
            {type === "query" && (
                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2 rounded border border-gray-200">
                    <Text
                        label="Param Key"
                        value={value?.key || ""}
                        onChange={(k) => onChange({ ...value, key: k })}
                    />
                    <Text
                        label="Param Value (Opt)"
                        value={value?.val || ""}
                        onChange={(v) => onChange({ ...value, val: v })}
                    />
                </div>
            )}
        </div>
    );
}

export function TransformControl({ value, onChange }: { value: any; onChange: (v: any) => void }) {
    const normal = value?.normal || {};
    const hover = value?.hover || {};

    const [rotateActive, setRotateActive] = useState(normal.rotate !== undefined && normal.rotate !== "");
    const [offsetActive, setOffsetActive] = useState((normal.offsetX !== undefined && normal.offsetX !== "") || (normal.offsetY !== undefined && normal.offsetY !== ""));
    const [scaleActive, setScaleActive] = useState((normal.scaleX !== undefined && normal.scaleX !== "") || (normal.scaleY !== undefined && normal.scaleY !== ""));
    const [skewActive, setSkewActive] = useState((normal.skewX !== undefined && normal.skewX !== "") || (normal.skewY !== undefined && normal.skewY !== ""));

    const renderSliders = (vals: any, isHover: boolean) => {
        const updateVal = (key: string, val: any) => {
            const updatedVals = { ...vals, [key]: val };
            if (isHover) {
                onChange({ ...value, hover: updatedVals });
            } else {
                onChange({ ...value, normal: updatedVals });
            }
        };

        return (
            <div className="space-y-3 p-2.5 bg-gray-50/50 rounded border border-gray-100 mt-2">
                {/* Rotate */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-gray-700">Rotate</span>
                        <button
                            type="button"
                            onClick={() => {
                                const active = !rotateActive;
                                setRotateActive(active);
                                if (!active) {
                                    updateVal("rotate", "");
                                }
                            }}
                            className={`p-1 border-none bg-transparent cursor-pointer rounded hover:bg-gray-200 transition-colors ${rotateActive ? "text-fuchsia-500" : "text-gray-400"}`}
                        >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" /></svg>
                        </button>
                    </div>
                    {rotateActive && (
                        <Slider
                            value={vals.rotate ?? 0}
                            onChange={(v) => updateVal("rotate", v)}
                            min={0}
                            max={360}
                            unit="deg"
                        />
                    )}
                </div>

                {/* Offset */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-gray-700">Offset</span>
                        <button
                            type="button"
                            onClick={() => {
                                const active = !offsetActive;
                                setOffsetActive(active);
                                if (!active) {
                                    updateVal("offsetX", "");
                                    updateVal("offsetY", "");
                                }
                            }}
                            className={`p-1 border-none bg-transparent cursor-pointer rounded hover:bg-gray-200 transition-colors ${offsetActive ? "text-fuchsia-500" : "text-gray-400"}`}
                        >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" /></svg>
                        </button>
                    </div>
                    {offsetActive && (
                        <div className="grid grid-cols-2 gap-2">
                            <NumberControl
                                label="Offset X (px)"
                                showSlider={false}
                                value={vals.offsetX ?? 0}
                                onChange={(v) => updateVal("offsetX", v)}
                                min={-1000}
                                max={1000}
                            />
                            <NumberControl
                                label="Offset Y (px)"
                                showSlider={false}
                                value={vals.offsetY ?? 0}
                                onChange={(v) => updateVal("offsetY", v)}
                                min={-1000}
                                max={1000}
                            />
                        </div>
                    )}
                </div>

                {/* Scale */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-gray-700">Scale</span>
                        <button
                            type="button"
                            onClick={() => {
                                const active = !scaleActive;
                                setScaleActive(active);
                                if (!active) {
                                    updateVal("scaleX", "");
                                    updateVal("scaleY", "");
                                }
                            }}
                            className={`p-1 border-none bg-transparent cursor-pointer rounded hover:bg-gray-200 transition-colors ${scaleActive ? "text-fuchsia-500" : "text-gray-400"}`}
                        >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" /></svg>
                        </button>
                    </div>
                    {scaleActive && (
                        <div className="grid grid-cols-2 gap-2">
                            <NumberControl
                                label="Scale X"
                                showSlider={false}
                                step={0.05}
                                value={vals.scaleX ?? 1}
                                onChange={(v) => updateVal("scaleX", v)}
                                min={0.1}
                                max={10}
                            />
                            <NumberControl
                                label="Scale Y"
                                showSlider={false}
                                step={0.05}
                                value={vals.scaleY ?? 1}
                                onChange={(v) => updateVal("scaleY", v)}
                                min={0.1}
                                max={10}
                            />
                        </div>
                    )}
                </div>

                {/* Skew */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-gray-700">Skew</span>
                        <button
                            type="button"
                            onClick={() => {
                                const active = !skewActive;
                                setSkewActive(active);
                                if (!active) {
                                    updateVal("skewX", "");
                                    updateVal("skewY", "");
                                }
                            }}
                            className={`p-1 border-none bg-transparent cursor-pointer rounded hover:bg-gray-200 transition-colors ${skewActive ? "text-fuchsia-500" : "text-gray-400"}`}
                        >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" /></svg>
                        </button>
                    </div>
                    {skewActive && (
                        <div className="grid grid-cols-2 gap-2">
                            <NumberControl
                                label="Skew X (deg)"
                                showSlider={false}
                                value={vals.skewX ?? 0}
                                onChange={(v) => updateVal("skewX", v)}
                                min={-180}
                                max={180}
                            />
                            <NumberControl
                                label="Skew Y (deg)"
                                showSlider={false}
                                value={vals.skewY ?? 0}
                                onChange={(v) => updateVal("skewY", v)}
                                min={-180}
                                max={180}
                            />
                        </div>
                    )}
                </div>

                {/* Flip horizontal / vertical */}
                <Toggle
                    label="Flip H"
                    value={vals.flipH || false}
                    onChange={(v) => updateVal("flipH", v)}
                />
                <Toggle
                    label="Flip V"
                    value={vals.flipV || false}
                    onChange={(v) => updateVal("flipV", v)}
                />
            </div>
        );
    };

    return (
        <div className="space-y-2 border-t border-gray-100 pt-2">
            <Tabs
                tabs={[
                    { label: "Normal", content: renderSliders(normal, false) },
                    { label: "Hover", content: renderSliders(hover, true) },
                ]}
            />
            <p className="text-[10px] text-orange-500 italic mt-1 bg-orange-50 p-1.5 rounded border border-orange-100">
                Note: Avoid applying transform properties on sticky containers. Doing so might cause unexpected results.
            </p>
        </div>
    );
}

// ============================================================
// MAIN ADVANCED CONTROLS CONFIGURATION
// ============================================================

export const commonAdvancedControls: { tab: string; section: string; controls: ControlDef[] }[] = [
    // ═══════════════════ LAYOUT SECTION ════════════════
    {
        tab: "Advanced",
        section: "Layout",
        controls: [
            {
                name: "margin",
                responsive: true,
                render: (value: any, onChange: any) => (
                    <Dimensions type="margin" value={value} onChange={onChange} />
                ),
            },
            {
                name: "padding",
                responsive: true,
                render: (value: any, onChange: any) => (
                    <Dimensions type="padding" value={value} onChange={onChange} />
                ),
            },
            {
                name: "alignSelf",
                responsive: true,
                render: (value: any, onChange: any) => (
                    <AlignSelf value={value} onChange={onChange} />
                ),
            },
            {
                name: "order",
                responsive: true,
                render: (value: any, onChange: any) => (
                    <OrderControl value={value} onChange={onChange} />
                ),
            },
            {
                name: "size",
                responsive: true,
                render: (value: any, onChange: any) => (
                    <SizeControl value={value} onChange={onChange} />
                ),
            },
            {
                name: "position",
                responsive: true,
                render: (value: any, onChange: any) => (
                    <PositionControl value={value} onChange={onChange} />
                ),
            },
            {
                name: "zIndex",
                responsive: false,
                render: (value: any, onChange: any) => (
                    <NumberControl label="Z-Index" showSlider={false} value={value} onChange={onChange} min={-9999} max={9999} />
                ),
            },
            {
                name: "cssID",
                responsive: false,
                render: (value: any, onChange: any) => (
                    <Text label="CSS ID" value={value || ""} onChange={onChange} />
                ),
            },
            {
                name: "cssClasses",
                responsive: false,
                render: (value: any, onChange: any) => (
                    <Text label="CSS Classes" value={value || ""} onChange={onChange} />
                ),
            },
            {
                name: "displayConditions",
                responsive: false,
                render: (value: any, onChange: any) => (
                    <DisplayConditionsControl value={value} onChange={onChange} />
                ),
            },
        ],
    },

    // ═══════════════════ MOTION EFFECTS SECTION ════════════════
    {
        tab: "Advanced",
        section: "Motion Effects",
        controls: [
            {
                name: "scrollingEffects",
                responsive: false,
                render: (value: any, onChange: any) => (
                    <Toggle label="Scrolling Effects" value={value || false} onChange={onChange} />
                ),
            },
            {
                name: "mouseEffects",
                responsive: false,
                render: (value: any, onChange: any) => (
                    <Toggle label="Mouse Effects" value={value || false} onChange={onChange} />
                ),
            },
            {
                name: "sticky",
                responsive: false,
                render: (value: any, onChange: any) => (
                    <Select
                        label="Sticky"
                        value={value || "none"}
                        onChange={onChange}
                        options={[
                            { value: "none", label: "None" },
                            { value: "top", label: "Top" },
                            { value: "bottom", label: "Bottom" },
                        ]}
                    />
                ),
            },
            {
                name: "entranceAnimation",
                responsive: false,
                render: (value: any, onChange: any) => (
                    <Select
                        label="Entrance Animation"
                        value={value || "none"}
                        onChange={onChange}
                        options={[
                            { value: "none", label: "None" },
                            { value: "fadeIn", label: "Fade In" },
                            { value: "fadeInDown", label: "Fade In Down" },
                            { value: "fadeInUp", label: "Fade In Up" },
                            { value: "zoomIn", label: "Zoom In" },
                            { value: "slideInDown", label: "Slide In Down" },
                            { value: "slideInUp", label: "Slide In Up" },
                        ]}
                    />
                ),
            },
        ],
    },

    // ═══════════════════ TRANSFORM SECTION ════════════════
    {
        tab: "Advanced",
        section: "Transform",
        controls: [
            {
                name: "transform",
                responsive: false,
                render: (value: any, onChange: any) => (
                    <TransformControl value={value} onChange={onChange} />
                ),
            },
        ],
    },

    // ═══════════════════ RESPONSIVE SECTION ════════════════
    {
        tab: "Advanced",
        section: "Responsive",
        controls: [
            {
                name: "hideDesktop",
                responsive: false,
                render: (value: any, onChange: any) => (
                    <Toggle label="Hide On Desktop" value={value || false} onChange={onChange} />
                ),
            },
            {
                name: "hideTablet",
                responsive: false,
                render: (value: any, onChange: any) => (
                    <Toggle label="Hide On Tablet Portrait" value={value || false} onChange={onChange} />
                ),
            },
            {
                name: "hideMobile",
                responsive: false,
                render: (value: any, onChange: any) => (
                    <Toggle label="Hide On Mobile Portrait" value={value || false} onChange={onChange} />
                ),
            },
        ],
    },

    // ═══════════════════ CUSTOM CSS SECTION ════════════════
    {
        tab: "Advanced",
        section: "Custom CSS",
        controls: [
            {
                name: "customCSS",
                responsive: false,
                render: (value: any, onChange: any) => (
                    <div className="space-y-1">
                        <span className="text-xs text-gray-500 font-medium block">Add your own custom CSS:</span>
                        <Textarea
                            label=""
                            value={value || ""}
                            onChange={onChange}
                            rows={6}
                            placeholder={`selector {\n  /* Your custom CSS here */\n}`}
                        />
                    </div>
                ),
            },
        ],
    },
];

export const commonStyleControls: { tab: string; section: string; controls: ControlDef[]; condition?: (values: any) => boolean }[] = [
    {
        tab: "Style",
        section: "Background",
        controls: [
            {
                name: "background",
                responsive: false,
                render: (value: any, onChange: any) => (
                    <Background value={value} onChange={onChange} />
                ),
            },
            {
                name: "backgroundOverlay",
                responsive: false,
                render: (value: any, onChange: any) => (
                    <BackgroundOverlay value={value} onChange={onChange} />
                ),
                condition: (values: any) => {
                    const bg = values.style?.background;
                    const normal = bg?.normal || bg;
                    return normal?.type === "image";
                },
            },
        ],
    },
    {
        tab: "Style",
        section: "Border",
        controls: [
            {
                name: "border",
                responsive: false,
                render: (value: any, onChange: any) => (
                    <Border value={value} onChange={onChange} />
                ),
            },
        ],
    },
];

export function mergeControls(controls: any[]): { tab: string; section: string; controls: ControlDef[]; condition?: (values: any) => boolean }[] {
    const list = Array.isArray(controls) ? controls : [];
    // 1. Filter out static background/border controls from existing Style sections
    const filtered = list.map((section) => {
        if (section.tab === "Style") {
            return {
                ...section,
                controls: section.controls.filter(
                    (ctrl: any) => !["background", "backgroundOverlay", "border"].includes(ctrl.name)
                ),
            };
        }
        return section;
    }).filter((section) => section.controls.length > 0);

    // 2. Remove any existing static "Advanced" tab completely
    const noAdvanced = filtered.filter((c) => c.tab !== "Advanced");

    // 3. Combine with commonStyleControls and commonAdvancedControls
    return [
        ...noAdvanced,
        ...commonStyleControls,
        ...commonAdvancedControls,
    ];
}
