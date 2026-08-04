"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";

interface GalleryEditingProps {
  initialImage: string | null;
  onLibraryRefresh: () => void;
  onSwitchTab: (tab: "library") => void;
}

type AspectRatioType = "free" | "1:1" | "4:3" | "16:9" | "9:16" | "3:2";

interface CropRect {
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  width: number; // percentage 0 - 100
  height: number; // percentage 0 - 100
}

interface AdjustmentState {
  brightness: number; // 0 to 200 (default 100)
  contrast: number; // 0 to 200 (default 100)
  saturation: number; // 0 to 200 (default 100)
  blur: number; // 0 to 20 (default 0)
  hueRotate: number; // 0 to 360 (default 0)
  grayscale: number; // 0 to 100 (default 0)
  sepia: number; // 0 to 100 (default 0)
  invert: number; // 0 to 100 (default 0)
  rotation: number; // -180 to 180 (default 0)
  flipH: boolean;
  flipV: boolean;
  aspectRatio: AspectRatioType;
}

const DEFAULT_CROP: CropRect = { x: 0, y: 0, width: 100, height: 100 };

const DEFAULT_ADJUSTMENTS: AdjustmentState = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  hueRotate: 0,
  grayscale: 0,
  sepia: 0,
  invert: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
  aspectRatio: "free",
};

const PRESETS = [
  {
    name: "Normal",
    values: { brightness: 100, contrast: 100, saturation: 100, grayscale: 0, sepia: 0, hueRotate: 0 },
  },
  {
    name: "Vivid",
    values: { brightness: 110, contrast: 120, saturation: 140, grayscale: 0, sepia: 0, hueRotate: 0 },
  },
  {
    name: "Vintage",
    values: { brightness: 95, contrast: 90, saturation: 80, grayscale: 0, sepia: 40, hueRotate: 0 },
  },
  {
    name: "Monochrome",
    values: { brightness: 105, contrast: 125, saturation: 0, grayscale: 100, sepia: 0, hueRotate: 0 },
  },
  {
    name: "Warm",
    values: { brightness: 105, contrast: 105, saturation: 115, grayscale: 0, sepia: 20, hueRotate: 15 },
  },
  {
    name: "Cool",
    values: { brightness: 100, contrast: 105, saturation: 110, grayscale: 0, sepia: 0, hueRotate: 190 },
  },
];

export default function GalleryEditing({
  initialImage,
  onLibraryRefresh,
  onSwitchTab,
}: GalleryEditingProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(initialImage);
  const [imageName, setImageName] = useState<string>("edited-image.webp");
  const [adjustments, setAdjustments] = useState<AdjustmentState>(DEFAULT_ADJUSTMENTS);
  const [cropRect, setCropRect] = useState<CropRect>(DEFAULT_CROP);
  const [isCroppingActive, setIsCroppingActive] = useState<boolean>(false);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"adjust" | "transform" | "presets">("adjust");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);

  // Drag state for interactive crop box selection
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; initialRect: CropRect }>({
    startX: 0,
    startY: 0,
    initialRect: DEFAULT_CROP,
  });

  // Load image when initialImage or imageSrc changes
  useEffect(() => {
    if (!imageSrc) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      loadedImageRef.current = img;
      renderCanvas();
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Re-render canvas whenever adjustments or cropRect change
  useEffect(() => {
    if (loadedImageRef.current) {
      renderCanvas();
    }
  }, [adjustments, cropRect]);

  const renderCanvas = () => {
    const img = loadedImageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const fullWidth = img.naturalWidth || img.width;
    const fullHeight = img.naturalHeight || img.height;

    // Crop box source coordinates in pixels
    const sx = Math.max(0, (fullWidth * cropRect.x) / 100);
    const sy = Math.max(0, (fullHeight * cropRect.y) / 100);
    const sw = Math.min(fullWidth - sx, (fullWidth * cropRect.width) / 100);
    const sh = Math.min(fullHeight - sy, (fullHeight * cropRect.height) / 100);

    let width = sw;
    let height = sh;

    // Apply aspect ratio adjustments if ratio selected
    if (adjustments.aspectRatio !== "free") {
      let targetRatio = 1;
      switch (adjustments.aspectRatio) {
        case "1:1":
          targetRatio = 1;
          break;
        case "4:3":
          targetRatio = 4 / 3;
          break;
        case "16:9":
          targetRatio = 16 / 9;
          break;
        case "9:16":
          targetRatio = 9 / 16;
          break;
        case "3:2":
          targetRatio = 3 / 2;
          break;
      }

      const currentRatio = width / height;
      if (currentRatio > targetRatio) {
        width = height * targetRatio;
      } else {
        height = width / targetRatio;
      }
    }

    // Canvas dimensions (swap width/height if rotated 90 or 270 deg)
    const rad = (adjustments.rotation * Math.PI) / 180;
    const absCos = Math.abs(Math.cos(rad));
    const absSin = Math.abs(Math.sin(rad));
    const boundW = width * absCos + height * absSin;
    const boundH = width * absSin + height * absCos;

    canvas.width = Math.round(boundW);
    canvas.height = Math.round(boundH);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Move to center for transformations
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rad);
    ctx.scale(adjustments.flipH ? -1 : 1, adjustments.flipV ? -1 : 1);

    // Apply CSS filters directly to canvas context
    const filterString = [
      `brightness(${adjustments.brightness}%)`,
      `contrast(${adjustments.contrast}%)`,
      `saturate(${adjustments.saturation}%)`,
      `blur(${adjustments.blur}px)`,
      `hue-rotate(${adjustments.hueRotate}deg)`,
      `grayscale(${adjustments.grayscale}%)`,
      `sepia(${adjustments.sepia}%)`,
      `invert(${adjustments.invert}%)`,
    ].join(" ");

    ctx.filter = filterString;

    // Draw cropped region centered on canvas
    const drawSx = sx + (sw - width) / 2;
    const drawSy = sy + (sh - height) / 2;

    ctx.drawImage(img, drawSx, drawSy, width, height, -width / 2, -height / 2, width, height);

    ctx.restore();
  };

  // Interactive Drag to Crop Event Handlers
  const handleCropMouseDown = (handle: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragHandle(handle);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialRect: { ...cropRect },
    };
  };

  useEffect(() => {
    if (!dragHandle) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = cropContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const deltaX = ((e.clientX - dragStartRef.current.startX) / rect.width) * 100;
      const deltaY = ((e.clientY - dragStartRef.current.startY) / rect.height) * 100;

      const init = dragStartRef.current.initialRect;
      let newRect = { ...init };

      if (dragHandle === "move") {
        newRect.x = Math.max(0, Math.min(100 - init.width, init.x + deltaX));
        newRect.y = Math.max(0, Math.min(100 - init.height, init.y + deltaY));
      } else {
        if (dragHandle.includes("left")) {
          const newX = Math.max(0, Math.min(init.x + init.width - 5, init.x + deltaX));
          newRect.width = init.width + (init.x - newX);
          newRect.x = newX;
        }
        if (dragHandle.includes("right")) {
          newRect.width = Math.max(5, Math.min(100 - init.x, init.width + deltaX));
        }
        if (dragHandle.includes("top")) {
          const newY = Math.max(0, Math.min(init.y + init.height - 5, init.y + deltaY));
          newRect.height = init.height + (init.y - newY);
          newRect.y = newY;
        }
        if (dragHandle.includes("bottom")) {
          newRect.height = Math.max(5, Math.min(100 - init.y, init.height + deltaY));
        }
      }

      setCropRect(newRect);
    };

    const handleMouseUp = () => {
      setDragHandle(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragHandle]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) return;

    setImageName(file.name.replace(/\.[^.]+$/, "") + "-edited.webp");
    const previewUrl = URL.createObjectURL(file);
    setImageSrc(previewUrl);
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setCropRect(DEFAULT_CROP);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const updateAdj = (key: keyof AdjustmentState, val: any) => {
    setAdjustments((prev) => ({ ...prev, [key]: val }));
  };

  const resetAll = () => {
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setCropRect(DEFAULT_CROP);
    setIsCroppingActive(false);
  };

  const rotateBy = (deg: number) => {
    setAdjustments((prev) => {
      let next = (prev.rotation + deg) % 360;
      if (next > 180) next -= 360;
      if (next < -180) next += 360;
      return { ...prev, rotation: next };
    });
  };

  const applyPreset = (presetValues: Partial<AdjustmentState>) => {
    setAdjustments((prev) => ({ ...prev, ...presetValues }));
  };

  const setPresetCrop = (ratio: AspectRatioType) => {
    updateAdj("aspectRatio", ratio);
    if (ratio === "1:1") setCropRect({ x: 10, y: 10, width: 80, height: 80 });
    else if (ratio === "16:9") setCropRect({ x: 5, y: 15, width: 90, height: 70 });
    else if (ratio === "4:3") setCropRect({ x: 5, y: 10, width: 90, height: 80 });
    else setCropRect(DEFAULT_CROP);
  };

  const exportCanvasToFile = (): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        reject(new Error("Canvas element unavailable"));
        return;
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to export canvas blob"));
            return;
          }
          const file = new File([blob], imageName, { type: "image/webp" });
          resolve(file);
        },
        "image/webp",
        0.9
      );
    });
  };

  const handleUpload = async (uploadType: "cloudinary" | "cloudflare") => {
    if (!canvasRef.current || !imageSrc) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const editedFile = await exportCanvasToFile();
      const formData = new FormData();
      formData.append("files", editedFile);
      formData.append("type", uploadType);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/library/upload-file");

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percent);
          }
        });

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network upload error"));
        xhr.send(formData);
      });

      onLibraryRefresh();
      onSwitchTab("library");
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("Failed to upload edited image: " + (err.message || "Unknown error"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {!imageSrc ? (
        /* Empty Upload Zone */
        <div
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 cursor-pointer ${
            dragActive
              ? "border-blue-500 bg-blue-50/50 shadow-inner"
              : "border-gray-200 hover:border-blue-400 hover:bg-gray-50/50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <div className="space-y-4 max-w-sm mx-auto flex flex-col items-center">
            <div className="p-4 rounded-full bg-blue-50 text-blue-500 transition duration-300">
              <Icon icon="solar:pen-new-square-bold-duotone" width={40} />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-800">Photo Editor Studio</p>
              <p className="text-xs text-gray-500 mt-1">
                Drag and drop an image here, click to choose, or click the Edit button on any Library image.
              </p>
            </div>
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              Choose Image to Edit
            </button>
          </div>
        </div>
      ) : (
        /* Main Image Editing Suite */
        <div className="space-y-5">
          {/* Header Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-white text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                disabled={uploading}
              >
                <Icon icon="solar:upload-track-bold" width={14} /> Change Image
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <button
                type="button"
                onClick={resetAll}
                className="px-3 py-1.5 border border-gray-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                disabled={uploading}
              >
                <Icon icon="solar:restart-bold" width={14} /> Reset All
              </button>
            </div>

            {/* Sub Tabs: Adjust, Transform/Crop, Presets */}
            <div className="flex gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-xs">
              {(["adjust", "transform", "presets"] as const).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => {
                    setActiveSubTab(sub);
                    if (sub === "transform") setIsCroppingActive(true);
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-md capitalize transition ${
                    activeSubTab === sub ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {sub === "transform" ? "Crop & Rotate" : sub}
                </button>
              ))}
            </div>
          </div>

          {/* Main Editing Area: Canvas Display + Interactive Crop Selection Box */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left/Center: Canvas Workspace + Bounding Box Crop Overlay */}
            <div className="lg:col-span-7 border border-gray-200 rounded-2xl bg-neutral-900 p-4 min-h-85 flex items-center justify-center relative overflow-hidden shadow-inner">
              <div ref={cropContainerRef} className="relative inline-block max-w-full max-h-115">
                <canvas ref={canvasRef} className="max-w-full max-h-115 object-contain shadow-2xl rounded-md block" />

                {/* Interactive Drag-to-Crop Bounding Box Overlay */}
                {isCroppingActive && (
                  <div className="absolute inset-0 z-30 pointer-events-auto">
                    {/* Semi-transparent dark mask */}
                    <div className="absolute inset-0 bg-black/40 pointer-events-none" />

                    {/* Active Crop Selection Box */}
                    <div
                      className="absolute border-2 border-dashed border-white shadow-2xl cursor-move bg-white/10 backdrop-brightness-110"
                      style={{
                        left: `${cropRect.x}%`,
                        top: `${cropRect.y}%`,
                        width: `${cropRect.width}%`,
                        height: `${cropRect.height}%`,
                      }}
                      onMouseDown={(e) => handleCropMouseDown("move", e)}
                    >
                      {/* Grid lines */}
                      <div className="w-full h-full border border-white/30 grid grid-cols-3 grid-rows-3 pointer-events-none">
                        <div className="border-r border-b border-white/20" />
                        <div className="border-r border-b border-white/20" />
                        <div className="border-b border-white/20" />
                        <div className="border-r border-b border-white/20" />
                        <div className="border-r border-b border-white/20" />
                        <div className="border-b border-white/20" />
                      </div>

                      {/* 8 Resize Handles */}
                      <div
                        className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize shadow-md"
                        onMouseDown={(e) => handleCropMouseDown("top-left", e)}
                      />
                      <div
                        className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize shadow-md"
                        onMouseDown={(e) => handleCropMouseDown("top-right", e)}
                      />
                      <div
                        className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize shadow-md"
                        onMouseDown={(e) => handleCropMouseDown("bottom-left", e)}
                      />
                      <div
                        className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize shadow-md"
                        onMouseDown={(e) => handleCropMouseDown("bottom-right", e)}
                      />

                      <div
                        className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-ns-resize shadow-md"
                        onMouseDown={(e) => handleCropMouseDown("top", e)}
                      />
                      <div
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-ns-resize shadow-md"
                        onMouseDown={(e) => handleCropMouseDown("bottom", e)}
                      />
                      <div
                        className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-ew-resize shadow-md"
                        onMouseDown={(e) => handleCropMouseDown("left", e)}
                      />
                      <div
                        className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-ew-resize shadow-md"
                        onMouseDown={(e) => handleCropMouseDown("right", e)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Editing Tool Controls */}
            <div className="lg:col-span-5 border border-gray-100 rounded-2xl p-4 bg-white shadow-xs space-y-4 max-h-120 overflow-y-auto">
              {/* SUB TAB 1: ADJUSTMENTS (Sliders) */}
              {activeSubTab === "adjust" && (
                <div className="space-y-3.5">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Color & Lighting</h4>

                  {/* Brightness */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-gray-700">
                      <span>Brightness</span>
                      <span>{adjustments.brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={200}
                      value={adjustments.brightness}
                      onChange={(e) => updateAdj("brightness", Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-gray-700">
                      <span>Contrast</span>
                      <span>{adjustments.contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={200}
                      value={adjustments.contrast}
                      onChange={(e) => updateAdj("contrast", Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Saturation */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-gray-700">
                      <span>Saturation</span>
                      <span>{adjustments.saturation}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={200}
                      value={adjustments.saturation}
                      onChange={(e) => updateAdj("saturation", Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Blur */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-gray-700">
                      <span>Blur</span>
                      <span>{adjustments.blur}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      value={adjustments.blur}
                      onChange={(e) => updateAdj("blur", Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Hue Rotate */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-gray-700">
                      <span>Hue Rotate</span>
                      <span>{adjustments.hueRotate}°</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={adjustments.hueRotate}
                      onChange={(e) => updateAdj("hueRotate", Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Grayscale */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-gray-700">
                      <span>Grayscale</span>
                      <span>{adjustments.grayscale}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={adjustments.grayscale}
                      onChange={(e) => updateAdj("grayscale", Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Sepia */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-gray-700">
                      <span>Sepia</span>
                      <span>{adjustments.sepia}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={adjustments.sepia}
                      onChange={(e) => updateAdj("sepia", Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* SUB TAB 2: TRANSFORM (Crop, Rotate, Flip) */}
              {activeSubTab === "transform" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Crop & Selection Area</h4>
                    <button
                      type="button"
                      onClick={() => setIsCroppingActive(!isCroppingActive)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition ${
                        isCroppingActive
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      {isCroppingActive ? "Crop Overlay Active" : "Enable Drag Crop"}
                    </button>
                  </div>

                  {/* Aspect Ratio Presets */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Aspect Ratio / Preset Selection</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["free", "1:1", "4:3", "16:9", "9:16", "3:2"] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setPresetCrop(r)}
                          className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition ${
                            adjustments.aspectRatio === r
                              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {r.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reset Crop Box */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCropRect(DEFAULT_CROP)}
                      className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition"
                    >
                      Reset Selection (Full Image)
                    </button>
                  </div>

                  {/* Rotate Quick Controls */}
                  <div className="space-y-1.5 pt-2 border-t border-gray-100">
                    <label className="text-xs font-semibold text-gray-700">Rotation</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => rotateBy(-90)}
                        className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1"
                      >
                        <Icon icon="solar:restart-bold" width={16} className="-scale-x-100" /> -90°
                      </button>
                      <button
                        type="button"
                        onClick={() => rotateBy(90)}
                        className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1"
                      >
                        <Icon icon="solar:restart-bold" width={16} /> +90°
                      </button>
                    </div>
                  </div>

                  {/* Flip Controls */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Flip Axis</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateAdj("flipH", !adjustments.flipH)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1 ${
                          adjustments.flipH
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <Icon icon="solar:mirror-left-bold" width={16} /> Flip H
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAdj("flipV", !adjustments.flipV)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1 ${
                          adjustments.flipV
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <Icon icon="solar:mirror-right-bold" width={16} /> Flip V
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB TAB 3: PRESETS */}
              {activeSubTab === "presets" && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Filter Presets</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => applyPreset(p.values)}
                        className="p-2.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl text-left transition group"
                      >
                        <span className="text-xs font-bold text-gray-800 group-hover:text-blue-600">
                          {p.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TWO UPLOAD DESTINATION BUTTONS AT BOTTOM */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-3">
            <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <Icon icon="solar:check-circle-bold" width={16} className="text-emerald-600" />
              Upload Edited Image to Media Library:
            </p>

            {uploading && (
              <div className="space-y-1.5 bg-white p-3 rounded-xl border border-emerald-200">
                <div className="flex justify-between text-xs font-bold text-emerald-700">
                  <span>Uploading edited image...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-emerald-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-1.5 rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => handleUpload("cloudinary")}
                disabled={uploading}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Icon icon="solar:upload-bold" width={16} /> Upload to Cloudinary
              </button>

              <button
                type="button"
                onClick={() => handleUpload("cloudflare")}
                disabled={uploading}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Icon icon="solar:upload-bold" width={16} /> Upload to Cloudflare
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
