"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { Row, Device } from "../types";
import CanvasColumn from "./CanvasColumn";

interface Props {
    row: Row;
    index: number;
    device: Device;
    isSelected: boolean;
    onSelectRow: () => void;
    onDeleteRow: () => void;
    onContextMenu: (e: React.MouseEvent, target: { type: "row" | "column" | "element"; rowId: string; colPath?: number[]; elementId?: string }) => void;
    onSelectColumn: (rowId: string, path: number[]) => void;
    onAddColumns: (rowId: string, path: number[]) => void;
    onAddElement: (rowId: string, path: number[]) => void;
    onSelectElement: (rowId: string, colPath: number[], elementId: string) => void;
    selectedColumn: number[] | null;
    selectedElementId: string | null;
    selectedCarouselSlide?: { elementId: string; slideIndex: number } | null;
    selectedCarouselSlideElement?: { elementId: string; slideIndex: number; childElementId: string } | null;
    onSelectCarouselSlide?: (elementId: string, slideIndex: number) => void;
    onSelectCarouselSlideElement?: (elementId: string, slideIndex: number, childElementId: string) => void;
    onAddElementToCarouselSlide?: (elementId: string, slideIndex: number) => void;
    onDeleteCarouselSlideElement?: (carouselId: string, slideIndex: number, childId: string) => void;
    onContextMenuCarouselSlide?: (e: React.MouseEvent, carouselId: string, slideIndex: number, elementId: string | null) => void;
}

export default function CanvasRow({
    row,
    index,
    device,
    isSelected,
    onSelectRow,
    onDeleteRow,
    onContextMenu,
    onSelectColumn,
    onAddColumns,
    onAddElement,
    onSelectElement,
    selectedColumn,
    selectedElementId,
    selectedCarouselSlide,
    selectedCarouselSlideElement,
    onSelectCarouselSlide,
    onSelectCarouselSlideElement,
    onAddElementToCarouselSlide,
    onDeleteCarouselSlideElement,
    onContextMenuCarouselSlide,
}: Props) {
    const [hovered, setHovered] = useState(false);
    const s = row.schema;

    const { ref, handleRef, isDragging, isDropTarget } = useSortable({
        id: row.id,
        index,
        data: { dndType: "row" },
        group: "rows",
        type: "row",
        accept: ["row", "column", "catalog-section"],
    });

    const showControls = hovered || isSelected;
    const showDropIndicator = isDropTarget && !isDragging;

    return (
        <div
            ref={ref}
            data-row-id={row.id}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onContextMenu={(e) => onContextMenu(e, { type: "row", rowId: row.id })}
            className={`relative rounded transition-[opacity,border-color] ${isDragging ? "opacity-35" : "opacity-100"}`}
            style={{
                border: isSelected
                    ? "1px solid #d946ef"
                    : hovered
                        ? "1px dashed #c084fc"
                        : "1px dashed #e9d5ff",
                marginBottom: s.advanced.margin.bottom === 0 ? "20px" : undefined,
            }}
        >
            {/* Drop indicator — thick blue line at top */}
            {showDropIndicator && (
                <div className="absolute top-[-5px] left-[10%] right-[10%] h-1 bg-blue-500 rounded-sm z-30 shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
            )}

            {/* Row toolbar — top center (only on hover/selected) */}
            {showControls && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-px bg-purple-300 rounded px-1 py-0.5">
                    <button
                        type="button"
                        onClick={onSelectRow}
                        className="flex items-center justify-center w-[22px] h-[22px] bg-transparent text-purple-900 border-none cursor-pointer"
                        title="Row settings"
                    >
                        <Icon icon="mdi:plus" width="14" />
                    </button>
                    <button
                        ref={handleRef}
                        type="button"
                        className="flex items-center justify-center w-[22px] h-[22px] bg-transparent text-purple-900 border-none cursor-grab"
                        title="Drag to reorder"
                    >
                        <Icon icon="mdi:dots-grid" width="14" />
                    </button>
                    <button
                        type="button"
                        onClick={onDeleteRow}
                        className="flex items-center justify-center w-[22px] h-[22px] bg-transparent text-purple-900 border-none cursor-pointer"
                        title="Delete row"
                    >
                        <Icon icon="mdi:close" width="14" />
                    </button>
                </div>
            )}

            {/* Row outer — full-width, background via .brow-{id} */}
            <div className={`brow-${row.id}`}>
                {/* Background overlay */}
                {s.style.backgroundOverlay.enabled && (
                    <div
                        className="absolute inset-0 pointer-events-none rounded-[inherit]"
                        style={{
                            background: (s.style.backgroundOverlay as any).normal?.color || "rgba(0,0,0,0.5)",
                            opacity: (s.style.backgroundOverlay as any).normal?.opacity ?? 0.5,
                        }}
                    />
                )}

                {/* Row inner — max-width + flex layout via .brow-{id}-inner */}
                <div className={`brow-${row.id}-inner`}>
                    {row.columns.map((col, idx) => (
                        <CanvasColumn
                            key={col.id}
                            column={col}
                            rowId={row.id}
                            path={[idx]}
                            index={idx}
                            device={device}
                            onContextMenu={onContextMenu}
                            onSelectColumn={onSelectColumn}
                            onAddColumns={onAddColumns}
                            onAddElement={onAddElement}
                            onSelectElement={onSelectElement}
                            isSelected={
                                selectedColumn !== null &&
                                JSON.stringify(selectedColumn) === JSON.stringify([idx])
                            }
                            selectedColumn={selectedColumn}
                            selectedElementId={selectedElementId}
                            selectedCarouselSlideIndex={selectedCarouselSlide?.elementId ? selectedCarouselSlide.slideIndex : undefined}
                            selectedCarouselSlideElementId={selectedCarouselSlideElement?.childElementId}
                            onSelectCarouselSlide={onSelectCarouselSlide}
                            onSelectCarouselSlideElement={onSelectCarouselSlideElement}
                            onAddElementToCarouselSlide={onAddElementToCarouselSlide}
                            onDeleteCarouselSlideElement={onDeleteCarouselSlideElement}
                            onContextMenuCarouselSlide={onContextMenuCarouselSlide}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
