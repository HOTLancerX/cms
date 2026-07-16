"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/react/sortable";
import { Icon } from "@iconify/react";
import { BuilderElement } from "../types";
import { getElementDef } from "../helpers";
import CanvasCarouselSlide from "./CanvasCarouselSlide";

interface Props {
    element: BuilderElement;
    index: number;
    rowId: string;
    colPath: number[];
    isSelected: boolean;
    onSelect: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    selectedSlideIndex?: number | null;
    selectedSlideElementId?: string | null;
    onSelectSlide?: (slideIndex: number) => void;
    onSelectSlideElement?: (slideIndex: number, elementId: string) => void;
    onAddElementToSlide?: (slideIndex: number) => void;
    onUpdateSlideElements?: (slideIndex: number, elements: BuilderElement[]) => void;
    onDeleteSlideElement?: (slideIndex: number, elementId: string) => void;
    onContextMenuSlide?: (e: React.MouseEvent, slideIndex: number, elementId: string | null) => void;
}

export default function CanvasElement({
    element,
    index,
    rowId,
    colPath,
    isSelected,
    onSelect,
    onContextMenu,
    selectedSlideIndex,
    selectedSlideElementId,
    onSelectSlide,
    onSelectSlideElement,
    onAddElementToSlide,
    onUpdateSlideElements,
    onDeleteSlideElement,
    onContextMenuSlide,
}: Props) {
    const def = getElementDef(element.type);
    const isCarousel = element.type === "carousel";

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
            id={element.schema.advanced?.cssID || undefined}
            className={`b-element group relative cursor-pointer rounded transition-all duration-200 animate-[fadeSlideIn_0.3s_ease-out] bel-${element.id} ${isDragging ? "opacity-40 scale-[0.97]" : "opacity-100 scale-100"}${element.schema.advanced?.cssClasses ? " " + element.schema.advanced.cssClasses : ""}`}
        >
            {/* Hover border */}
            <div className="absolute inset-0 rounded pointer-events-none border border-transparent group-hover:border-fuchsia-200 transition-[border-color]" />

            {/* Edit button */}
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

            {/* Element content */}
            {isCarousel ? (
                <CarouselCanvasContent
                    element={element}
                    rowId={rowId}
                    colPath={colPath}
                    selectedSlideIndex={selectedSlideIndex}
                    selectedSlideElementId={selectedSlideElementId}
                    onSelectSlide={onSelectSlide}
                    onSelectSlideElement={onSelectSlideElement}
                    onAddElementToSlide={onAddElementToSlide}
                    onUpdateSlideElements={onUpdateSlideElements}
                    onDeleteSlideElement={onDeleteSlideElement}
                    onContextMenuSlide={onContextMenuSlide}
                />
            ) : (
                <div className="[&_a]:pointer-events-none [&_button]:pointer-events-none [&_input]:pointer-events-none">
                    {def ? (
                        def.render(element)
                    ) : (
                        <span className="text-xs text-red-500">Unknown: {element.type}</span>
                    )}
                </div>
            )}
        </div>
    );
}

// Carousel-specific canvas content — reads ALL schema values dynamically
function CarouselCanvasContent({
    element,
    rowId,
    colPath,
    selectedSlideIndex,
    selectedSlideElementId,
    onSelectSlide,
    onSelectSlideElement,
    onAddElementToSlide,
    onUpdateSlideElements,
    onDeleteSlideElement,
    onContextMenuSlide,
}: {
    element: BuilderElement;
    rowId: string;
    colPath: number[];
    selectedSlideIndex?: number | null;
    selectedSlideElementId?: string | null;
    onSelectSlide?: (slideIndex: number) => void;
    onSelectSlideElement?: (slideIndex: number, elementId: string) => void;
    onAddElementToSlide?: (slideIndex: number) => void;
    onUpdateSlideElements?: (slideIndex: number, elements: BuilderElement[]) => void;
    onDeleteSlideElement?: (slideIndex: number, elementId: string) => void;
    onContextMenuSlide?: (e: React.MouseEvent, slideIndex: number, elementId: string | null) => void;
}) {
    const s = element.schema;
    const slides = s?.content?.slides || [];
    const slidesOnDisplay = parseInt(s?.content?.slidesOnDisplay?._v || "3");
    const nav = s?.navigation || {};
    const pagination = s?.pagination || {};
    const style = s?.style || {};
    const slideGap = style.slides?.gap ?? 10;
    const slidePadding = style.slides?.padding;
    const slideBorder = style.slides?.border;

    const navBg = style.navigation?.background?.normal?.color || "rgba(0,0,0,0.5)";
    const navHoverBg = style.navigation?.background?.hover?.color || "rgba(0,0,0,0.8)";
    const navIconSize = style.navigation?.iconSize || 20;
    const navIconColor = style.navigation?.normalColor || "#ffffff";
    const navBorderRadius = style.navigation?.border?.normal?.radius || { top: 50, right: 50, bottom: 50, left: 50, unit: "px" };
    const navPadding = style.navigation?.padding || { top: 8, right: 8, bottom: 8, left: 8, unit: "px" };
    const navPosition = style.navigation?.position || "inside";

    const paginationType = pagination.paginationType || "dots";
    const dotSize = pagination.dotSize || 10;
    const dotSpacing = pagination.dotSpaceBetween || 8;
    const dotNormalColor = pagination.normalColor || "#cccccc";
    const dotHoverColor = pagination.hoverColor || "#333333";

    const paginationPadding = navPosition === "inside" ? "pb-8" : "pb-2";
    const navPaddingStyle = `${navPadding.top}${navPadding.unit || "px"} ${navPadding.right}${navPadding.unit || "px"} ${navPadding.bottom}${navPadding.unit || "px"} ${navPadding.left}${navPadding.unit || "px"}`;
    const navRadiusStyle = `${navBorderRadius.top}${navBorderRadius.unit || "px"} ${navBorderRadius.right}${navBorderRadius.unit || "px"} ${navBorderRadius.bottom}${navBorderRadius.unit || "px"} ${navBorderRadius.left}${navBorderRadius.unit || "px"}`;
    const slidePaddingStyle = slidePadding ? `${slidePadding.top}${slidePadding.unit || "px"} ${slidePadding.right}${slidePadding.unit || "px"} ${slidePadding.bottom}${slidePadding.unit || "px"} ${slidePadding.left}${slidePadding.unit || "px"}` : undefined;
    const slideBorderStyle = slideBorder?.normal?.type ? `1px solid ${slideBorder.normal.color || "#000"}` : undefined;
    const slideRadiusStyle = slideBorder?.normal?.radius ? `${slideBorder.normal.radius.top}${slideBorder.normal.radius.unit || "px"} ${slideBorder.normal.radius.right}${slideBorder.normal.radius.unit || "px"} ${slideBorder.normal.radius.bottom}${slideBorder.normal.radius.unit || "px"} ${slideBorder.normal.radius.left}${slideBorder.normal.radius.unit || "px"}` : undefined;

    return (
        <div className="relative" style={{ padding: navPosition === "inside" ? `0 ${navPadding.left}${navPadding.unit || "px"}` : undefined }}>
            {/* Carousel header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
                <Icon icon="mdi:view-carousel-outline" width="16" className="text-gray-500" />
                <span className="text-[13px] font-medium text-gray-700">
                    {s?.content?.carouselName || "Carousel"}
                </span>
                <span className="text-[11px] text-gray-400">
                    ({slides.length} slides)
                </span>
            </div>

            <div className={`relative ${paginationType !== "none" ? paginationPadding : ""}`}>
                {/* Previous arrow */}
                {nav.showArrows && (
                    <button
                        type="button"
                        className="absolute z-20 flex items-center justify-center text-white transition-colors"
                        style={{
                            background: navBg,
                            padding: navPaddingStyle,
                            borderRadius: navRadiusStyle,
                            fontSize: navIconSize,
                            color: navIconColor,
                            ...(navPosition === "inside" ? { top: "50%", transform: "translateY(-50%)" } : { top: "40%", transform: "translateY(-50%)" }),
                            left: navPosition === "inside" ? "4px" : "-20px",
                            width: `${navIconSize + navPadding.left + navPadding.right}px`,
                            height: `${navIconSize + navPadding.top + navPadding.bottom}px`,
                        }}
                    >
                        <Icon icon={nav.prevIcon || "mdi:chevron-left"} width={navIconSize} />
                    </button>
                )}

                {/* Slides container */}
                <div className="flex overflow-hidden py-2" style={{ gap: `${slideGap}px` }}>
                    {slides.map((slide: any, idx: number) => (
                        <div
                            key={slide.id}
                            style={{
                                flex: `0 0 calc(${100 / slidesOnDisplay}% - ${slideGap * (slidesOnDisplay - 1) / slidesOnDisplay}px)`,
                                padding: slidePaddingStyle,
                                background: style.slides?.background?.normal?.type === "color" ? style.slides.background.normal.color : undefined,
                                border: slideBorderStyle,
                                borderRadius: slideRadiusStyle,
                            }}
                        >
                            <CanvasCarouselSlide
                                slide={slide}
                                slideIndex={idx}
                                carouselId={element.id}
                                rowId={rowId}
                                colPath={colPath}
                                isSelected={selectedSlideIndex === idx}
                                onSelect={() => onSelectSlide?.(idx)}
                                onAddElement={(carouselId, slideIdx) => onAddElementToSlide?.(slideIdx)}
                                onSelectElement={(carouselId, slideIdx, elementId) =>
                                    onSelectSlideElement?.(slideIdx, elementId)
                                }
                                onDeleteElement={(carouselId, slideIdx, elementId) =>
                                    onDeleteSlideElement?.(slideIdx, elementId)
                                }
                                onContextMenu={(e, carouselId, slideIdx, elementId) =>
                                    onContextMenuSlide?.(e, slideIdx, elementId)
                                }
                                selectedElementId={selectedSlideIndex === idx ? selectedSlideElementId : null}
                                onUpdateSlideElements={(carouselId, slideIdx, elements) =>
                                    onUpdateSlideElements?.(slideIdx, elements)
                                }
                            />
                        </div>
                    ))}
                </div>

                {/* Next arrow */}
                {nav.showArrows && (
                    <button
                        type="button"
                        className="absolute z-20 flex items-center justify-center text-white transition-colors"
                        style={{
                            background: navBg,
                            padding: navPaddingStyle,
                            borderRadius: navRadiusStyle,
                            fontSize: navIconSize,
                            color: navIconColor,
                            ...(navPosition === "inside" ? { top: "50%", transform: "translateY(-50%)" } : { top: "40%", transform: "translateY(-50%)" }),
                            right: navPosition === "inside" ? "4px" : "-20px",
                            width: `${navIconSize + navPadding.left + navPadding.right}px`,
                            height: `${navIconSize + navPadding.top + navPadding.bottom}px`,
                        }}
                    >
                        <Icon icon={nav.nextIcon || "mdi:chevron-right"} width={navIconSize} />
                    </button>
                )}
            </div>

            {/* Pagination */}
            {paginationType === "dots" && (
                <div className="flex justify-center items-center" style={{ gap: `${dotSpacing}px`, paddingBottom: "8px" }}>
                    {slides.map((_: any, idx: number) => (
                        <div
                            key={idx}
                            className="rounded-full transition-all"
                            style={{
                                width: `${idx === 0 ? dotSize * 1.6 : dotSize}px`,
                                height: `${dotSize}px`,
                                background: idx === 0 ? dotHoverColor : dotNormalColor,
                            }}
                        />
                    ))}
                </div>
            )}

            {paginationType === "fraction" && (
                <div className="flex justify-center pb-2">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">1 / {slides.length}</span>
                </div>
            )}

            {paginationType === "progressbar" && (
                <div className="px-4 pb-2">
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${100 / slides.length}%` }} />
                    </div>
                </div>
            )}

            {/* Add slide button */}
            <div className="flex justify-center py-2 border-t border-gray-100">
                <button
                    type="button"
                    className="flex items-center gap-1 px-3 py-1 text-[11px] text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded cursor-pointer transition-colors"
                >
                    <Icon icon="mdi:plus" width="12" />
                    Add Slide
                </button>
            </div>
        </div>
    );
}
