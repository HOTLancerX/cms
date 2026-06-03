"use client";

import { Icon } from "@iconify/react";

interface Props {
    value: any;
    onChange: (v: number) => void;
    label?: string;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
}

export default function Slider({ value, onChange, label, min = 0, max = 100, step = 1, unit }: Props) {
    return (
        <div>
            {label && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>{label}</span>
                        <Icon icon="mdi:monitor" width="14" style={{ color: "#9ca3af" }} />
                    </div>
                    {unit && <span style={{ fontSize: "11px", color: "#d946ef", fontWeight: 600 }}>{unit}</span>}
                </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value ?? 0}
                    onChange={(e) => onChange(Number(e.target.value))}
                    style={{ flex: 1, accentColor: "#374151" }}
                />
                <input
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={value ?? 0}
                    onChange={(e) => onChange(Number(e.target.value))}
                    style={{
                        width: "56px",
                        padding: "4px 6px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "4px",
                        fontSize: "12px",
                        textAlign: "center",
                        outline: "none",
                    }}
                />
            </div>
        </div>
    );
}
