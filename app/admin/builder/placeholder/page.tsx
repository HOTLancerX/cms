"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  FiPlus,
  FiTrash2,
  FiCopy,
  FiUpload,
  FiDownload,
  FiArrowUp,
  FiArrowDown,
  FiGrid,
  FiRotateCcw,
  FiImage,
  FiMaximize2,
  FiSliders,
  FiX,
  FiLayers,
  FiCompass
} from "react-icons/fi";

type Box = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  background: string;
  label?: string;
};

type Guide = {
  id: string;
  type: "horizontal" | "vertical";
  position: number;
};

const COLOR_PRESETS = [
  "#e5e7eb", // Light Gray
  "#d1d5db", // Mid Gray
  "#9ca3af", // Cool Gray
  "#6b7280", // Slate Gray
  "#374151", // Dark Slate
  "#1f2937", // Charcoal
  "#3b82f6", // Electric Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#10b981", // Emerald
  "#06b6d4"  // Cyan
];

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const MIN_BOX_SIZE = 10; // Minimum size allowed

export default function PlaceholderBuilder() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [boxes, setBoxes] = useState<Box[]>([
    {
      id: "box-1",
      x: 60,
      y: 60,
      width: 200,
      height: 30, // Smaller than 50px initial height
      radius: 12,
      background: "#e5e7eb",
      label: "Placeholder 1"
    }
  ]);

  const [activeId, setActiveId] = useState<string | null>("box-1");
  const [globalRadius, setGlobalRadius] = useState<number>(12);
  const [globalBackground, setGlobalBackground] = useState<string>("#e5e7eb");
  const [canvasImage, setCanvasImage] = useState<string | null>(null);
  const [canvasBgColor, setCanvasBgColor] = useState<string>("#ffffff");
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showRulers, setShowRulers] = useState<boolean>(true);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [snappedGuideIds, setSnappedGuideIds] = useState<string[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    boxId: string;
  } | null>(null);

  // Drag to create a custom guide line from top or left ruler
  const startGuideDrag = (type: "horizontal" | "vertical", e: React.MouseEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const guideId = crypto.randomUUID();
    const rect = canvasRef.current.getBoundingClientRect();

    const getPos = (ev: MouseEvent) => {
      if (type === "horizontal") {
        return Math.round((ev.clientY - rect.top) / zoom);
      } else {
        return Math.round((ev.clientX - rect.left) / zoom);
      }
    };

    const initialPos = getPos(e.nativeEvent);
    const newGuide: Guide = { id: guideId, type, position: initialPos };
    setGuides((prev) => [...prev, newGuide]);

    const move = (ev: MouseEvent) => {
      const pos = getPos(ev);
      setGuides((prev) =>
        prev.map((g) => (g.id === guideId ? { ...g, position: pos } : g))
      );
    };

    const stop = (ev: MouseEvent) => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
      const finalPos = getPos(ev);
      const maxBound = type === "horizontal" ? CANVAS_HEIGHT : CANVAS_WIDTH;
      if (finalPos < 0 || finalPos > maxBound) {
        setGuides((prev) => prev.filter((g) => g.id !== guideId));
      }
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);
  };

  const startGuideMove = (guide: Guide, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();

    const getPos = (ev: MouseEvent) => {
      if (guide.type === "horizontal") {
        return Math.round((ev.clientY - rect.top) / zoom);
      } else {
        return Math.round((ev.clientX - rect.left) / zoom);
      }
    };

    const move = (ev: MouseEvent) => {
      const pos = getPos(ev);
      setGuides((prev) =>
        prev.map((g) => (g.id === guide.id ? { ...g, position: pos } : g))
      );
    };

    const stop = (ev: MouseEvent) => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
      const finalPos = getPos(ev);
      const maxBound = guide.type === "horizontal" ? CANVAS_HEIGHT : CANVAS_WIDTH;
      if (finalPos < 0 || finalPos > maxBound) {
        setGuides((prev) => prev.filter((g) => g.id !== guide.id));
      }
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);
  };

  const activeBox = boxes.find((b) => b.id === activeId) || null;

  // Add box with initial height smaller than minimum height given
  const addBox = useCallback(() => {
    const newBox: Box = {
      id: crypto.randomUUID(),
      x: Math.floor(Math.random() * (CANVAS_WIDTH - 220)) + 40,
      y: Math.floor(Math.random() * (CANVAS_HEIGHT - 120)) + 40,
      width: 140,
      height: 30, // Smaller initial height
      radius: globalRadius,
      background: globalBackground,
      label: `Placeholder ${boxes.length + 1}`
    };

    setBoxes((prev) => [...prev, newBox]);
    setActiveId(newBox.id);
  }, [boxes.length, globalRadius, globalBackground]);

  const updateBox = useCallback((id: string, data: Partial<Box>) => {
    setBoxes((prev) =>
      prev.map((box) => (box.id === id ? { ...box, ...data } : box))
    );
  }, []);

  const deleteBox = useCallback((id: string) => {
    setBoxes((prev) => prev.filter((b) => b.id !== id));
    setActiveId((prev) => (prev === id ? null : prev));
  }, []);

  const duplicateBox = useCallback((id: string) => {
    const target = boxes.find((b) => b.id === id);
    if (!target) return;
    const duplicated: Box = {
      ...target,
      id: crypto.randomUUID(),
      x: Math.min(CANVAS_WIDTH - target.width, target.x + 20),
      y: Math.min(CANVAS_HEIGHT - target.height, target.y + 20),
      label: `${target.label || "Placeholder"} (Copy)`
    };
    setBoxes((prev) => [...prev, duplicated]);
    setActiveId(duplicated.id);
  }, [boxes]);

  const moveLayer = useCallback((id: string, direction: "up" | "down") => {
    setBoxes((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx === -1) return prev;
      const targetIdx = direction === "up" ? idx + 1 : idx - 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  }, []);

  const changeRadius = (value: number) => {
    setGlobalRadius(value);
    if (activeId) {
      updateBox(activeId, { radius: value });
    }
  };

  const changeColor = (value: string) => {
    setGlobalBackground(value);
    if (activeId) {
      updateBox(activeId, { background: value });
    }
  };

  const uploadCanvasImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCanvasImage(url);
  };

  const removeCanvasImage = () => {
    setCanvasImage(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && activeId) {
        deleteBox(activeId);
      } else if (e.key === "Escape") {
        setActiveId(null);
      } else if (
        activeId &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const target = boxes.find((b) => b.id === activeId);
        if (!target) return;

        let deltaX = 0;
        let deltaY = 0;
        if (e.key === "ArrowLeft") deltaX = -step;
        if (e.key === "ArrowRight") deltaX = step;
        if (e.key === "ArrowUp") deltaY = -step;
        if (e.key === "ArrowDown") deltaY = step;

        updateBox(activeId, {
          x: Math.max(0, Math.min(CANVAS_WIDTH - target.width, target.x + deltaX)),
          y: Math.max(0, Math.min(CANVAS_HEIGHT - target.height, target.y + deltaY))
        });
      }
    };

    const handleClick = () => setContextMenu(null);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleClick);
    };
  }, [activeId, boxes, deleteBox, updateBox]);

  const SNAP_THRESHOLD = 8; // Pixel threshold for magnetic snap

  // Dragging logic - with magnetic guideline snapping & barrier highlight
  const dragStart = (e: React.MouseEvent, box: Box) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveId(box.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = box.x;
    const initialY = box.y;

    const move = (ev: MouseEvent) => {
      const deltaX = (ev.clientX - startX) / zoom;
      const deltaY = (ev.clientY - startY) / zoom;

      let rawX = Math.round(initialX + deltaX);
      let rawY = Math.round(initialY + deltaY);

      const activeSnapped: string[] = [];

      // Check horizontal guides snapping (Y axis alignment)
      guides.forEach((g) => {
        if (g.type === "horizontal") {
          if (Math.abs(rawY - g.position) <= SNAP_THRESHOLD) {
            rawY = g.position;
            activeSnapped.push(g.id);
          } else if (Math.abs(rawY + box.height - g.position) <= SNAP_THRESHOLD) {
            rawY = g.position - box.height;
            activeSnapped.push(g.id);
          } else if (Math.abs(rawY + box.height / 2 - g.position) <= SNAP_THRESHOLD) {
            rawY = g.position - Math.round(box.height / 2);
            activeSnapped.push(g.id);
          }
        } else if (g.type === "vertical") {
          if (Math.abs(rawX - g.position) <= SNAP_THRESHOLD) {
            rawX = g.position;
            activeSnapped.push(g.id);
          } else if (Math.abs(rawX + box.width - g.position) <= SNAP_THRESHOLD) {
            rawX = g.position - box.width;
            activeSnapped.push(g.id);
          } else if (Math.abs(rawX + box.width / 2 - g.position) <= SNAP_THRESHOLD) {
            rawX = g.position - Math.round(box.width / 2);
            activeSnapped.push(g.id);
          }
        }
      });

      setSnappedGuideIds(activeSnapped);

      updateBox(box.id, {
        x: rawX,
        y: rawY
      });
    };

    const stop = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
      setSnappedGuideIds([]);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);
  };

  // Resizing logic - with magnetic guideline snapping & barrier highlight
  const resizeStart = (
    e: React.MouseEvent,
    box: Box,
    direction: "se" | "sw" | "ne" | "nw"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveId(box.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const { x: initialX, y: initialY, width: initialW, height: initialH } = box;

    const move = (ev: MouseEvent) => {
      const deltaX = (ev.clientX - startX) / zoom;
      const deltaY = (ev.clientY - startY) / zoom;

      let newW = initialW;
      let newH = initialH;
      let newX = initialX;
      let newY = initialY;

      if (direction.includes("e")) {
        newW = Math.max(MIN_BOX_SIZE, Math.round(initialW + deltaX));
      }
      if (direction.includes("s")) {
        newH = Math.max(MIN_BOX_SIZE, Math.round(initialH + deltaY));
      }
      if (direction.includes("w")) {
        const possibleW = Math.round(initialW - deltaX);
        if (possibleW >= MIN_BOX_SIZE) {
          newW = possibleW;
          newX = Math.round(initialX + deltaX);
        }
      }
      if (direction.includes("n")) {
        const possibleH = Math.round(initialH - deltaY);
        if (possibleH >= MIN_BOX_SIZE) {
          newH = possibleH;
          newY = Math.round(initialY + deltaY);
        }
      }

      const activeSnapped: string[] = [];

      guides.forEach((g) => {
        if (g.type === "horizontal") {
          if (direction.includes("s") && Math.abs(newY + newH - g.position) <= SNAP_THRESHOLD) {
            newH = Math.max(MIN_BOX_SIZE, g.position - newY);
            activeSnapped.push(g.id);
          } else if (direction.includes("n") && Math.abs(newY - g.position) <= SNAP_THRESHOLD) {
            const diff = newY - g.position;
            newY = g.position;
            newH = Math.max(MIN_BOX_SIZE, newH + diff);
            activeSnapped.push(g.id);
          }
        } else if (g.type === "vertical") {
          if (direction.includes("e") && Math.abs(newX + newW - g.position) <= SNAP_THRESHOLD) {
            newW = Math.max(MIN_BOX_SIZE, g.position - newX);
            activeSnapped.push(g.id);
          } else if (direction.includes("w") && Math.abs(newX - g.position) <= SNAP_THRESHOLD) {
            const diff = newX - g.position;
            newX = g.position;
            newW = Math.max(MIN_BOX_SIZE, newW + diff);
            activeSnapped.push(g.id);
          }
        }
      });

      setSnappedGuideIds(activeSnapped);

      updateBox(box.id, {
        x: newX,
        y: newY,
        width: newW,
        height: newH
      });
    };

    const stop = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
      setSnappedGuideIds([]);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);
  };

  // Clean, high-resolution HTML5 Canvas 2D export (Prevents lab color error)
  const download = async () => {
    try {
      setIsExporting(true);
      const scale = 2; // 2x HD Resolution Export
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = CANVAS_WIDTH * scale;
      exportCanvas.height = CANVAS_HEIGHT * scale;
      const ctx = exportCanvas.getContext("2d");

      if (!ctx) return;

      // Fill background
      ctx.fillStyle = canvasBgColor;
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      // Draw background image if available
      if (canvasImage) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            ctx.drawImage(img, 0, 0, exportCanvas.width, exportCanvas.height);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = canvasImage;
        });
      }

      // Draw placeholder boxes
      boxes.forEach((box) => {
        ctx.save();
        ctx.fillStyle = box.background;

        const bx = box.x * scale;
        const by = box.y * scale;
        const bw = box.width * scale;
        const bh = box.height * scale;
        const br = Math.min(box.radius * scale, bw / 2, bh / 2);

        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(bx, by, bw, bh, br);
        } else {
          ctx.moveTo(bx + br, by);
          ctx.arcTo(bx + bw, by, bx + bw, by + bh, br);
          ctx.arcTo(bx + bw, by + bh, bx, by + bh, br);
          ctx.arcTo(bx, by + bh, bx, by, br);
          ctx.arcTo(bx, by, bx + bw, by, br);
          ctx.closePath();
        }
        ctx.fill();
        ctx.restore();
      });

      const dataUrl = exportCanvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.download = `placeholder-canvas-${Date.now()}.png`;
      a.href = dataUrl;
      a.click();
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans select-none">
      {/* Top White Header */}
      <header className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-linear-to-tr from-blue-600 to-indigo-600 rounded-lg shadow-md shadow-blue-500/20 text-white">
            <FiMaximize2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Placeholder Studio
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 font-medium">
                16:9 HD
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Interactive layout builder ({boxes.length} elements)
            </p>
          </div>
        </div>

        {/* Action Header Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              showGrid
                ? "bg-blue-50 text-blue-700 border border-blue-200"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
            }`}
            title="Toggle Grid Lines"
          >
            <FiGrid className="w-4 h-4" />
            Grid
          </button>

          <button
            onClick={() => setShowRulers(!showRulers)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              showRulers
                ? "bg-blue-50 text-blue-700 border border-blue-200"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
            }`}
            title="Toggle Photoshop Rulers & Guides"
          >
            <FiCompass className="w-4 h-4" />
            Rulers
          </button>

          <button
            onClick={() => setBoxes([])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 transition"
            title="Clear All Boxes"
          >
            <FiRotateCcw className="w-3.5 h-3.5" />
            Clear
          </button>

          <div className="h-4 w-px bg-slate-200 my-auto" />

          <button
            onClick={download}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 active:scale-95 transition disabled:opacity-50"
          >
            <FiDownload className="w-4 h-4" />
            {isExporting ? "Rendering PNG..." : "Export PNG"}
          </button>
        </div>
      </header>

      {/* Top Placeholders Item Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center gap-3 overflow-x-auto z-20 shadow-xs">
        <div className="flex items-center gap-1.5 shrink-0 text-xs font-semibold text-slate-700 mr-1">
          <FiLayers className="w-4 h-4 text-blue-600" />
          <span>Created Items ({boxes.length}):</span>
        </div>

        {boxes.length === 0 ? (
          <span className="text-xs text-slate-400 italic">
            No placeholders created yet. Click "Add Placeholder" to begin.
          </span>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-thin">
            {boxes.map((box, index) => {
              const isActive = box.id === activeId;
              return (
                <button
                  key={box.id}
                  onClick={() => setActiveId(box.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition border ${
                    isActive
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-300"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                    style={{ backgroundColor: box.background }}
                  />
                  <span>{box.label || `Item ${index + 1}`}</span>
                  <span
                    className={`text-[10px] font-mono ${
                      isActive ? "text-blue-100" : "text-slate-400"
                    }`}
                  >
                    {box.width}×{box.height}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Light Sidebar */}
        <aside className="w-80 border-r border-slate-200 bg-white flex flex-col z-20 overflow-y-auto shadow-sm">
          <div className="p-4 space-y-6">
            {/* Add Placeholder Button */}
            <div>
              <button
                onClick={addBox}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-md active:scale-[0.98] transition"
              >
                <FiPlus className="w-5 h-5" />
                Add Placeholder
              </button>
              <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                Adds a resizable placeholder box
              </p>
            </div>

            {/* Selected Element Controls */}
            {activeBox ? (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <FiSliders className="w-3.5 h-3.5 text-blue-600" />
                    Selected Item
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveLayer(activeBox.id, "up")}
                      className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200 transition"
                      title="Move Up Layer"
                    >
                      <FiArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveLayer(activeBox.id, "down")}
                      className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200 transition"
                      title="Move Down Layer"
                    >
                      <FiArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => duplicateBox(activeBox.id)}
                      className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-200 transition"
                      title="Duplicate"
                    >
                      <FiCopy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteBox(activeBox.id)}
                      className="p-1 text-slate-500 hover:text-red-600 rounded hover:bg-slate-200 transition"
                      title="Delete"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Label Field */}
                <div>
                  <label className="text-[11px] text-slate-600 font-medium block mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    value={activeBox.label || ""}
                    onChange={(e) =>
                      updateBox(activeBox.id, { label: e.target.value })
                    }
                    placeholder="Placeholder label..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                {/* Position & Size Grids */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">
                      X Pos (px)
                    </label>
                    <input
                      type="number"
                      value={activeBox.x}
                      onChange={(e) =>
                        updateBox(activeBox.id, {
                          x: Number(e.target.value)
                        })
                      }
                      className="w-full bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">
                      Y Pos (px)
                    </label>
                    <input
                      type="number"
                      value={activeBox.y}
                      onChange={(e) =>
                        updateBox(activeBox.id, {
                          y: Number(e.target.value)
                        })
                      }
                      className="w-full bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">
                      Width (px)
                    </label>
                    <input
                      type="number"
                      min={MIN_BOX_SIZE}
                      value={activeBox.width}
                      onChange={(e) =>
                        updateBox(activeBox.id, {
                          width: Math.max(MIN_BOX_SIZE, Number(e.target.value))
                        })
                      }
                      className="w-full bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">
                      Height (px)
                    </label>
                    <input
                      type="number"
                      min={MIN_BOX_SIZE}
                      value={activeBox.height}
                      onChange={(e) =>
                        updateBox(activeBox.id, {
                          height: Math.max(MIN_BOX_SIZE, Number(e.target.value))
                        })
                      }
                      className="w-full bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Radius Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">Border Radius</span>
                    <span className="text-slate-800 font-mono">
                      {activeBox.radius}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={activeBox.radius}
                    onChange={(e) => changeRadius(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* Color Selector */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-slate-600">Background Color</span>
                    <span className="text-slate-700 font-mono text-[11px]">
                      {activeBox.background}
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={activeBox.background}
                      onChange={(e) => changeColor(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0 bg-transparent"
                    />
                    <div className="flex-1 flex flex-wrap gap-1">
                      {COLOR_PRESETS.slice(0, 10).map((c) => (
                        <button
                          key={c}
                          onClick={() => changeColor(c)}
                          style={{ backgroundColor: c }}
                          className={`w-5 h-5 rounded-full border border-slate-300 transition transform hover:scale-110 ${
                            activeBox.background === c
                              ? "ring-2 ring-blue-500"
                              : ""
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 text-xs">
                Select an element on canvas to inspect & edit properties
              </div>
            )}

            {/* Canvas Image Settings */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <FiImage className="w-3.5 h-3.5 text-slate-500" />
                Canvas Background
              </h3>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={uploadCanvasImage}
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition"
                >
                  <FiUpload className="w-3.5 h-3.5" />
                  Upload Image
                </button>

                {canvasImage ? (
                  <button
                    onClick={removeCanvasImage}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition"
                  >
                    <FiX className="w-3.5 h-3.5" />
                    Remove
                  </button>
                ) : (
                  <div className="flex items-center justify-between px-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] text-slate-500">Color:</span>
                    <input
                      type="color"
                      value={canvasBgColor}
                      onChange={(e) => setCanvasBgColor(e.target.value)}
                      className="w-5 h-5 rounded border border-slate-300 bg-transparent cursor-pointer p-0"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Color Swatches */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <h3 className="text-xs font-semibold text-slate-600">
                Preset Palette
              </h3>
              <div className="grid grid-cols-5 gap-1.5">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => changeColor(c)}
                    style={{ backgroundColor: c }}
                    className="h-7 rounded-md border border-slate-300 hover:border-slate-800 transition transform active:scale-95 shadow-xs"
                    title={c}
                  />
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main White Canvas Area */}
        <main
          className="flex-1 bg-slate-100 p-6 flex flex-col items-center justify-center relative overflow-auto"
          onClick={(e) => {
            // Deselect active box only if clicked directly on background container
            if (e.target === e.currentTarget) {
              setActiveId(null);
            }
          }}
        >
          {/* Zoom controls */}
          <div className="absolute top-4 right-6 z-10 flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs text-slate-600 shadow-sm">
            <span>Zoom:</span>
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
              className="px-1.5 hover:text-slate-900 font-bold"
            >
              -
            </button>
            <span className="font-mono text-slate-900">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
              className="px-1.5 hover:text-slate-900 font-bold"
            >
              +
            </button>
            <button
              onClick={() => setZoom(1)}
              className="ml-1 text-[10px] text-blue-600 hover:underline"
            >
              Reset
            </button>
          </div>

          {/* 16:9 Canvas Frame with Photoshop Rulers & Guides */}
          <div
            className="flex flex-col items-center transition-transform duration-100 ease-out"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* Top Horizontal Photoshop Ruler ("Inch Tape") */}
            {showRulers && (
              <div
                onMouseDown={(e) => startGuideDrag("horizontal", e)}
                className="flex items-end border-b border-slate-300 bg-slate-200 text-[9px] font-mono text-slate-600 select-none relative overflow-hidden shadow-xs cursor-ns-resize group"
                title="Drag down to pull a horizontal guide line"
                style={{
                  width: `${CANVAS_WIDTH}px`,
                  height: "22px",
                  marginLeft: "22px"
                }}
              >
                {Array.from({ length: Math.floor(CANVAS_WIDTH / 10) + 1 }).map(
                  (_, i) => {
                    const x = i * 10;
                    const isMajor = x % 50 === 0;
                    return (
                      <div
                        key={i}
                        className="absolute bottom-0 border-l border-slate-400"
                        style={{
                          left: `${x}px`,
                          height: isMajor ? "14px" : "6px"
                        }}
                      >
                        {isMajor && (
                          <span className="absolute -top-3.5 left-1 text-[8px] font-medium text-slate-700">
                            {x}
                          </span>
                        )}
                      </div>
                    );
                  }
                )}
                {/* Dynamic Red Mouse Tracker Line on Top Ruler */}
                {mousePos && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 shadow-xs"
                    style={{ left: `${mousePos.x}px` }}
                  />
                )}
              </div>
            )}

            <div className="flex">
              {/* Left Vertical Photoshop Ruler ("Inch Tape") */}
              {showRulers && (
                <div
                  onMouseDown={(e) => startGuideDrag("vertical", e)}
                  className="flex flex-col items-end border-r border-slate-300 bg-slate-200 text-[9px] font-mono text-slate-600 select-none relative overflow-hidden shadow-xs shrink-0 cursor-ew-resize group"
                  title="Drag right to pull a vertical guide line"
                  style={{
                    height: `${CANVAS_HEIGHT}px`,
                    width: "22px"
                  }}
                >
                  {Array.from({
                    length: Math.floor(CANVAS_HEIGHT / 10) + 1
                  }).map((_, i) => {
                    const y = i * 10;
                    const isMajor = y % 50 === 0;
                    return (
                      <div
                        key={i}
                        className="absolute right-0 border-t border-slate-400"
                        style={{
                          top: `${y}px`,
                          width: isMajor ? "14px" : "6px"
                        }}
                      >
                        {isMajor && (
                          <span className="absolute right-3.5 -top-1.5 text-[8px] font-medium text-slate-700">
                            {y}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {/* Dynamic Red Mouse Tracker Line on Left Ruler */}
                  {mousePos && (
                    <div
                      className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 shadow-xs"
                      style={{ top: `${mousePos.y}px` }}
                    />
                  )}
                </div>
              )}

              {/* Main Canvas Frame */}
              <div
                ref={canvasRef}
                onMouseMove={(e) => {
                  if (!canvasRef.current) return;
                  const rect = canvasRef.current.getBoundingClientRect();
                  const x = Math.max(
                    0,
                    Math.min(
                      CANVAS_WIDTH,
                      Math.round((e.clientX - rect.left) / zoom)
                    )
                  );
                  const y = Math.max(
                    0,
                    Math.min(
                      CANVAS_HEIGHT,
                      Math.round((e.clientY - rect.top) / zoom)
                    )
                  );
                  setMousePos({ x, y });
                }}
                onMouseLeave={() => setMousePos(null)}
                onClick={(e) => {
                  if (e.target === canvasRef.current) {
                    setActiveId(null);
                  }
                }}
                className="relative shadow-xl border border-slate-300 overflow-hidden select-none bg-white transition-colors"
                style={{
                  width: `${CANVAS_WIDTH}px`,
                  height: `${CANVAS_HEIGHT}px`,
                  backgroundColor: canvasBgColor,
                  backgroundImage: canvasImage
                    ? `url(${canvasImage})`
                    : showGrid
                    ? `radial-gradient(circle, rgba(0,0,0,0.12) 1px, transparent 1px)`
                    : undefined,
                  backgroundSize: canvasImage ? "cover" : "20px 20px",
                  backgroundPosition: "center"
                }}
              >
                {/* Dynamic Photoshop Crosshair Alignment Guidelines */}
                {mousePos && showRulers && (
                  <>
                    {/* Vertical guideline */}
                    <div
                      className="absolute top-0 bottom-0 border-l border-dashed border-cyan-500/60 pointer-events-none z-30"
                      style={{ left: `${mousePos.x}px` }}
                    />
                    {/* Horizontal guideline */}
                    <div
                      className="absolute left-0 right-0 border-t border-dashed border-cyan-500/60 pointer-events-none z-30"
                      style={{ top: `${mousePos.y}px` }}
                    />
                    {/* Position Tooltip Badge */}
                    <div
                      className="absolute bg-slate-900/90 text-white text-[9px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-none z-40"
                      style={{
                        left: `${Math.min(mousePos.x + 10, CANVAS_WIDTH - 80)}px`,
                        top: `${Math.min(mousePos.y + 10, CANVAS_HEIGHT - 25)}px`
                      }}
                    >
                      X: {mousePos.x}px | Y: {mousePos.y}px
                    </div>
                  </>
                )}

                {/* Center Snap Lines */}
                <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-red-400/20 pointer-events-none z-10" />
                <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-red-400/20 pointer-events-none z-10" />

                {/* Pulled Custom Photoshop Guidelines (Red Spot & Red Line Overlay) */}
                {guides.map((guide) => {
                  const isSnapped = snappedGuideIds.includes(guide.id);
                  return (
                    <div
                      key={guide.id}
                      onMouseDown={(e) => startGuideMove(guide, e)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setGuides((prev) =>
                          prev.filter((g) => g.id !== guide.id)
                        );
                      }}
                      className={`absolute z-35 group transition-all ${
                        guide.type === "horizontal"
                          ? `left-0 right-0 h-2 -top-1 cursor-ns-resize border-t-2 ${
                              isSnapped
                                ? "border-red-600 shadow-[0_0_12px_rgba(239,68,68,0.9)] bg-red-500/20"
                                : "border-red-500 hover:border-red-600"
                            }`
                          : `top-0 bottom-0 w-2 -left-1 cursor-ew-resize border-l-2 ${
                              isSnapped
                                ? "border-red-600 shadow-[0_0_12px_rgba(239,68,68,0.9)] bg-red-500/20"
                                : "border-red-500 hover:border-red-600"
                            }`
                      }`}
                      style={
                        guide.type === "horizontal"
                          ? { top: `${guide.position}px` }
                          : { left: `${guide.position}px` }
                      }
                      title="Drag to move, double-click to remove"
                    >
                      {/* Red Spot Handle Indicator */}
                      <div
                        className={`absolute w-3 h-3 rounded-full border-2 border-white shadow-md transition-transform ${
                          isSnapped
                            ? "bg-red-600 scale-125 ring-4 ring-red-400/50 animate-pulse"
                            : "bg-red-600 group-hover:scale-125"
                        } ${
                          guide.type === "horizontal"
                            ? "left-2 -top-1.5"
                            : "top-2 -left-1.5"
                        }`}
                      />

                      {/* Hover Tooltip or Snapped Alignment Barrier Badge */}
                      <div
                        className={`${
                          isSnapped ? "block" : "hidden group-hover:block"
                        } absolute bg-red-600 text-white text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap left-5 top-1 z-40`}
                      >
                        {isSnapped
                          ? `SNAPPED STRAIGHT (Aligned: ${guide.position}px)`
                          : `${
                              guide.type === "horizontal"
                                ? `Y: ${guide.position}px`
                                : `X: ${guide.position}px`
                            } (Double click to delete)`}
                      </div>
                    </div>
                  );
                })}
              {/* Render Placeholder Boxes */}
              {boxes.map((box) => {
                const isActive = box.id === activeId;
                return (
                  <div
                    key={box.id}
                    onMouseDown={(e) => dragStart(e, box)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveId(box.id);
                      setContextMenu({
                        x: Math.min(e.clientX, window.innerWidth - 180),
                        y: Math.min(e.clientY, window.innerHeight - 180),
                        boxId: box.id
                      });
                    }}
                    className={`absolute cursor-move group transition-shadow ${
                      isActive
                        ? "ring-2 ring-blue-600 ring-offset-1 shadow-lg z-20"
                        : "hover:ring-1 hover:ring-blue-400 z-10"
                    }`}
                    style={{
                      left: `${box.x}px`,
                      top: `${box.y}px`,
                      width: `${box.width}px`,
                      height: `${box.height}px`,
                      backgroundColor: box.background,
                      borderRadius: `${box.radius}px`
                    }}
                  >
                    {/* Inner Label */}
                    <div className="w-full h-full flex items-center justify-center p-1 overflow-hidden pointer-events-none">
                      <span className="text-[11px] font-medium text-slate-700/80 truncate drop-shadow-xs">
                        {box.label || `H: ${box.height}px`}
                      </span>
                    </div>

                    {/* Resize Handles (Active Box) */}
                    {isActive && (
                      <>
                        {/* SE Handle */}
                        <div
                          onMouseDown={(e) => resizeStart(e, box, "se")}
                          className="absolute right-[-6px] bottom-[-6px] w-4 h-4 bg-blue-600 border-2 border-white rounded-full cursor-se-resize shadow-md hover:scale-125 transition z-30"
                        />
                        {/* SW Handle */}
                        <div
                          onMouseDown={(e) => resizeStart(e, box, "sw")}
                          className="absolute left-[-6px] bottom-[-6px] w-4 h-4 bg-blue-600 border-2 border-white rounded-full cursor-sw-resize shadow-md hover:scale-125 transition z-30"
                        />
                        {/* NE Handle */}
                        <div
                          onMouseDown={(e) => resizeStart(e, box, "ne")}
                          className="absolute right-[-6px] top-[-6px] w-4 h-4 bg-blue-600 border-2 border-white rounded-full cursor-ne-resize shadow-md hover:scale-125 transition z-30"
                        />
                        {/* NW Handle */}
                        <div
                          onMouseDown={(e) => resizeStart(e, box, "nw")}
                          className="absolute left-[-6px] top-[-6px] w-4 h-4 bg-blue-600 border-2 border-white rounded-full cursor-nw-resize shadow-md hover:scale-125 transition z-30"
                        />

                        {/* Live Dimension Badge */}
                        <div className="absolute left-1/2 -bottom-6 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-30">
                          {box.width} × {box.height}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </main>
      </div>

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-xl py-1 text-xs w-44 font-medium text-slate-700 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              duplicateBox(contextMenu.boxId);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 hover:bg-slate-100 flex items-center gap-2 text-slate-800 transition"
          >
            <FiCopy className="w-3.5 h-3.5 text-blue-600" />
            <span>Duplicate</span>
          </button>
          <button
            onClick={() => {
              moveLayer(contextMenu.boxId, "up");
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 hover:bg-slate-100 flex items-center gap-2 text-slate-800 transition"
          >
            <FiArrowUp className="w-3.5 h-3.5 text-slate-500" />
            <span>Bring Forward</span>
          </button>
          <button
            onClick={() => {
              moveLayer(contextMenu.boxId, "down");
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 hover:bg-slate-100 flex items-center gap-2 text-slate-800 transition"
          >
            <FiArrowDown className="w-3.5 h-3.5 text-slate-500" />
            <span>Send Backward</span>
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            onClick={() => {
              deleteBox(contextMenu.boxId);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 transition"
          >
            <FiTrash2 className="w-3.5 h-3.5 text-red-600" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}