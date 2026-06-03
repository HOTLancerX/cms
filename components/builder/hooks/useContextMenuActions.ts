"use client";

import { useCallback } from "react";
import { Row, Column, Selection } from "../types";
import { uid, getColumnByPath, getElementDef } from "../helpers";
import { ContextMenuTarget } from "../canvas/ContextMenu";
import rowElement from "../elements/row";

export function useContextMenuActions(
    rows: Row[],
    setRows: React.Dispatch<React.SetStateAction<Row[]>>,
    contextMenu: ContextMenuTarget | null,
    setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuTarget | null>>,
    clipboard: { type: string; data: any } | null,
    setClipboard: React.Dispatch<React.SetStateAction<{ type: string; data: any } | null>>,
    selectRow: (rowId: string) => void,
    selectColumn: (rowId: string, path: number[]) => void,
    selectElement: (rowId: string, colPath: number[], elementId: string) => void,
    deleteRow: (rowId: string) => void,
    setShowStructure: React.Dispatch<React.SetStateAction<boolean>>
) {
    const handleContextMenu = useCallback(
        (e: React.MouseEvent, target: Omit<ContextMenuTarget, "x" | "y">) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenu({ ...target, x: e.clientX, y: e.clientY } as ContextMenuTarget);
        },
        [setContextMenu]
    );

    const handleDuplicate = useCallback(() => {
        if (!contextMenu) return;
        if (contextMenu.type === "row") {
            const row = rows.find((r) => r.id === contextMenu.rowId);
            if (!row) return;
            const clone = JSON.parse(JSON.stringify(row)) as Row;
            clone.id = uid();
            const reId = (col: Column): Column => ({
                ...col,
                id: uid(),
                elements: col.elements.map((el) => ({ ...el, id: uid() })),
                columns: col.columns.map(reId),
            });
            clone.columns = clone.columns.map(reId);
            const idx = rows.findIndex((r) => r.id === contextMenu.rowId);
            setRows((prev) => [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)]);
        } else if (contextMenu.type === "column" && contextMenu.colPath) {
            const row = rows.find((r) => r.id === contextMenu.rowId);
            if (!row) return;
            const col = getColumnByPath(row, contextMenu.colPath);
            const clone = JSON.parse(JSON.stringify(col)) as Column;
            clone.id = uid();
            clone.elements = clone.elements.map((el) => ({ ...el, id: uid() }));
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    const parentPath = contextMenu.colPath!;
                    if (parentPath.length === 1) {
                        updated.columns.splice(parentPath[0] + 1, 0, clone);
                    }
                    return updated;
                })
            );
        } else if (contextMenu.type === "element" && contextMenu.colPath && contextMenu.elementId) {
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    const col = getColumnByPath(updated, contextMenu.colPath!);
                    const idx = col.elements.findIndex((el) => el.id === contextMenu.elementId);
                    if (idx === -1) return updated;
                    const clone = JSON.parse(JSON.stringify(col.elements[idx]));
                    clone.id = uid();
                    col.elements.splice(idx + 1, 0, clone);
                    return updated;
                })
            );
        }
        setContextMenu(null);
    }, [contextMenu, rows, setRows, setContextMenu]);

    const handleCopy = useCallback(() => {
        if (!contextMenu) return;
        if (contextMenu.type === "row") {
            const row = rows.find((r) => r.id === contextMenu.rowId);
            if (row) setClipboard({ type: "row", data: JSON.parse(JSON.stringify(row)) });
        } else if (contextMenu.type === "column" && contextMenu.colPath) {
            const row = rows.find((r) => r.id === contextMenu.rowId);
            if (row) {
                const col = getColumnByPath(row, contextMenu.colPath);
                setClipboard({ type: "column", data: JSON.parse(JSON.stringify(col)) });
            }
        } else if (contextMenu.type === "element" && contextMenu.colPath && contextMenu.elementId) {
            const row = rows.find((r) => r.id === contextMenu.rowId);
            if (row) {
                const col = getColumnByPath(row, contextMenu.colPath);
                const el = col.elements.find((e) => e.id === contextMenu.elementId);
                if (el) setClipboard({ type: "element", data: JSON.parse(JSON.stringify(el)) });
            }
        }
        setContextMenu(null);
    }, [contextMenu, rows, setClipboard, setContextMenu]);

    const handlePaste = useCallback(() => {
        if (!clipboard || !contextMenu) { setContextMenu(null); return; }
        if (clipboard.type === "element" && contextMenu.colPath) {
            const clone = JSON.parse(JSON.stringify(clipboard.data));
            clone.id = uid();
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    const col = getColumnByPath(updated, contextMenu.colPath!);
                    col.elements.push(clone);
                    return updated;
                })
            );
        } else if (clipboard.type === "row") {
            const clone = JSON.parse(JSON.stringify(clipboard.data)) as Row;
            clone.id = uid();
            clone.columns = clone.columns.map((c: Column) => ({ ...c, id: uid(), elements: c.elements.map((el) => ({ ...el, id: uid() })) }));
            const idx = rows.findIndex((r) => r.id === contextMenu.rowId);
            setRows((prev) => [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)]);
        }
        setContextMenu(null);
    }, [clipboard, contextMenu, rows, setRows, setContextMenu]);

    const handlePasteStyle = useCallback(() => {
        if (!clipboard || !contextMenu) { setContextMenu(null); return; }
        if (contextMenu.type === "element" && clipboard.type === "element" && contextMenu.colPath && contextMenu.elementId) {
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    const col = getColumnByPath(updated, contextMenu.colPath!);
                    const el = col.elements.find((e) => e.id === contextMenu.elementId);
                    if (el && el.type === clipboard.data.type) {
                        el.schema.style = JSON.parse(JSON.stringify(clipboard.data.schema.style));
                        el.schema.advanced = JSON.parse(JSON.stringify(clipboard.data.schema.advanced));
                    }
                    return updated;
                })
            );
        } else if (contextMenu.type === "row" && clipboard.type === "row") {
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    updated.schema.style = JSON.parse(JSON.stringify(clipboard.data.schema.style));
                    updated.schema.advanced = JSON.parse(JSON.stringify(clipboard.data.schema.advanced));
                    return updated;
                })
            );
        } else if (contextMenu.type === "column" && clipboard.type === "column" && contextMenu.colPath) {
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    const col = getColumnByPath(updated, contextMenu.colPath!);
                    col.schema.style = JSON.parse(JSON.stringify(clipboard.data.schema.style));
                    col.schema.advanced = JSON.parse(JSON.stringify(clipboard.data.schema.advanced));
                    return updated;
                })
            );
        }
        setContextMenu(null);
    }, [clipboard, contextMenu, setRows, setContextMenu]);

    const handleResetStyle = useCallback(() => {
        if (!contextMenu) return;
        if (contextMenu.type === "row") {
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    updated.schema.style = JSON.parse(JSON.stringify(rowElement.schema.style));
                    updated.schema.advanced = JSON.parse(JSON.stringify(rowElement.schema.advanced));
                    return updated;
                })
            );
        } else if (contextMenu.type === "column" && contextMenu.colPath) {
            const columnElement = require("../elements/column").default;
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    const col = getColumnByPath(updated, contextMenu.colPath!);
                    col.schema.style = JSON.parse(JSON.stringify(columnElement.schema.style));
                    col.schema.advanced = JSON.parse(JSON.stringify(columnElement.schema.advanced));
                    return updated;
                })
            );
        } else if (contextMenu.type === "element" && contextMenu.colPath && contextMenu.elementId) {
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    const col = getColumnByPath(updated, contextMenu.colPath!);
                    const el = col.elements.find((e) => e.id === contextMenu.elementId);
                    if (el) {
                        const def = getElementDef(el.type);
                        if (def) {
                            el.schema.style = JSON.parse(JSON.stringify(def.schema.style || {}));
                            el.schema.advanced = JSON.parse(JSON.stringify(def.schema.advanced || {}));
                        }
                    }
                    return updated;
                })
            );
        }
        setContextMenu(null);
    }, [contextMenu, setRows, setContextMenu]);

    const handleContextEdit = useCallback(() => {
        if (!contextMenu) return;
        if (contextMenu.type === "row") selectRow(contextMenu.rowId);
        else if (contextMenu.type === "column" && contextMenu.colPath) selectColumn(contextMenu.rowId, contextMenu.colPath);
        else if (contextMenu.type === "element" && contextMenu.colPath && contextMenu.elementId) selectElement(contextMenu.rowId, contextMenu.colPath, contextMenu.elementId);
        setContextMenu(null);
    }, [contextMenu, selectRow, selectColumn, selectElement, setContextMenu]);

    const handleContextDelete = useCallback(() => {
        if (!contextMenu) return;
        if (contextMenu.type === "row") {
            deleteRow(contextMenu.rowId);
        } else if (contextMenu.type === "column" && contextMenu.colPath) {
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    if (contextMenu.colPath!.length === 1) {
                        updated.columns.splice(contextMenu.colPath![0], 1);
                    }
                    return updated;
                })
            );
        } else if (contextMenu.type === "element" && contextMenu.colPath && contextMenu.elementId) {
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    const col = getColumnByPath(updated, contextMenu.colPath!);
                    col.elements = col.elements.filter((e) => e.id !== contextMenu.elementId);
                    return updated;
                })
            );
        }
        setContextMenu(null);
    }, [contextMenu, deleteRow, setRows, setContextMenu]);

    const handleStructure = useCallback(() => {
        setShowStructure(true);
        setContextMenu(null);
    }, [setShowStructure, setContextMenu]);

    return {
        handleContextMenu,
        handleDuplicate,
        handleCopy,
        handlePaste,
        handlePasteStyle,
        handleResetStyle,
        handleContextEdit,
        handleContextDelete,
        handleStructure,
    };
}
