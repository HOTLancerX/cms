"use client";

import React, { useCallback, useState } from "react";
import { Icon } from "@iconify/react";

interface DropzoneProps {
  selectedImage: string | null;
  onImageSelected: (dataUrl: string) => void;
  onClearImage: () => void;
  onGenerate: () => void;
  isProcessing: boolean;
}

export function Dropzone({
  selectedImage,
  onImageSelected,
  onClearImage,
  onGenerate,
  isProcessing,
}: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPG, WEBP, SVG).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        onImageSelected(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0]);
      }
    },
    [onImageSelected]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
      {!selectedImage ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            isDragging ? "border-indigo-500 bg-indigo-50/50" : "border-slate-300 hover:border-indigo-400 bg-slate-50/50"
          }`}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isProcessing}
          />
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 border border-indigo-100">
            <Icon icon="solar:upload-bold" className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-slate-800">
            Click or Drag & Drop screenshot here
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            PNG, JPG, WEBP • Or paste with <kbd className="px-1 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px]">Ctrl+V</kbd>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Icon icon="solar:gallery-bold" className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-semibold text-slate-800">Uploaded Screenshot</span>
            </div>
            <button
              onClick={onClearImage}
              disabled={isProcessing}
              type="button"
              className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer"
              title="Remove image"
            >
              <Icon icon="solar:close-circle-bold" className="w-4 h-4" />
            </button>
          </div>

          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900/5 border border-slate-200 flex items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage}
              alt="Uploaded UI screenshot"
              className="max-h-full max-w-full object-contain rounded"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>Image loaded</span>
            <button
              onClick={onClearImage}
              disabled={isProcessing}
              type="button"
              className="text-indigo-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer text-xs"
            >
              <Icon icon="solar:restart-bold" className="w-3.5 h-3.5" />
              Change Image
            </button>
          </div>

          {/* Primary Generate Button */}
          <button
            onClick={onGenerate}
            disabled={isProcessing}
            type="button"
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Icon
              icon={isProcessing ? "solar:restart-bold" : "solar:magic-stick-3-bold"}
              className={`w-4 h-4 ${isProcessing ? "animate-spin" : ""}`}
            />
            <span>{isProcessing ? "Generating Wireframe..." : "Generate Wireframe"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
