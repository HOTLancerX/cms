"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Dropzone } from "./Dropzone";
import { WireframePreview } from "./WireframePreview";

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [wireframeSvg, setWireframeSvg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Process uploaded image strictly with Gemini AI route
  const processImage = async (dataUrl: string) => {
    setSelectedImage(dataUrl);
    setIsProcessing(true);

    try {
      const res = await fetch("/api/extract-wireframe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: dataUrl,
          theme: "slate",
          detailLevel: "standard",
        }),
      });

      const data = await res.json();

      if (res.ok && data.svg) {
        setWireframeSvg(data.svg);
      } else {
        alert(data.error || "Failed to extract wireframe layout with Gemini AI.");
      }
    } catch (err: any) {
      console.error("Extraction error:", err);
      alert(err.message || "Failed to communicate with wireframe extraction endpoint.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Global Clipboard Image Paste Handler (Ctrl+V / Cmd+V)
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              const url = event.target.result as string;
              setSelectedImage(url);
              processImage(url);
            }
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [handlePaste]);

  const handleClearImage = () => {
    setSelectedImage(null);
    setWireframeSvg(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      {/* Left Column: Upload Box & Image Preview */}
      <div className="lg:col-span-3">
        <Dropzone
          selectedImage={selectedImage}
          onImageSelected={(dataUrl) => {
            setSelectedImage(dataUrl);
            processImage(dataUrl);
          }}
          onClearImage={handleClearImage}
          onGenerate={() => selectedImage && processImage(selectedImage)}
          isProcessing={isProcessing}
        />
      </div>

      {/* Right Column: 16:9 Vector Workspace & Direct PNG Export */}
      <div className="lg:col-span-9">
        <WireframePreview
          wireframeSvg={wireframeSvg}
          isProcessing={isProcessing}
        />
      </div>
    </div>
  );
}