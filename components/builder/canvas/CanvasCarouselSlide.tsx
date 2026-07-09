"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { useDroppable } from "@dnd-kit/react";
import { BuilderElement } from "../types";
import { getElementDef } from "../helpers";

interface Props {
    slide: { id: string; label: string; elements: BuilderElement[] };
    slideIndex: number;
    carouselId: string;
    rowId: string;
    colPath: number[];
    isSelected: boolean;
    onSelect: () => void;
    onAddElement: (carouselId: string, slideIndex: number) => void;
    onSelectElement: (carouselId: string, slideIndex: number, elementId: string) => void;
    onDeleteElement?: (carouselId: string, slideIndex: number, elementId: string) => void;
    onContextMenu?: (e: React.MouseEvent, carouselId: string, slideIndex: number, elementId: string | null) => void;
    selectedElementId: string | null;
    onUpdateSlideElements: (carouselId: string, slideIndex: number, elements: BuilderElement[]) => void;
}

export default function CanvasCarouselSlide({
    slide,
    slideIndex,
    carouselId,
    rowId,
    colPath,
    isSelected,
    onSelect,
    onAddElement,
    onSelectElement,
    onDeleteElement,
    onContextMenu,
    selectedElementId,
    onUpdateSlideElements,
}: Props) {
    const [hovered, setHovered] = useState(false);

    const { ref, isDropTarget } = useDroppable({
        id: `carousel-slide-${carouselId}-${slideIndex}`,
        data: {
            dndType: "carousel-slide",
            carouselId,
            slideIndex,
            rowId,
            colPath,
        },
        accept: ["element", "catalog"],
    });

    const isEmpty = slide.elements.length === 0;
    const showControls = hovered || isSelected;

    let borderColor = "#e5e7eb";
    if (isDropTarget) borderColor = "#3b82f6";
    else if (isSelected) borderColor = "#8b5cf6";
    else if (hovered) borderColor = "#9ca3af";

    const handleEmptyClick = () => {
        if (isEmpty) onAddElement(carouselId, slideIndex);
    };

    return (
        <div
            ref={ref}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={(e) => {
                e.stopPropagation();
                onSelect();
            }}
            onContextMenu={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onContextMenu?.(e, carouselId, slideIndex, null);
            }}
            className={`relative shrink-0 min-w-0 rounded transition-all duration-200 ${
                isDropTarget ? "bg-blue-500/5" : "bg-transparent"
            } ${isSelected ? "ring-2 ring-purple-400" : ""}`}
            style={{
                flex: `0 0 ${100 / 3}%`,
                border: `1px dashed ${borderColor}`,
                boxSizing: "border-box",
            }}
        >
            {isDropTarget && (
                <div className="absolute top-[10%] bottom-[10%] -left-1 w-1 bg-blue-500 rounded-sm z-30 shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
            )}

            {/* Slide toolbar */}
            <div className={`absolute top-0 left-0 right-0 z-10 flex items-center justify-between transition-opacity ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect();
                    }}
                    className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-white border-none cursor-pointer ${
                        isSelected ? "bg-purple-500" : "bg-gray-500"
                    }`}
                >
                    <Icon icon="mdi:view-carousel-outline" width="10" />
                    {slide.label}
                </button>
                <div className="flex items-center gap-px">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect();
                        }}
                        className="flex items-center justify-center w-5 h-5 bg-gray-400 hover:bg-gray-500 text-white border-none cursor-pointer"
                        title="Slide settings"
                    >
                        <Icon icon="mdi:monitor" width="10" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddElement(carouselId, slideIndex);
                        }}
                        className="flex items-center justify-center w-5 h-5 bg-gray-700 hover:bg-gray-600 text-white border-none cursor-pointer"
                        title="Add element"
                    >
                        <Icon icon="mdi:plus" width="10" />
                    </button>
                </div>
            </div>

            {/* Content area */}
            <div
                className={`p-2 pt-6 min-h-[80px] ${isEmpty ? "cursor-pointer" : "cursor-default"}`}
                onClick={handleEmptyClick}
            >
                {isEmpty ? (
                    <div className="flex flex-col items-center justify-center w-full h-full min-h-[60px] text-gray-400 gap-1">
                        <Icon icon="mdi:plus-circle-outline" width="24" />
                        <span className="text-[11px]">Drag widget here</span>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {slide.elements.map((el, elIdx) => (
                            <SlideElement
                                key={el.id}
                                element={el}
                                index={elIdx}
                                isSelected={selectedElementId === el.id}
                                onSelect={(e) => {
                                    e.stopPropagation();
                                    onSelectElement(carouselId, slideIndex, el.id);
                                }}
                                onDelete={() => onDeleteElement?.(carouselId, slideIndex, el.id)}
                                onContextMenu={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    onContextMenu?.(e, carouselId, slideIndex, el.id);
                                }}
                            />
                        ))}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddElement(carouselId, slideIndex);
                            }}
                            className="w-full flex items-center justify-center py-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                            <Icon icon="mdi:plus" width="16" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function SlideElement({
    element,
    index,
    isSelected,
    onSelect,
    onDelete,
    onContextMenu,
}: {
    element: BuilderElement;
    index: number;
    isSelected: boolean;
    onSelect: (e: React.MouseEvent) => void;
    onDelete: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
}) {
    const [hovered, setHovered] = useState(false);
    const def = getElementDef(element.type);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(e);
            }}
            onContextMenu={onContextMenu}
            className={`relative group rounded transition-all duration-150 cursor-pointer ${
                isSelected ? "ring-2 ring-purple-400" : ""
            } ${hovered ? "ring-1 ring-gray-300" : ""}`}
        >
            {/* Element toolbar */}
            <div
                className={`absolute top-0 right-0 z-10 flex items-center transition-opacity ${
                    hovered || isSelected ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
            >
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect(e);
                    }}
                    className={`flex items-center justify-center w-5 h-5 text-white border-none cursor-pointer ${
                        isSelected ? "bg-purple-400" : "bg-fuchsia-400"
                    }`}
                    title="Edit"
                >
                    <Icon icon="solar:pen-bold" width="10" />
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="flex items-center justify-center w-5 h-5 bg-red-400 hover:bg-red-500 text-white border-none cursor-pointer"
                    title="Delete"
                >
                    <Icon icon="mdi:close" width="10" />
                </button>
            </div>

            {/* Element content */}
            <div className="[&_a]:pointer-events-none [&_input]:pointer-events-none">
                {def ? (
                    def.render(element)
                ) : (
                    <span className="text-xs text-red-500">Unknown: {element.type}</span>
                )}
            </div>
        </div>
    );
}
