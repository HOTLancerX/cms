"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { Column, Device } from "../types";
import { getColumnWidth } from "../device";
import CanvasElement from "./CanvasElement";

interface Props {
    column: Column;
    rowId: string;
    path: number[];
    index: number;
    device: Device;
    onContextMenu: (e: React.MouseEvent, target: { type: "row" | "column" | "element"; rowId: string; colPath?: number[]; elementId?: string }) => void;
    onSelectColumn: (rowId: string, path: number[]) => void;
    onAddColumns: (rowId: string, path: number[]) => void;
    onAddElement: (rowId: string, path: number[]) => void;
    onSelectElement: (rowId: string, colPath: number[], elementId: string) => void;
    isSelected: boolean;
    /** Full selected column path for nested selection highlighting */
    selectedColumn?: number[] | null;
    selectedElementId: string | null;
    selectedCarouselSlideIndex?: number | null;
    selectedCarouselSlideElementId?: string | null;
    onSelectCarouselSlide?: (carouselId: string, slideIndex: number) => void;
    onSelectCarouselSlideElement?: (carouselId: string, slideIndex: number, childId: string) => void;
    onAddElementToCarouselSlide?: (carouselId: string, slideIndex: number) => void;
    onDeleteCarouselSlideElement?: (carouselId: string, slideIndex: number, childId: string) => void;
    onContextMenuCarouselSlide?: (e: React.MouseEvent, carouselId: string, slideIndex: number, elementId: string | null) => void;
}

/**
 * Elementor-style Container (Column).
 *
 * Structure at every depth:
 *   columns[columns[], elements[]]
 * Nested containers + widgets are siblings; nesting is unlimited.
 */
export default function CanvasColumn({
    column,
    rowId,
    path,
    index,
    device,
    onContextMenu,
    onSelectColumn,
    onAddColumns,
    onAddElement,
    onSelectElement,
    isSelected,
    selectedColumn = null,
    selectedElementId,
    selectedCarouselSlideIndex,
    selectedCarouselSlideElementId,
    onSelectCarouselSlide,
    onSelectCarouselSlideElement,
    onAddElementToCarouselSlide,
    onDeleteCarouselSlideElement,
    onContextMenuCarouselSlide,
}: Props) {
    const [hovered, setHovered] = useState(false);
    const nested = column.columns || [];
    const widgets = column.elements || [];
    const hasNestedColumns = nested.length > 0;
    const hasElements = widgets.length > 0;
    const isEmpty = !hasNestedColumns && !hasElements;

    // Sibling group scoped by parent path so nested reorder stays local
    const parentKey = path.length <= 1 ? "root" : path.slice(0, -1).join("-");

    const { ref, handleRef, isDragging, isDropTarget } = useSortable({
        id: column.id,
        index,
        data: { dndType: "column", rowId, colPath: path },
        group: `cols-${rowId}-${parentKey}`,
        type: "column",
        accept: ["column", "catalog", "element"],
    });

    const showControls = hovered || isSelected;
    const showDropIndicator = isDropTarget && !isDragging;

    let borderColor = "#e5e7eb";
    if (isDropTarget) borderColor = "#3b82f6";
    else if (isSelected) borderColor = "#93003c"; // Elementor-ish accent
    else if (hovered) borderColor = "#9ca3af";

    const handleEmptyClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isEmpty) onAddElement(rowId, path);
    };

    const w = getColumnWidth(column, device);

    return (
        <div
            ref={ref}
            onMouseEnter={(e) => { e.stopPropagation(); setHovered(true); }}
            onMouseLeave={() => setHovered(false)}
            onClick={(e) => {
                // Click empty padding / chrome selects this container (Elementor)
                if (e.target === e.currentTarget) {
                    e.stopPropagation();
                    onSelectColumn(rowId, path);
                }
            }}
            onContextMenu={(e) => { e.stopPropagation(); onContextMenu(e, { type: "column", rowId, colPath: path }); }}
            id={(column.schema.advanced as any)?.cssID || undefined}
            className={`relative min-w-0 rounded transition-all duration-200 ${isDropTarget ? "bg-blue-500/5 shadow-[inset_0_0_0_2px_rgba(59,130,246,0.3)]" : "bg-transparent"
                } ${isDragging ? "opacity-35 scale-[0.98]" : "opacity-100 scale-100"}${(column.schema.advanced as any)?.cssClasses ? " " + (column.schema.advanced as any).cssClasses : ""}`}
            style={{
                flex: `0 0 auto`,
                width: `${w}%`,
                maxWidth: `${w}%`,
                minWidth: 0,
                boxSizing: "border-box" as const,
                border: `1px dashed ${borderColor}`,
            }}
        >
            {showDropIndicator && (
                <div className="absolute top-[10%] bottom-[10%] -left-1 w-1 bg-blue-500 rounded-sm z-30 shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
            )}

            {/* Elementor-style container toolbar */}
            <div
                className={`absolute top-0 left-0 z-20 flex transition-opacity ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            >
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onSelectColumn(rowId, path); }}
                    className={`flex items-center justify-center p-1 text-white border-none cursor-pointer ${isSelected ? "bg-[#93003c]" : "bg-gray-600"}`}
                    title="Edit Container"
                >
                    <Icon icon="mdi:pencil" width="11" />
                </button>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onAddElement(rowId, path); }}
                    className="flex items-center justify-center p-1 bg-gray-700 text-white border-none cursor-pointer hover:bg-gray-600"
                    title="Add Element"
                >
                    <Icon icon="mdi:plus" width="11" />
                </button>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onAddColumns(rowId, path); }}
                    className="flex items-center justify-center p-1 bg-gray-700 text-white border-none cursor-pointer hover:bg-gray-600"
                    title="Add Nested Structure"
                >
                    <Icon icon="mdi:view-column-outline" width="11" />
                </button>
                <button
                    ref={handleRef}
                    type="button"
                    className="flex items-center justify-center p-1 bg-gray-800 text-white border-none cursor-grab hover:bg-gray-700"
                    title="Drag Container"
                >
                    <Icon icon="iconamoon:move-thin" width="11" />
                </button>
            </div>

            {/* Content: nested containers + widgets (siblings, unlimited depth) */}
            <div
                className={`bcol-${column.id} ${isEmpty ? "cursor-pointer" : "cursor-default"}`}
                onClick={handleEmptyClick}
            >
                {hasNestedColumns &&
                    nested.map((child, idx) => {
                        const nestedPath = [...path, idx];
                        return (
                            <CanvasColumn
                                key={child.id}
                                column={child}
                                rowId={rowId}
                                path={nestedPath}
                                index={idx}
                                device={device}
                                onContextMenu={onContextMenu}
                                onSelectColumn={onSelectColumn}
                                onAddColumns={onAddColumns}
                                onAddElement={onAddElement}
                                onSelectElement={onSelectElement}
                                isSelected={
                                    selectedColumn !== null &&
                                    JSON.stringify(selectedColumn) === JSON.stringify(nestedPath)
                                }
                                selectedColumn={selectedColumn}
                                selectedElementId={selectedElementId}
                                selectedCarouselSlideIndex={selectedCarouselSlideIndex}
                                selectedCarouselSlideElementId={selectedCarouselSlideElementId}
                                onSelectCarouselSlide={onSelectCarouselSlide}
                                onSelectCarouselSlideElement={onSelectCarouselSlideElement}
                                onAddElementToCarouselSlide={onAddElementToCarouselSlide}
                                onDeleteCarouselSlideElement={onDeleteCarouselSlideElement}
                                onContextMenuCarouselSlide={onContextMenuCarouselSlide}
                            />
                        );
                    })}

                {hasElements &&
                    widgets.map((el, elIdx) => (
                        <CanvasElement
                            key={el.id}
                            element={el}
                            index={elIdx}
                            rowId={rowId}
                            colPath={path}
                            isSelected={selectedElementId === el.id}
                            onSelect={() => onSelectElement(rowId, path, el.id)}
                            onContextMenu={(e) => onContextMenu(e, { type: "element", rowId, colPath: path, elementId: el.id })}
                            selectedSlideIndex={el.type === "carousel" ? selectedCarouselSlideIndex : undefined}
                            selectedSlideElementId={el.type === "carousel" ? selectedCarouselSlideElementId : undefined}
                            onSelectSlide={el.type === "carousel" ? (slideIdx) => {
                                if (selectedElementId !== el.id) onSelectElement(rowId, path, el.id);
                                onSelectCarouselSlide?.(el.id, slideIdx);
                            } : undefined}
                            onSelectSlideElement={el.type === "carousel" ? (slideIdx, elId) => {
                                if (selectedElementId !== el.id) onSelectElement(rowId, path, el.id);
                                onSelectCarouselSlideElement?.(el.id, slideIdx, elId);
                            } : undefined}
                            onAddElementToSlide={el.type === "carousel" ? (slideIdx) => {
                                if (selectedElementId !== el.id) onSelectElement(rowId, path, el.id);
                                onAddElementToCarouselSlide?.(el.id, slideIdx);
                            } : undefined}
                            onDeleteSlideElement={el.type === "carousel" ? (slideIdx, elId) => {
                                onDeleteCarouselSlideElement?.(el.id, slideIdx, elId);
                            } : undefined}
                            onContextMenuSlide={el.type === "carousel" ? (e, slideIdx, elId) => {
                                onContextMenuCarouselSlide?.(e, el.id, slideIdx, elId);
                            } : undefined}
                        />
                    ))}

                {isEmpty && (
                    <div className="flex flex-col items-center justify-center w-full min-h-[80px] text-gray-400 gap-1.5 py-4">
                        <Icon icon="mdi:plus-circle-outline" width="28" className="text-gray-300" />
                        <span className="text-[11px] font-medium">Drag widget here</span>
                        <div className="flex items-center gap-2 mt-1">
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onAddElement(rowId, path); }}
                                className="text-[10px] px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 border-none cursor-pointer"
                            >
                                + Widget
                            </button>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onAddColumns(rowId, path); }}
                                className="text-[10px] px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 border-none cursor-pointer"
                            >
                                + Structure
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
