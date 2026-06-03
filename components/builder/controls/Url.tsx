"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

interface UrlValue {
    url: string;
    target: string;
    nofollow: boolean;
    customAttributes: string;
}

interface Props {
    value: any;
    onChange: (v: UrlValue) => void;
    label?: string;
    placeholder?: string;
}

function normalize(value: any): UrlValue {
    if (typeof value === "object" && value !== null) {
        return {
            url: value.url || "",
            target: value.target || "",
            nofollow: value.nofollow === true || value.nofollow === "true",
            customAttributes: value.customAttributes || "",
        };
    }
    return { url: typeof value === "string" ? value : "", target: "", nofollow: false, customAttributes: "" };
}

export default function Url({ value, onChange, label, placeholder }: Props) {
    const [data, setData] = useState<UrlValue>(() => normalize(value));
    const [open, setOpen] = useState(false);

    // Sync from parent when value prop changes externally
    useEffect(() => {
        setData(normalize(value));
    }, [value]);

    const update = (field: keyof UrlValue, v: any) => {
        const next = { ...data, [field]: v };
        setData(next);
        onChange(next);
    };

    return (
        <div>
            {label && (
                <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[13px] font-medium text-gray-700">{label}</span>
                </div>
            )}

            {/* URL input + settings toggle */}
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                <input
                    type="text"
                    value={data.url}
                    onChange={(e) => update("url", e.target.value)}
                    placeholder={placeholder || "Type or paste your URL"}
                    className="flex-1 px-2.5 py-2 text-[13px] border-none outline-none bg-transparent"
                />
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className={`flex items-center justify-center w-9 h-9 border-l border-gray-200 cursor-pointer transition-colors ${open ? "bg-gray-100 text-gray-700" : "bg-white text-gray-400 hover:bg-gray-50"
                        }`}
                >
                    <Icon icon="solar:settings-bold" width="16" />
                </button>
            </div>

            {/* Expanded options */}
            {open && (
                <div className="mt-2 space-y-2">
                    {/* Open in new window */}
                    <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => update("target", data.target === "_blank" ? "" : "_blank")}
                    >
                        <input
                            type="checkbox"
                            checked={data.target === "_blank"}
                            readOnly
                            className="w-4 h-4 rounded border-gray-300 pointer-events-none"
                        />
                        <span className="text-[13px] text-gray-600">Open in new window</span>
                    </div>

                    {/* Add nofollow */}
                    <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => update("nofollow", !data.nofollow)}
                    >
                        <input
                            type="checkbox"
                            checked={data.nofollow}
                            readOnly
                            className="w-4 h-4 rounded border-gray-300 pointer-events-none"
                        />
                        <span className="text-[13px] text-gray-600">Add nofollow</span>
                    </div>

                    {/* Custom Attributes */}
                    <div className="flex items-center gap-2 pt-1">
                        <span className="text-[13px] text-gray-500 whitespace-nowrap">Custom Attributes</span>
                        <input
                            type="text"
                            value={data.customAttributes}
                            onChange={(e) => update("customAttributes", e.target.value)}
                            placeholder="key|value"
                            className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded text-[13px] outline-none"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
