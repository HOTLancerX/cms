"use client";

import { useState, useRef, useCallback, createContext, useContext } from "react";

// Context to pass drag handler to children (so header can trigger panel drag)
const FloatingPanelContext = createContext<{ onDragStart: (e: React.MouseEvent) => void }>({
    onDragStart: () => { },
});

export function useFloatingPanelDrag() {
    return useContext(FloatingPanelContext);
}

interface Props {
    children: React.ReactNode;
    defaultX?: number;
    defaultY?: number;
    defaultWidth?: number;
    defaultHeight?: number;
}

export default function FloatingPanel({
    children,
    defaultX = -280,
    defaultY = 60,
    defaultWidth = 256,
    defaultHeight = 500,
}: Props) {
    const [pos, setPos] = useState({ x: defaultX, y: defaultY });
    const [size, setSize] = useState({ w: defaultWidth, h: defaultHeight });
    const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
    const resizeRef = useRef<{ startY: number; startH: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // ─── DRAG (only from header) ───
    const onDragStart = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest("button")) return;
        e.preventDefault();
        setPos((current) => {
            dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: current.x, startPosY: current.y };
            return current;
        });

        const onMove = (ev: MouseEvent) => {
            if (!dragRef.current) return;
            const dx = ev.clientX - dragRef.current.startX;
            const dy = ev.clientY - dragRef.current.startY;
            setPos({ x: dragRef.current.startPosX + dx, y: dragRef.current.startPosY + dy });
        };

        const onUp = () => {
            dragRef.current = null;
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    }, []);

    // ─── RESIZE (bottom handle) ───
    const onResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setSize((current) => {
            resizeRef.current = { startY: e.clientY, startH: current.h };
            return current;
        });

        const onMove = (ev: MouseEvent) => {
            if (!resizeRef.current) return;
            const dy = ev.clientY - resizeRef.current.startY;
            setSize((prev) => ({ ...prev, h: Math.max(200, resizeRef.current!.startH + dy) }));
        };

        const onUp = () => {
            resizeRef.current = null;
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    }, []);

    return (
        <FloatingPanelContext.Provider value={{ onDragStart }}>
            <div
                ref={containerRef}
                style={{
                    position: "fixed",
                    right: pos.x < 0 ? `${-pos.x}px` : undefined,
                    left: pos.x >= 0 ? `${pos.x}px` : undefined,
                    top: `${pos.y}px`,
                    width: `${size.w}px`,
                    height: `${size.h}px`,
                    zIndex: 1002,
                    display: "flex",
                    flexDirection: "column",
                    background: "#fff",
                    borderRadius: "8px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                    border: "1px solid #e5e7eb",
                    overflow: "hidden",
                }}
            >
                {/* Content */}
                <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    {children}
                </div>

                {/* Resize handle — bottom */}
                <div
                    onMouseDown={onResizeStart}
                    style={{
                        height: "10px",
                        cursor: "ns-resize",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        borderTop: "1px solid #f3f4f6",
                    }}
                >
                    <div style={{ width: "24px", height: "3px", borderRadius: "2px", background: "#d1d5db" }} />
                </div>
            </div>
        </FloatingPanelContext.Provider>
    );
}
