"use client";

import { Icon } from "@iconify/react";
import Gallery from "@/components/Gallery";

interface Props {
    value: any;
    onChange: (v: string) => void;
    label?: string;
    multiple?: boolean;
}

export default function ImageGallery({ value, onChange, label, multiple = false }: Props) {
    return (
        <div>
            {label && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>{label}</span>
                        <Icon icon="mdi:image-multiple" width="14" style={{ color: "#9ca3af" }} />
                    </div>
                </div>
            )}
            <Gallery
                multiple={multiple}
                value={value}
                onChange={onChange}
                placeholder="Select image"
            />
        </div>
    );
}
