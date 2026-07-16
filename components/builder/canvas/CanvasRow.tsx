"use client";

import { useState, useId } from "react";
import { Icon } from "@iconify/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { Row, Device } from "../types";
import CanvasColumn from "./CanvasColumn";
import { SHAPES } from "../controls/ShapeDivider";

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
            <div id={(row.schema.advanced as any)?.cssID || undefined} className={`brow-${row.id}${(row.schema.advanced as any)?.cssClasses ? " " + (row.schema.advanced as any).cssClasses : ""}`}>
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

                {/* Shape Divider */}
                <RenderShapeDivider divider={s.style?.shapeDivider} />
            </div>
        </div>
    );
}

function RenderShapeDivider({ divider }: { divider: any }) {
    if (!divider || !divider.enabled) return null;
    const shapeKey = divider.shape || "wave";
    const shape = SHAPES[shapeKey];
    if (!shape) return null;

    const pos = divider.position || "bottom";
    const height = divider.height ?? 100;
    const width = divider.width ?? 100;
    
    let scaleX = divider.flip ? -1 : 1;
    let scaleY = divider.invert ? -1 : 1;
    if (pos === "top") scaleY *= -1;

    const gradId = useId().replace(/:/g, "-");
    const isGradient = divider.colorType === "gradient";
    const fill = isGradient ? `url(#${gradId})` : (divider.color || "#ffffff");

    // CSS angle to SVG linearGradient coords mapping
    let gradCoords = { x1: "0%", y1: "0%", x2: "0%", y2: "100%" };
    if (isGradient && divider.gradient) {
        const angle = divider.gradient.angle ?? 180;
        const dx = Math.sin((angle * Math.PI) / 180);
        const dy = -Math.cos((angle * Math.PI) / 180);
        gradCoords = {
            x1: `${Math.round(50 - dx * 50)}%`,
            y1: `${Math.round(50 - dy * 50)}%`,
            x2: `${Math.round(50 + dx * 50)}%`,
            y2: `${Math.round(50 + dy * 50)}%`,
        };
    }

    return (
        <div
            style={{
                position: "absolute",
                left: 0,
                right: 0,
                [pos]: 0,
                height: `${height}px`,
                overflow: "hidden",
                lineHeight: 0,
                zIndex: divider.bringToFront ? 10 : 0,
                pointerEvents: "none",
                transform: "translate3d(0,0,0)",
                opacity: divider.opacity ?? 1,
            }}
        >
            <svg
                viewBox={shape.viewBox}
                preserveAspectRatio="none"
                style={{
                    width: `${width}%`,
                    height: "100%",
                    display: "block",
                    position: "relative",
                    left: "50%",
                    transform: `translateX(-50%) scale(${scaleX}, ${scaleY})`,
                }}
            >
                {isGradient && divider.gradient && (
                    <defs>
                        <linearGradient
                            id={gradId}
                            x1={gradCoords.x1}
                            y1={gradCoords.y1}
                            x2={gradCoords.x2}
                            y2={gradCoords.y2}
                        >
                            <stop offset={`${divider.gradient.location1 ?? 0}%`} stopColor={divider.gradient.color1 || "#ffffff"} />
                            <stop offset={`${divider.gradient.location2 ?? 100}%`} stopColor={divider.gradient.color2 || "#f5f5f5"} />
                        </linearGradient>
                    </defs>
                )}
                <path d={shape.path} fill={fill} />
            </svg>
        </div>
    );
}
