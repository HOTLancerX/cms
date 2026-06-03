"use client";

import { Icon } from "@iconify/react";

interface Props {
    value: any;
    onChange: (v: string) => void;
    label?: string;
}

export default function ImageUpload({ value, onChange, label }: Props) {
    return (
        <div>
            {label && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>{label}</span>
                        <Icon icon="mdi:monitor" width="14" style={{ color: "#9ca3af" }} />
                    </div>
                    <Icon icon="mdi:auto-fix" width="14" style={{ color: "#d946ef" }} />
                </div>
            )}
            {value ? (
                <div style={{ position: "relative", borderRadius: "4px", overflow: "hidden" }}>
                    <img src={value} alt="" style={{ width: "100%", height: "120px", objectFit: "cover" }} />
                    <button
                        type="button"
                        onClick={() => onChange("")}
                        style={{
                            position: "absolute",
                            top: "4px",
                            right: "4px",
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            background: "rgba(0,0,0,0.6)",
                            color: "#fff",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Icon icon="mdi:close" width="14" />
                    </button>
                </div>
            ) : (
                <div
                    onClick={() => {
                        const url = prompt("Enter image URL:");
                        if (url) onChange(url);
                    }}
                    style={{
                        width: "100%",
                        height: "120px",
                        background: "#e5e7eb",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                    }}
                >
                    <Icon icon="mdi:plus-circle" width="28" style={{ color: "#fff" }} />
                </div>
            )}
        </div>
    );
}
