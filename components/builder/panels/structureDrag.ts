// Shared drag state for the Structure panel tree (module-level singleton)

export interface DragItem {
    type: "row" | "column" | "element";
    rowId: string;
    rowIdx?: number;
    colIdx?: number;
    colPath?: number[];
    elementId?: string;
    elementIdx?: number;
}

let dragItem: DragItem | null = null;

export function getDragItem() {
    return dragItem;
}

export function setDragItem(item: DragItem | null) {
    dragItem = item;
}
