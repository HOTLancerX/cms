"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { DragDropProvider } from "@dnd-kit/react";
import { Row, Column, Selection, LeftPanelMode, Device } from "./types";
import { getColumnByPath, uid, isContainerType, getElementDef } from "./helpers";
import { xFetch } from "@/lib/express";
import { reregisterHooks } from "@/hook/PluginList";
import { getBuilderElement } from "@/hook";

function CanvasIframe({
    children,
    head,
    className,
    style,
}: {
    children: React.ReactNode;
    head?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}) {
    const [iframeBody, setIframeBody] = useState<HTMLElement | null>(null);
    const [iframeHead, setIframeHead] = useState<HTMLElement | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const syncHeadStyles = useCallback((doc: Document) => {
        if (!doc || !doc.head) return;

        let baseStyle = doc.head.querySelector("#iframe-base-style");
        if (!baseStyle) {
            baseStyle = doc.createElement("style");
            baseStyle.id = "iframe-base-style";
            baseStyle.textContent = `
                html, body {
                    margin: 0;
                    padding: 0;
                    background: transparent;
                    width: 100%;
                    min-height: 100%;
                    box-sizing: border-box;
                    font-family: inherit;
                    overflow-y: auto;
                    overflow-x: hidden;
                }
                * {
                    box-sizing: border-box;
                }
            `;
            doc.head.appendChild(baseStyle);
        }

        const parentStyles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"));
        parentStyles.forEach((node, index) => {
            const styleId = node.getAttribute("data-iframe-sync-id") || `sync-style-${index}`;
            if (!doc.head.querySelector(`[data-iframe-sync-id="${styleId}"]`)) {
                const clone = node.cloneNode(true) as HTMLElement;
                clone.setAttribute("data-iframe-sync-id", styleId);
                doc.head.appendChild(clone);
            }
        });
    }, []);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;

        syncHeadStyles(doc);

        const observer = new MutationObserver(() => {
            syncHeadStyles(doc);
        });
        observer.observe(document.head, { childList: true, subtree: true });

        setIframeHead(doc.head);
        setIframeBody(doc.body);

        // Auto sync iframe height to content height (eliminates double height / double scrollbar)
        let resizeObserver: ResizeObserver | null = null;
        if (doc.body) {
            const updateHeight = () => {
                if (doc.body) {
                    const h = Math.max(500, doc.body.scrollHeight);
                    iframe.style.height = `${h}px`;
                }
            };
            updateHeight();
            resizeObserver = new ResizeObserver(() => updateHeight());
            resizeObserver.observe(doc.body);
        }

        return () => {
            observer.disconnect();
            if (resizeObserver) resizeObserver.disconnect();
        };
    }, [syncHeadStyles, iframeBody]);

    return (
        <iframe
            ref={iframeRef}
            className={className}
            style={style}
            title="Builder Viewport Frame"
        >
            {iframeHead && head && createPortal(head, iframeHead)}
            {iframeBody && createPortal(children, iframeBody)}
        </iframe>
    );
}
if (typeof window !== "undefined") {
    const originalError = console.error;
    console.error = (...args: any[]) => {
        const msg = args[0];
        if (typeof msg === "string" && msg.includes("useInsertionEffect must not schedule updates")) {
            return;
        }
        originalError(...args);
    };
}

/** Walk nested containers to find an element by id. */
function findElementInColumns(cols: Column[], elementId: string): { col: Column; el: any } | null {
    for (const col of cols) {
        const el = col.elements?.find((e) => e.id === elementId);
        if (el) return { col, el };
        if (col.columns?.length) {
            const nested = findElementInColumns(col.columns, elementId);
            if (nested) return nested;
        }
    }
    return null;
}

// Settings popup (co-located with the [id] route)
import BuilderSettingsPopup from "@/app/admin/builder/[id]/Popup";

// Canvas
import CanvasRow from "./canvas/CanvasRow";
import CanvasStyles from "./canvas/CanvasStyles";
import AddRowDropZone from "./canvas/AddRowDropZone";
import ContextMenu, { ContextMenuTarget } from "./canvas/ContextMenu";

// Panels
import RowControls from "./panels/RowControls";
import ColumnControls from "./panels/ColumnControls";
import ElementControls from "./panels/ElementControls";
import ElementsPanel from "./panels/ElementsPanel";
import SectionsPanel from "./panels/SectionsPanel";
import SaveSectionPopup from "./panels/SaveSectionPopup";
import ColumnsPanel from "./panels/ColumnsPanel";
import StructurePanel from "./panels/StructurePanel";
import FloatingPanel from "./panels/FloatingPanel";

// Hooks
import { useBuilderActions, useContextMenuActions, useDragDrop } from "./hooks";

export default function Builder({ initialMenus }: { initialMenus?: any[] }) {
    if (typeof window !== "undefined" && initialMenus) {
        (window as any).__initialMenus = initialMenus;
    }

    const params = useParams();
    const router = useRouter();
    const builderId = params?.id as string | undefined;

    const [rows, setRows] = useState<Row[]>([]);
    const [selected, setSelected] = useState<Selection | null>(null);
    const [leftPanel, setLeftPanel] = useState<LeftPanelMode>(null);
    const [targetCol, setTargetCol] = useState<{ rowId: string; path: number[] } | null>(null);
    const [selectedCarouselSlide, setSelectedCarouselSlide] = useState<{ elementId: string; slideIndex: number } | null>(null);
    const [selectedCarouselSlideElement, setSelectedCarouselSlideElement] = useState<{ elementId: string; slideIndex: number; childElementId: string } | null>(null);
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState("");
    const [templateType, setTemplateType] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenuTarget | null>(null);

    // Clipboard is persisted to localStorage so copy/paste works across builder pages
    // and across browser tabs simultaneously.
    const [clipboard, setClipboardState] = useState<{ type: string; data: any } | null>(null);

    // Read from localStorage after every client-side mount (handles same-tab navigation remounts)
    useEffect(() => {
        try {
            const raw = localStorage.getItem("builder_clipboard");
            setClipboardState(raw ? JSON.parse(raw) : null);
        } catch { }
    }, []);

    // Listen for localStorage changes from OTHER tabs in real time
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key !== "builder_clipboard") return;
            try {
                setClipboardState(e.newValue ? JSON.parse(e.newValue) : null);
            } catch { }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const setClipboard: React.Dispatch<React.SetStateAction<{ type: string; data: any } | null>> = useCallback(
        (value) => {
            setClipboardState((prev) => {
                const next = typeof value === "function" ? (value as (p: typeof prev) => typeof prev)(prev) : value;
                try {
                    if (next === null) {
                        localStorage.removeItem("builder_clipboard");
                    } else {
                        localStorage.setItem("builder_clipboard", JSON.stringify(next));
                    }
                } catch { }
                return next;
            });
        },
        []
    );
    const [showStructure, setShowStructure] = useState(false);
    const [showSaveSection, setShowSaveSection] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [saveSectionRow, setSaveSectionRow] = useState<string | null>(null);
    const [panelCollapsed, setPanelCollapsed] = useState(false);
    const [panelWidth, setPanelWidth] = useState(280);
    const [isResizing, setIsResizing] = useState(false);
    const [device, setDevice] = useState<Device>("desktop");
    // Incremented after reregisterHooks() so ElementsPanel re-renders with plugin elements
    const [catalogKey, setCatalogKey] = useState(0);

    // ── Register active plugin hooks (including builder elements) on mount ──
    useEffect(() => {
        xFetch("/plugin/installed", { cache: "no-store" })
            .then((r) => r.json())
            .then((data: { plugins: { nx: string; status: string }[] }) => {
                const activeNxIds = (data.plugins ?? [])
                    .filter((p) => p.status === "active")
                    .map((p) => p.nx);
                reregisterHooks(activeNxIds);
                // Bump key so ElementsPanel re-renders with the updated catalog
                setCatalogKey((k) => k + 1);
            })
            .catch(() => {});
    }, []);

    // ── Load content from API ──
    useEffect(() => {
        if (!builderId) return;
        xFetch(`/builder?id=${builderId}`)
            .then((r) => r.json())
            .then((doc) => {
                if (doc.content && Array.isArray(doc.content)) setRows(doc.content);
                if (doc.title) setTitle(doc.title);
                if (doc.templateType !== undefined) setTemplateType(doc.templateType ?? null);
            })
            .catch(() => { });
    }, [builderId]);

    // ── Dynamically pre-fetch enriched model dataset (*) based on active row types ──
    useEffect(() => {
        if (!rows || !Array.isArray(rows) || rows.length === 0) return;

        const postTypes = new Set<string>();
        const catTypes = new Set<string>();

        function inspectElements(elements: any[]) {
            for (const el of elements ?? []) {
                const c = el?.schema?.content;
                if (c) {
                    if (c.postType) postTypes.add(c.postType);
                    if (c.type && typeof c.type === "string" && !c.type.includes("-category")) postTypes.add(c.type);
                    if (c.categoryType) catTypes.add(c.categoryType);
                }
                if (el?.type === "carousel" && c?.slides) {
                    for (const slide of c.slides) {
                        inspectElements(slide.elements ?? []);
                    }
                }
            }
        }

        function inspectCols(cols: any[]) {
            for (const col of cols ?? []) {
                inspectElements(col?.elements ?? []);
                if (col?.columns) inspectCols(col.columns);
            }
        }

        for (const row of rows) {
            inspectCols(row?.columns ?? []);
        }

        const finalPostTypes = postTypes.size > 0 ? Array.from(postTypes) : ["blog"];
        const finalCatTypes = catTypes.size > 0 ? Array.from(catTypes) : ["blog-category"];

        Promise.all([
            ...finalCatTypes.map((ct) => xFetch(`/builder-post/cats?type=${ct}`).then((r) => r.json()).catch(() => ({ cats: [] }))),
            ...finalPostTypes.map((pt) => xFetch(`/builder-post?type=${pt}&limit=12`).then((r) => r.json()).catch(() => ({ posts: [] }))),
        ]).then((results) => {
            const allCats = results.slice(0, finalCatTypes.length).flatMap((r) => r.cats ?? []);
            const allPosts = results.slice(finalCatTypes.length).flatMap((r) => r.posts ?? []);

            if (typeof window !== "undefined") {
                (window as any).__initialBuilderData = {
                    cats: allCats,
                    posts: allPosts,
                    postTypes: finalPostTypes,
                    catTypes: finalCatTypes,
                };
            }
        });
    }, [rows]);

    // Panel resize handler
    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        const startX = e.clientX;
        const startWidth = panelWidth;

        const onMouseMove = (ev: MouseEvent) => {
            const newWidth = Math.max(280, Math.min(600, startWidth + (ev.clientX - startX)));
            setPanelWidth(newWidth);
        };
        const onMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }, [panelWidth]);

    const saveContent = useCallback(async () => {
        if (!builderId) return;
        setSaving(true);
        try {
            await xFetch("/builder", {
                method: "PUT",
                body: JSON.stringify({ id: builderId, content: rows }),
            });
        } catch { }
        setSaving(false);
    }, [builderId, rows]);

    // ---- SELECTION ----

    const selectRow = (rowId: string) => {
        setSelected({ type: "row", id: rowId });
        setLeftPanel("row-controls");
        setTargetCol(null);
    };

    const selectColumn = (rowId: string, path: number[]) => {
        setSelected({ type: "column", rowId, path });
        setTargetCol({ rowId, path });
        setLeftPanel("column-controls");
    };

    const openAddElement = (rowId: string, path: number[]) => {
        setSelected({ type: "column", rowId, path });
        setTargetCol({ rowId, path });
        setLeftPanel("elements");
    };

    const openAddColumns = (rowId: string, path: number[]) => {
        setSelected({ type: "column", rowId, path });
        setTargetCol({ rowId, path });
        setLeftPanel("add-columns");
    };

    const selectElement = (rowId: string, colPath: number[], elementId: string) => {
        setSelected({ type: "element", rowId, colPath, elementId });
        setLeftPanel("element-controls");
        setSelectedCarouselSlide(null);
        setSelectedCarouselSlideElement(null);
    };

    const selectCarouselSlide = (carouselElementId: string, slideIndex: number) => {
        setSelectedCarouselSlide({ elementId: carouselElementId, slideIndex });
        setSelectedCarouselSlideElement(null);
        setLeftPanel("element-controls");
    };

    const selectCarouselSlideElement = (carouselElementId: string, slideIndex: number, childElementId: string) => {
        setSelectedCarouselSlideElement({ elementId: carouselElementId, slideIndex, childElementId });
        setSelectedCarouselSlide(null);
        setLeftPanel("element-controls");
    };

    const addElementToCarouselSlide = (carouselElementId: string, slideIndex: number) => {
        setLeftPanel("elements");
        setTargetCarouselSlide({ elementId: carouselElementId, slideIndex });
    };

    const [targetCarouselSlide, setTargetCarouselSlide] = useState<{ elementId: string; slideIndex: number } | null>(null);

    const addElementToSlideAction = (elementType: string) => {
        if (!targetCarouselSlide) return;
        if (isContainerType(elementType)) return; // containers don't go inside slides
        const { elementId, slideIndex } = targetCarouselSlide;
        const def = getBuilderElement(elementType);
        if (!def) return;
        const newEl = {
            id: uid(),
            type: elementType,
            schema: JSON.parse(JSON.stringify(def.schema)),
        };
        setRows((prev) =>
            prev.map((row) => {
                const updated = JSON.parse(JSON.stringify(row)) as Row;
                const found = findElementInColumns(updated.columns, elementId);
                if (found?.el?.type === "carousel") {
                    if (!found.el.schema.content.slides[slideIndex].elements) {
                        found.el.schema.content.slides[slideIndex].elements = [];
                    }
                    found.el.schema.content.slides[slideIndex].elements.push(newEl);
                    return updated;
                }
                return row;
            })
        );
        setTargetCarouselSlide(null);
    };

    const deleteCarouselSlideElement = (carouselId: string, slideIndex: number, childElementId: string) => {
        setRows((prev) =>
            prev.map((row) => {
                const updated = JSON.parse(JSON.stringify(row)) as Row;
                const found = findElementInColumns(updated.columns, carouselId);
                if (found?.el?.type === "carousel") {
                    const slide = found.el.schema.content.slides[slideIndex];
                    if (slide?.elements) {
                        slide.elements = slide.elements.filter((e: any) => e.id !== childElementId);
                    }
                    return updated;
                }
                return row;
            })
        );
        setSelectedCarouselSlideElement(null);
    };

    const handleContextMenuCarouselSlide = (e: React.MouseEvent, carouselId: string, slideIndex: number, childElementId: string | null) => {
        e.preventDefault();
        e.stopPropagation();
        const targetEl = e.target as HTMLElement;
        const frame = targetEl?.ownerDocument?.defaultView?.frameElement;
        const rect = frame ? frame.getBoundingClientRect() : { left: 0, top: 0 };
        setContextMenu({
            type: "carousel-slide-element",
            rowId: rows.find((r) => r.columns.some((c) => c.elements?.some((el) => el.id === carouselId)))?.id || "",
            carouselId,
            slideIndex,
            childElementId: childElementId || undefined,
            x: e.clientX + rect.left,
            y: e.clientY + rect.top,
        });
    };

    // ---- ACTIONS (extracted hook) ----

    const {
        addRow,
        addNestedColumns,
        addElementToColumn,
        updateElement,
        updateColumn,
        moveRow,
        moveColumn,
        moveColumnByPath,
        deleteRow,
        moveElement,
        moveElementCross,
    } = useBuilderActions(rows, setRows, selected, setSelected, setLeftPanel, targetCol, setTargetCol);

    // ---- CONTEXT MENU (extracted hook) ----

    const {
        handleContextMenu,
        handleDuplicate,
        handleCopy,
        handlePaste,
        handlePasteStyle,
        handleResetStyle,
        handleContextEdit,
        handleContextDelete,
        handleStructure,
    } = useContextMenuActions(
        rows, setRows, contextMenu, setContextMenu,
        clipboard, setClipboard,
        selectRow, selectColumn, selectElement,
        deleteRow, setShowStructure,
        selectCarouselSlideElement
    );

    // ---- DND (extracted hook) ----

    const { handleDragOver, handleDragEnd } = useDragDrop(
        rows, setRows, moveRow, moveColumn, moveColumnByPath, moveElement, addElementToColumn
    );

    // ---- DERIVED ----

    const selectedRow =
        selected?.type === "row" ? rows.find((r) => r.id === selected.id) ?? null : null;

    const selectedColumn =
        selected?.type === "column"
            ? (() => {
                const row = rows.find((r) => r.id === selected.rowId);
                if (!row) return null;
                return getColumnByPath(row, selected.path);
            })()
            : null;

    const selectedElement =
        selected?.type === "element"
            ? (() => {
                const row = rows.find((r) => r.id === selected.rowId);
                if (!row) return null;
                const col = getColumnByPath(row, selected.colPath);
                return col.elements.find((e) => e.id === selected.elementId) ?? null;
            })()
            : null;

    // Find carousel slide child element (walk nested containers)
    const selectedCarouselSlideChildElement =
        selectedCarouselSlideElement
            ? (() => {
                const findCarousel = (cols: Column[]): any | null => {
                    for (const col of cols) {
                        const el = col.elements?.find((e) => e.id === selectedCarouselSlideElement.elementId);
                        if (el) return el;
                        if (col.columns?.length) {
                            const nested = findCarousel(col.columns);
                            if (nested) return nested;
                        }
                    }
                    return null;
                };
                for (const row of rows) {
                    const carousel = findCarousel(row.columns);
                    if (carousel && carousel.type === "carousel") {
                        const slide = carousel.schema.content.slides[selectedCarouselSlideElement.slideIndex];
                        if (slide) {
                            return slide.elements?.find((e: any) => e.id === selectedCarouselSlideElement.childElementId) ?? null;
                        }
                    }
                }
                return null;
            })()
            : null;

    // Panel title
    const panelTitle = (() => {
        if (leftPanel === "row-controls") return "Section";
        if (leftPanel === "column-controls") return "Container";
        if (leftPanel === "element-controls") {
            const el = selectedCarouselSlideChildElement || selectedElement;
            if (el) {
                const def = getElementDef(el.type);
                const name = def?.label || (el.type.charAt(0).toUpperCase() + el.type.slice(1));
                return `Edit ${name}`;
            }
        }
        if (leftPanel === "add-columns") return "Container Structure";
        if (leftPanel === "sections") return "Sections";
        return "Elements";
    })();

    return (
        <DragDropProvider onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="fixed inset-0 z-999 flex bg-neutral-100 gap-0 overflow-hidden">
                {/* LEFT PANEL */}
                <div
                    className={`shrink-0 bg-white flex flex-col relative transition-[width] duration-300 ease-in-out ${isResizing ? "select-none" : ""}`}
                    style={{ width: panelCollapsed ? 0 : panelWidth, overflow: panelCollapsed ? "hidden" : undefined }}
                >
                    {/* Panel Header */}
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-200 shrink-0">
                        <span className="text-sm font-semibold text-neutral-700 whitespace-nowrap">
                            {panelTitle}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setLeftPanel("sections");
                                    setSelected(null);
                                }}
                                title="Show sections"
                                className={`flex items-center justify-center w-7 h-7 rounded cursor-pointer border-none ${leftPanel === "sections" ? "bg-neutral-100" : "bg-transparent"
                                    }`}
                            >
                                <Icon icon="mdi:view-dashboard-outline" width="18" className="text-neutral-700" />
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setLeftPanel("elements");
                                    setSelected(null);
                                }}
                                title="Show elements"
                                className={`flex items-center justify-center w-7 h-7 rounded cursor-pointer border-none ${leftPanel === "elements" || !leftPanel ? "bg-neutral-100" : "bg-transparent"
                                    }`}
                            >
                                <Icon icon="mdi:view-grid-plus-outline" width="18" className="text-neutral-700" />
                            </button>
                        </div>
                    </div>

                    {/* Panel Content */}
                    <div className="flex-1 overflow-y-auto">
                        {leftPanel === "row-controls" && selectedRow && (
                            <RowControls
                                row={selectedRow}
                                device={device}
                                onChange={(updated) =>
                                    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
                                }
                            />
                        )}

                        {leftPanel === "column-controls" && selectedColumn && selected?.type === "column" && (
                            <ColumnControls
                                column={selectedColumn}
                                device={device}
                                onChange={(updatedCol) => updateColumn(selected.rowId, selected.path, updatedCol)}
                            />
                        )}

                        {leftPanel === "add-columns" && <ColumnsPanel onSelect={addNestedColumns} />}

                        {(leftPanel === "elements" || !leftPanel) && (
                            <ElementsPanel
                                key={catalogKey}
                                onClickAdd={(type) => {
                                    if (targetCarouselSlide) {
                                        addElementToSlideAction(type);
                                    } else if (targetCol) {
                                        addElementToColumn(targetCol.rowId, targetCol.path, type);
                                    }
                                }}
                            />
                        )}

                        {leftPanel === "sections" && (
                            <SectionsPanel
                                onInsert={(content) => {
                                    if (Array.isArray(content) && content.length > 0) {
                                        const regenCol = (col: Column): Column => ({
                                            ...col,
                                            id: uid(),
                                            elements: col.elements.map((el) => ({ ...el, id: uid() })),
                                            columns: col.columns.map(regenCol),
                                        });
                                        const cloned = (JSON.parse(JSON.stringify(content)) as Row[]).map((row) => ({
                                            ...row,
                                            id: uid(),
                                            columns: row.columns.map(regenCol),
                                        }));
                                        setRows((prev) => [...prev, ...cloned]);
                                    }
                                }}
                            />
                        )}

                        {leftPanel === "element-controls" && selectedElement && selected?.type === "element" && !selectedCarouselSlideChildElement && (
                            <ElementControls
                                element={selectedElement}
                                device={device}
                                onChange={(newSchema) =>
                                    updateElement(selected.rowId, selected.colPath, selected.elementId, newSchema)
                                }
                            />
                        )}

                        {leftPanel === "element-controls" && selectedCarouselSlideChildElement && selectedCarouselSlideElement && (
                            <ElementControls
                                element={selectedCarouselSlideChildElement}
                                device={device}
                                onChange={(newSchema) => {
                                    setRows((prev) =>
                                        prev.map((row) => {
                                            const updated = JSON.parse(JSON.stringify(row)) as Row;
                                            const found = findElementInColumns(updated.columns, selectedCarouselSlideElement.elementId);
                                            if (found?.el?.type === "carousel") {
                                                const slide = found.el.schema.content.slides[selectedCarouselSlideElement.slideIndex];
                                                if (slide) {
                                                    const childIdx = slide.elements.findIndex((e: any) => e.id === selectedCarouselSlideElement.childElementId);
                                                    if (childIdx !== -1) {
                                                        slide.elements[childIdx].schema = newSchema;
                                                    }
                                                }
                                                return updated;
                                            }
                                            return row;
                                        })
                                    );
                                }}
                            />
                        )}
                    </div>

                    {/* Resize handle — drag to resize panel width */}
                    <div
                        onMouseDown={handleResizeStart}
                        className="absolute top-0 right-0 w-0.5 h-full cursor-col-resize z-20 hover:bg-blue-500 active:bg-blue-500/50 transition-colors"
                    />
                </div>

                {/* Panel collapse/expand toggle */}
                <button
                    type="button"
                    onClick={() => setPanelCollapsed(!panelCollapsed)}
                    title={panelCollapsed ? "Show panel" : "Hide panel (preview mode)"}
                    className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-4 h-10 bg-white border border-neutral-100 border-l-0 rounded-r cursor-pointer hover:bg-neutral-50 transition-[left] duration-300 ease-in-out"
                    style={{ left: panelCollapsed ? 0 : panelWidth }}
                >
                    <Icon
                        icon={panelCollapsed ? "mdi:chevron-right" : "mdi:chevron-left"}
                        width="16"
                        className="text-neutral-500"
                    />
                </button>

                {/* CANVAS AREA */}
                <div className="flex-1 flex flex-col">
                    {/* Top bar */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200 bg-white shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[13px] text-neutral-500">{title || "Untitled"}</span>
                            {panelCollapsed && (
                                <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Preview</span>
                            )}
                        </div>
                        <div className="flex items-center gap-0.5 bg-neutral-100 rounded p-0.5">
                            {([
                                { key: "desktop", icon: "mdi:monitor", label: "Desktop (100%)", widthLabel: "100%" },
                                { key: "tablet", icon: "mdi:tablet", label: "Tablet (768px)", widthLabel: "768px" },
                                { key: "mobile", icon: "mdi:cellphone", label: "Mobile (375px)", widthLabel: "375px" },
                            ] as const).map((d) => (
                                <button
                                    key={d.key}
                                    type="button"
                                    onClick={() => setDevice(d.key)}
                                    className={`flex items-center justify-center h-7 px-2.5 gap-1.5 rounded text-xs cursor-pointer border-none transition-all ${device === d.key ? "bg-white text-blue-600 shadow-sm font-medium" : "bg-transparent text-neutral-500 hover:text-neutral-700"}`}
                                    title={d.label}
                                >
                                    <Icon icon={d.icon} width="16" />
                                    <span className="capitalize text-[11px] hidden sm:inline">{d.key}</span>
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Structure toggle */}
                            <button
                                type="button"
                                onClick={() => setShowStructure(!showStructure)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded cursor-pointer border-none ${showStructure ? "text-blue-600 bg-blue-50" : "text-neutral-600 bg-neutral-100 hover:bg-neutral-200"
                                    }`}
                            >
                                <Icon icon="mdi:file-tree" width="14" />
                                Structure
                            </button>
                            {/* Settings toggle */}
                            <button
                                type="button"
                                onClick={() => setShowSettings(!showSettings)}
                                title="Page settings"
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded cursor-pointer border-none ${
                                    showSettings
                                        ? "text-indigo-600 bg-indigo-50"
                                        : "text-neutral-600 bg-neutral-100 hover:bg-neutral-200"
                                }`}
                            >
                                <Icon icon="solar:settings-bold" width="14" />
                                Settings
                            </button>
                            {/* Back button */}
                            <button
                                type="button"
                                onClick={() => router.push("/admin/builder")}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded cursor-pointer border-none"
                            >
                                <Icon icon="mdi:arrow-left" width="14" />
                                Back
                            </button>
                            {/* Save button */}
                            {builderId && (
                                <>
                                    {/* Save as Template — saves all rows to /api/buildersection */}
                                    <button
                                        type="button"
                                        onClick={() => { setSaveSectionRow(null); setShowSaveSection(true); }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded cursor-pointer border-none"
                                    >
                                        <Icon icon="mdi:content-save-outline" width="14" />
                                        Save Template
                                    </button>
                                    {/* Save — persists builder content via PUT /api/builder */}
                                    <button
                                        type="button"
                                        onClick={saveContent}
                                        disabled={saving}
                                        className={`px-4 py-1.5 text-xs font-medium text-white rounded border-none cursor-pointer ${saving ? "bg-neutral-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
                                            }`}
                                    >
                                        {saving ? "Saving..." : "Save"}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Canvas scroll area */}
                    <div className={`flex-1 bg-neutral-100/70 flex flex-col items-center justify-center overflow-hidden h-full ${panelCollapsed ? "builder-preview-mode" : ""}`} data-preview={panelCollapsed ? "true" : undefined}>
                        <div
                            className={`mx-auto transition-all duration-300 ease-in-out bg-white flex flex-col h-full overflow-hidden ${
                                device === "desktop"
                                    ? "w-full rounded-none border-none shadow-none"
                                    : "shadow-2xl border border-neutral-300/80 rounded-xl my-1 shrink-0"
                            }`}
                            style={{
                                width: device === "desktop" ? "100%" : device === "tablet" ? "768px" : "375px",
                                maxWidth: "100%",
                                height: device === "desktop" ? "100%" : "calc(100vh - 100px)",
                            }}
                        >
                            {/* Device Frame Header (Browser Inspect style) */}
                            {device !== "desktop" && (
                                <div className="bg-neutral-100 border-b border-neutral-200 px-3 py-1.5 flex items-center justify-between text-[11px] text-neutral-500 font-mono select-none shrink-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                                    </div>
                                    <span className="font-semibold text-neutral-600">
                                        {device === "tablet" ? "768px (Tablet Viewport)" : "375px (Mobile Viewport)"}
                                    </span>
                                    <Icon icon={device === "tablet" ? "mdi:tablet" : "mdi:cellphone"} width="15" className="text-neutral-500" />
                                </div>
                            )}

                            <CanvasIframe
                                className="w-full h-full flex-1 border-none bg-white block overflow-y-auto overflow-x-hidden"
                                head={<CanvasStyles rows={rows} device={device} />}
                            >
                                {rows.map((row, index) => (
                                    <CanvasRow
                                        key={row.id}
                                        row={row}
                                        index={index}
                                        device={device}
                                        isSelected={selected?.type === "row" && selected.id === row.id}
                                        onSelectRow={() => selectRow(row.id)}
                                        onDeleteRow={() => deleteRow(row.id)}
                                        onContextMenu={handleContextMenu}
                                        onSelectColumn={selectColumn}
                                        onAddColumns={openAddColumns}
                                        onAddElement={openAddElement}
                                        onSelectElement={selectElement}
                                        selectedColumn={
                                            selected?.type === "column" && selected.rowId === row.id
                                                ? selected.path
                                                : null
                                        }
                                        selectedElementId={
                                            selected?.type === "element" && selected.rowId === row.id
                                                ? selected.elementId
                                                : null
                                        }
                                        selectedCarouselSlide={selectedCarouselSlide}
                                        selectedCarouselSlideElement={selectedCarouselSlideElement}
                                        onSelectCarouselSlide={selectCarouselSlide}
                                        onSelectCarouselSlideElement={selectCarouselSlideElement}
                                        onAddElementToCarouselSlide={addElementToCarouselSlide}
                                        onDeleteCarouselSlideElement={deleteCarouselSlideElement}
                                        onContextMenuCarouselSlide={handleContextMenuCarouselSlide}
                                    />
                                ))}

                                {!panelCollapsed && (
                                    <AddRowDropZone
                                        onAddRow={addRow}
                                        clipboard={clipboard}
                                        onPasteRow={(row) => setRows((prev) => [...prev, row])}
                                        onCopyAll={rows.length > 0 ? () => setClipboard({ type: "all", data: JSON.parse(JSON.stringify(rows)) }) : undefined}
                                        onDeleteAll={rows.length > 0 ? () => { setRows([]); setSelected(null); setLeftPanel(null); } : undefined}
                                        onStructure={() => setShowStructure(true)}
                                        onOpenSections={() => { setLeftPanel("sections"); setSelected(null); }}
                                    />
                                )}
                            </CanvasIframe>
                        </div>
                        {/* close device-width wrapper */}
                    </div>
                    {/* close scroll area */}
                </div>
                {/* close canvas flex-col */}

                {/* Context Menu */}
                {contextMenu && (
                    <ContextMenu
                        target={contextMenu}
                        onClose={() => setContextMenu(null)}
                        onEdit={handleContextEdit}
                        onDuplicate={handleDuplicate}
                        onCopy={handleCopy}
                        onPaste={handlePaste}
                        onPasteStyle={handlePasteStyle}
                        onResetStyle={handleResetStyle}
                        onDelete={handleContextDelete}
                        onStructure={handleStructure}
                        onSaveSection={contextMenu.type === "row" ? () => {
                            setSaveSectionRow(contextMenu.rowId);
                            setShowSaveSection(true);
                            setContextMenu(null);
                        } : undefined}
                        hasCopied={!!clipboard}
                    />
                )}

                {/* Structure Panel (floating, draggable, resizable) */}
                {showStructure && (
                    <FloatingPanel defaultX={-20} defaultY={60} defaultWidth={256} defaultHeight={500}>
                        <StructurePanel
                            rows={rows}
                            onSelectRow={(id) => selectRow(id)}
                            onSelectColumn={(rowId, path) => selectColumn(rowId, path)}
                            onSelectElement={(rowId, colPath, elId) => selectElement(rowId, colPath, elId)}
                            onMoveRow={moveRow}
                            onMoveColumn={moveColumn}
                            onMoveElement={moveElement}
                            onMoveElementCross={moveElementCross}
                            onClose={() => setShowStructure(false)}
                            selectedId={
                                selected?.type === "row"
                                    ? selected.id
                                    : selected?.type === "column"
                                        ? rows.find((r) => r.id === selected.rowId)?.columns[selected.path[0]]?.id || null
                                        : selected?.type === "element"
                                            ? selected.elementId
                                            : null
                            }
                        />
                    </FloatingPanel>
                )}

                {/* Save Section Popup */}
                {showSaveSection && (
                    <SaveSectionPopup
                        onClose={() => { setShowSaveSection(false); setSaveSectionRow(null); }}
                        onSave={async (data) => {
                            const content = saveSectionRow
                                ? [rows.find((r) => r.id === saveSectionRow)].filter(Boolean)
                                : rows;
                            await xFetch("/buildersection", {
                                method: "POST",
                                body: JSON.stringify({
                                    title: data.title || title || "Untitled Section",
                                    type: data.type,
                                    image: data.image,
                                    content,
                                }),
                            });
                            setShowSaveSection(false);
                            setSaveSectionRow(null);
                        }}
                    />
                )}

                {/* Page Settings Panel (slides in from the right) */}
                <BuilderSettingsPopup
                    open={showSettings}
                    title={title}
                    templateType={templateType}
                    onClose={() => setShowSettings(false)}
                    onSave={async ({ title: newTitle, templateType: newType }) => {
                        if (!builderId) return;
                        await xFetch("/builder", {
                            method: "PUT",
                            body: JSON.stringify({
                                id: builderId,
                                title: newTitle,
                                templateType: newType,
                            }),
                        });
                        setTitle(newTitle);
                        setTemplateType(newType);
                    }}
                />
            </div>
        </DragDropProvider>
    );
}
