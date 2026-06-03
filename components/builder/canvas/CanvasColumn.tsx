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
    selectedElementId: string | null;
}

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
    selectedElementId,
}: Props) {
    const [hovered, setHovered] = useState(false);
    const hasNestedColumns = column.columns.length > 0;
    const hasElements = column.elements.length > 0;
    const isEmpty = !hasNestedColumns && !hasElements;

    // Column is sortable ONLY within its own row
    const { ref, handleRef, isDragging, isDropTarget } = useSortable({
        id: column.id,
        index,
        data: { dndType: "column", rowId, colPath: path },
        group: `columns-${rowId}`,
        type: "column",
        accept: ["column", "catalog", "element"],
    });

    const showControls = hovered || isSelected;
    const showDropIndicator = isDropTarget && !isDragging;

    // Border color
    let borderColor = "#e5e7eb";
    if (isDropTarget) borderColor = "#3b82f6";
    else if (isSelected) borderColor = "#6b7280";
    else if (hovered) borderColor = "#9ca3af";

    const handleEmptyClick = () => {
        if (isEmpty) onAddElement(rowId, path);
    };

    const w = getColumnWidth(column, device);

    return (
        <div
            ref={ref}
            onMouseEnter={(e) => { e.stopPropagation(); setHovered(true); }}
            onMouseLeave={() => setHovered(false)}
            onContextMenu={(e) => { e.stopPropagation(); onContextMenu(e, { type: "column", rowId, colPath: path }); }}
            className={`relative min-w-0 rounded transition-all duration-200 ${isDropTarget ? "bg-blue-500/5 shadow-[inset_0_0_0_2px_rgba(59,130,246,0.3)]" : "bg-transparent"
                } ${isDragging ? "opacity-35 scale-[0.98]" : "opacity-100 scale-100"}`}
            style={{
                flex: `0 0 auto`,
                width: `${w}%`,
                maxWidth: `${w}%`,
                minWidth: 0,
                boxSizing: "border-box" as const,
                border: `1px dashed ${borderColor}`,
            }}
        >
            {/* Drop indicator — thick blue line on left */}
            {showDropIndicator && (
                <div className="absolute top-[10%] bottom-[10%] -left-1 w-1 bg-blue-500 rounded-sm z-30 shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
            )}

            {/* Column toolbar — top left (visible on hover/selected, but handle always in DOM) */}
            <div className={`absolute top-0 left-0 z-10 flex transition-opacity ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onSelectColumn(rowId, path); }}
                    className={`flex items-center justify-center p-1 text-white border-none cursor-pointer ${isSelected ? "bg-gray-700" : "bg-gray-400"
                        }`}
                    title="Column settings"
                >
                    <Icon icon="mdi:monitor" width="10" />
                </button>
                <button
                    ref={handleRef}
                    type="button"
                    className="flex items-center justify-center p-1 hover:bg-gray-400 bg-gray-700 text-white border-none cursor-grab"
                    title="Drag to reorder"
                >
                    <Icon icon="iconamoon:move-thin" width="10" />
                </button>
            </div>

            {/* Content area — uses unified .bcol-{id} class from CanvasStyles */}
            <div
                className={`bcol-${column.id} ${isEmpty ? "cursor-pointer" : "cursor-default"}`}
                onClick={handleEmptyClick}
            >
                {hasNestedColumns ? (
                    column.columns.map((nested, idx) => (
                        <CanvasColumn
                            key={nested.id}
                            column={nested}
                            rowId={rowId}
                            path={[...path, idx]}
                            index={idx}
                            device={device}
                            onContextMenu={onContextMenu}
                            onSelectColumn={onSelectColumn}
                            onAddColumns={onAddColumns}
                            onAddElement={onAddElement}
                            onSelectElement={onSelectElement}
                            isSelected={false}
                            selectedElementId={selectedElementId}
                        />
                    ))
                ) : hasElements ? (
                    column.elements.map((el, elIdx) => (
                        <CanvasElement
                            key={el.id}
                            element={el}
                            index={elIdx}
                            rowId={rowId}
                            colPath={path}
                            isSelected={selectedElementId === el.id}
                            onSelect={() => onSelectElement(rowId, path, el.id)}
                            onContextMenu={(e) => onContextMenu(e, { type: "element", rowId, colPath: path, elementId: el.id })}
                        />
                    ))
                ) : (
                    <div className="flex items-center justify-center w-full min-h-[50px] text-gray-400">
                        <Icon icon="mdi:plus" width="22" />
                    </div>
                )}
            </div>
        </div>
    );
}
