"use client";

import { useSortable } from "@dnd-kit/react/sortable";
import { Icon } from "@iconify/react";
import { BuilderElement } from "../types";
import { getElementDef } from "../helpers";

interface Props {
    element: BuilderElement;
    index: number;
    rowId: string;
    colPath: number[];
    isSelected: boolean;
    onSelect: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
}

export default function CanvasElement({
    element,
    index,
    rowId,
    colPath,
    isSelected,
    onSelect,
    onContextMenu,
}: Props) {
    const def = getElementDef(element.type);

    const { ref, isDragging } = useSortable({
        id: element.id,
        index,
        data: { dndType: "element", rowId, colPath },
        group: "elements",
        type: "element",
        accept: ["element", "catalog"],
    });

    return (
        <div
            ref={ref}
            onClick={(e) => {
                e.stopPropagation();
                onSelect();
            }}
            onContextMenu={(e) => {
                e.stopPropagation();
                onContextMenu?.(e);
            }}
            className={`b-element group relative cursor-pointer rounded transition-all duration-200 animate-[fadeSlideIn_0.3s_ease-out] bel-${element.id} ${isDragging ? "opacity-40 scale-[0.97]" : "opacity-100 scale-100"}`}
        >
            {/* Hover border */}
            <div className="absolute inset-0 rounded pointer-events-none border border-transparent group-hover:border-fuchsia-200 transition-[border-color]" />

            {/* Edit button — visible on hover or when selected */}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect();
                }}
                className="absolute top-0 right-0 z-100 flex items-center justify-center w-6 h-6 rounded bg-fuchsia-400 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none"
                title="Edit"
            >
                <Icon icon="solar:pen-bold" width="12" />
            </button>

            {/* Element content — styles come from .bel-{id} class via CanvasStyles */}
            <div className="[&_a]:pointer-events-none [&_button]:pointer-events-none [&_input]:pointer-events-none">
                {def ? (
                    def.render(element)
                ) : (
                    <span className="text-xs text-red-500">Unknown: {element.type}</span>
                )}
            </div>
        </div>
    );
}
