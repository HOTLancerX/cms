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
                <span className="text-sm font-medium text-gray-700">{label}</span>
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
