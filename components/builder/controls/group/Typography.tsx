"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import NumberControl from "../Number";
import Select from "../Select";

interface TypographyValue {
    fontFamily?: string;
    fontSize?: number;
    fontSizeUnit?: string;
    fontWeight?: string;
    textTransform?: string;
    fontStyle?: string;
    textDecoration?: string;
    lineHeight?: number;
    lineHeightUnit?: string;
    letterSpacing?: number;
    letterSpacingUnit?: string;
    wordSpacing?: number;
    wordSpacingUnit?: string;
}

interface Props {
    value: TypographyValue;
    onChange: (v: TypographyValue) => void;
    label?: string;
}

const FONT_FAMILIES = [
    { value: "", label: "Default" },
    { value: "Roboto", label: "Roboto" },
    { value: "Open Sans", label: "Open Sans" },
    { value: "Lato", label: "Lato" },
    { value: "Montserrat", label: "Montserrat" },
    { value: "Poppins", label: "Poppins" },
    { value: "Inter", label: "Inter" },
    { value: "Oswald", label: "Oswald" },
    { value: "Raleway", label: "Raleway" },
    { value: "Nunito", label: "Nunito" },
    { value: "Playfair Display", label: "Playfair Display" },
];

const SIZE_UNITS = ["px", "em", "rem", "vw", "%"];
const SPACING_UNITS = ["px", "em", "rem", "vw"];

export default function Typography({ value, onChange, label = "Typography" }: Props) {
    const [open, setOpen] = useState(false);

    const v: TypographyValue = {
        fontFamily: "",
        fontSize: 16,
        fontSizeUnit: "px",
        fontWeight: "400",
        textTransform: "",
        fontStyle: "",
        textDecoration: "",
        lineHeight: 0,
        lineHeightUnit: "px",
        letterSpacing: 0,
        letterSpacingUnit: "px",
        wordSpacing: 0,
        wordSpacingUnit: "px",
        ...value,
    };

    const update = (field: keyof TypographyValue, val: any) => {
        onChange({ ...v, [field]: val });
    };

    return (
        <div className="relative">
            {/* Collapsed header */}
            <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-gray-700">{label}</span>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setOpen(!open)}
                        className={`flex items-center justify-center w-7 h-7 rounded border cursor-pointer transition-colors ${open ? "border-blue-300 bg-blue-50 text-blue-600" : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"}`}
                        title="Edit Typography"
                    >
                        <Icon icon="solar:pen-bold" width="14" />
                    </button>
                </div>
            </div>

            {/* Expanded panel */}
            {open && (
                <div className="absolute top-full right-0 z-30 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl p-4">
                    {/* Panel header */}
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                        <span className="text-[13px] font-semibold text-gray-800">{label}</span>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => onChange({
                                    fontFamily: "",
                                    fontSize: 16,
                                    fontSizeUnit: "px",
                                    fontWeight: "400",
                                    textTransform: "",
                                    fontStyle: "",
                                    textDecoration: "",
                                    lineHeight: 0,
                                    lineHeightUnit: "px",
                                    letterSpacing: 0,
                                    letterSpacingUnit: "px",
                                    wordSpacing: 0,
                                    wordSpacingUnit: "px",
                                })}
                                className="flex items-center justify-center w-6 h-6 rounded bg-transparent border-none cursor-pointer text-gray-400 hover:text-gray-600"
                                title="Reset"
                            >
                                <Icon icon="solar:restart-bold" width="14" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="flex items-center justify-center w-6 h-6 rounded bg-transparent border-none cursor-pointer text-gray-400 hover:text-gray-600"
                                title="Close"
                            >
                                <Icon icon="solar:close-circle-bold" width="14" />
                            </button>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="space-y-4">
                        {/* Family */}
                        <Select
                            value={v.fontFamily || ""}
                            onChange={(val) => update("fontFamily", val)}
                            label="Family"
                            grid={2}
                            options={FONT_FAMILIES}
                        />

                        {/* Size */}
                        <NumberControl
                            value={v.fontSize}
                            onChange={(val) => update("fontSize", val)}
                            label="Size"
                            min={1}
                            max={200}
                            unit={v.fontSizeUnit || "px"}
                            units={SIZE_UNITS}
                            onUnitChange={(u) => update("fontSizeUnit", u)}
                        />

                        {/* Weight */}
                        <Select
                            value={String(v.fontWeight)}
                            onChange={(val) => update("fontWeight", val)}
                            label="Weight"
                            grid={2}
                            options={[
                                { value: "100", label: "100 (Thin)" },
                                { value: "200", label: "200 (Extra Light)" },
                                { value: "300", label: "300 (Light)" },
                                { value: "400", label: "400 (Normal)" },
                                { value: "500", label: "500 (Medium)" },
                                { value: "600", label: "600 (Semi Bold)" },
                                { value: "700", label: "700 (Bold)" },
                                { value: "800", label: "800 (Extra Bold)" },
                                { value: "900", label: "900 (Black)" },
                            ]}
                        />

                        {/* Transform */}
                        <Select
                            value={v.textTransform || ""}
                            onChange={(val) => update("textTransform", val)}
                            label="Transform"
                            grid={2}
                            options={[
                                { value: "", label: "Default" },
                                { value: "uppercase", label: "Uppercase" },
                                { value: "lowercase", label: "Lowercase" },
                                { value: "capitalize", label: "Capitalize" },
                                { value: "none", label: "None" },
                            ]}
                        />

                        {/* Style */}
                        <Select
                            value={v.fontStyle || ""}
                            onChange={(val) => update("fontStyle", val)}
                            label="Style"
                            grid={2}
                            options={[
                                { value: "", label: "Default" },
                                { value: "normal", label: "Normal" },
                                { value: "italic", label: "Italic" },
                                { value: "oblique", label: "Oblique" },
                            ]}
                        />

                        {/* Decoration */}
                        <Select
                            value={v.textDecoration || ""}
                            onChange={(val) => update("textDecoration", val)}
                            label="Decoration"
                            grid={2}
                            options={[
                                { value: "", label: "Default" },
                                { value: "none", label: "None" },
                                { value: "underline", label: "Underline" },
                                { value: "overline", label: "Overline" },
                                { value: "line-through", label: "Line Through" },
                            ]}
                        />

                        {/* Line Height */}
                        <NumberControl
                            value={v.lineHeight}
                            onChange={(val) => update("lineHeight", val)}
                            label="Line Height"
                            min={0}
                            max={100}
                            unit={v.lineHeightUnit || "px"}
                            units={SPACING_UNITS}
                            onUnitChange={(u) => update("lineHeightUnit", u)}
                        />

                        {/* Letter Spacing */}
                        <NumberControl
                            value={v.letterSpacing}
                            onChange={(val) => update("letterSpacing", val)}
                            label="Letter Spacing"
                            min={-10}
                            max={50}
                            unit={v.letterSpacingUnit || "px"}
                            units={SPACING_UNITS}
                            onUnitChange={(u) => update("letterSpacingUnit", u)}
                        />

                        {/* Word Spacing */}
                        <NumberControl
                            value={v.wordSpacing}
                            onChange={(val) => update("wordSpacing", val)}
                            label="Word Spacing"
                            min={-10}
                            max={50}
                            unit={v.wordSpacingUnit || "px"}
                            units={SPACING_UNITS}
                            onUnitChange={(u) => update("wordSpacingUnit", u)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
