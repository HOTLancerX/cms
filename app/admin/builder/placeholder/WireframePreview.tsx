"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";

interface WireframePreviewProps {
  wireframeSvg: string | null;
  isProcessing: boolean;
}

const fixDuplicateAttributes = (svgStr: string): string => {
  if (!svgStr) return "";
  return svgStr.replace(/<([a-zA-Z0-9:-]+)\s+([^>]+)>/g, (fullMatch, tagName, attrString) => {
    const isSelfClosing = attrString.trim().endsWith("/");
    const cleanAttrStr = isSelfClosing ? attrString.trim().slice(0, -1) : attrString;

    const seenAttrs = new Set<string>();
    const cleanedAttrs: string[] = [];

    const attrRegex = /([a-zA-Z0-9:-]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/g;
    let match: RegExpExecArray | null;

    while ((match = attrRegex.exec(cleanAttrStr)) !== null) {
      const attrName = match[1].toLowerCase();
      if (!seenAttrs.has(attrName)) {
        seenAttrs.add(attrName);
        cleanedAttrs.push(match[0]);
      }
    }

    return `<${tagName} ${cleanedAttrs.join(" ")}${isSelfClosing ? " /" : ""}>`;
  });
};

const sanitizeSvg = (rawSvg: string | null): string => {
  if (!rawSvg) return "";
  const cleanedRaw = fixDuplicateAttributes(rawSvg);
  if (typeof window === "undefined") return cleanedRaw;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanedRaw, "image/svg+xml");

    // Remove top header containers & top navigation bars
    const headerSelectors = ["#header-container", "#header", "#top-nav", "#navbar"];
    headerSelectors.forEach((sel) => {
      doc.querySelectorAll(sel).forEach((el) => el.remove());
    });

    // Remove top full-width header rects (y <= 40, width >= 1800)
    doc.querySelectorAll("rect").forEach((rect) => {
      const y = parseFloat(rect.getAttribute("y") || "0");
      const width = parseFloat(rect.getAttribute("width") || "0");
      const height = parseFloat(rect.getAttribute("height") || "0");
      if (y <= 40 && width >= 1800 && height <= 90) {
        rect.remove();
      }
    });

    // Remove avatar circles and unwanted placeholder words
    doc.querySelectorAll("text").forEach((textEl) => {
      const content = (textEl.textContent || "").trim();
      if (["IMAGE", "LOGO", "Action", "Search application..."].includes(content)) {
        textEl.remove();
      }
    });

    doc.querySelectorAll("circle").forEach((circleEl) => {
      const r = parseFloat(circleEl.getAttribute("r") || "0");
      const cy = parseFloat(circleEl.getAttribute("cy") || "0");
      if ((r >= 18 && r <= 30 && cy <= 80) || (r >= 20 && r <= 30 && cy >= 350 && cy <= 480)) {
        circleEl.remove();
      }
    });

    const serializer = new XMLSerializer();
    return serializer.serializeToString(doc.documentElement);
  } catch (err) {
    console.error("DOMParser error in sanitizeSvg:", err);
    return cleanedRaw;
  }
};

export function WireframePreview({
  wireframeSvg: rawWireframeSvg,
  isProcessing,
}: WireframePreviewProps) {
  const wireframeSvg = sanitizeSvg(rawWireframeSvg);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [copiedSvg, setCopiedSvg] = useState<boolean>(false);
  const [downloadingPng, setDownloadingPng] = useState<boolean>(false);
  const [downloadCount, setDownloadCount] = useState<number>(1);

  // Helper function to render SVG onto HTML5 Canvas and convert to PNG Blob
  const generatePngFromSvg = async (targetWidth = 1920, targetHeight = 1080): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!wireframeSvg) return reject("No SVG content available");

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) return reject("Canvas context unavailable");

      const img = new Image();
      const encodedSvg = encodeURIComponent(wireframeSvg)
        .replace(/'/g, "%27")
        .replace(/"/g, "%22");
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;

      img.onload = () => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject("Failed to convert canvas to PNG blob.");
          },
          "image/png",
          1.0
        );
      };

      img.onerror = (e) => {
        console.error("SVG Image Load Error:", e);
        reject("Error rendering SVG image.");
      };

      img.src = dataUrl;
    });
  };

  const handleDownloadPng = async () => {
    if (!wireframeSvg) return;
    setDownloadingPng(true);

    try {
      const blob = await generatePngFromSvg(1920, 1080);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `n${downloadCount}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDownloadCount((prev) => prev + 1);
    } catch (err) {
      console.error("PNG Download Error:", err);
      alert("Failed to render PNG image. Downloading as SVG instead.");
      handleDownloadSvg();
    } finally {
      setDownloadingPng(false);
    }
  };

  const handleDownloadSvg = () => {
    if (!wireframeSvg) return;
    const blob = new Blob([wireframeSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `wireframe-16x9.svg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopySvg = async () => {
    if (!wireframeSvg) return;
    try {
      await navigator.clipboard.writeText(wireframeSvg);
      setCopiedSvg(true);
      setTimeout(() => setCopiedSvg(false), 2000);
    } catch (e) {
      console.error("Copy SVG error:", e);
    }
  };

  if (isProcessing) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-3">
        <Icon icon="solar:magic-stick-3-bold" className="w-8 h-8 mx-auto text-indigo-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-800">Reconstructing 16:9 Vector Wireframe...</p>
        <p className="text-[11px] text-slate-400">Analyzing layout geometry with Gemini AI</p>
      </div>
    );
  }

  if (!wireframeSvg) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
        <Icon icon="solar:layers-bold" className="w-8 h-8 mx-auto text-slate-300 mb-2" />
        <p className="text-xs font-semibold text-slate-600">No Wireframe Rendered</p>
        <p className="text-[11px] text-slate-400 mt-1">Upload a screenshot on the left to extract wireframe.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Workspace Top Bar */}
      <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-800">16:9 Vector Workspace</span>
          <button
            onClick={() => setShowGrid(!showGrid)}
            type="button"
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1 transition-colors cursor-pointer ${
              showGrid ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon icon="solar:grid-bold" className="w-3.5 h-3.5" />
            Grid
          </button>
        </div>

        {/* Action Downloads & Zoom */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
              type="button"
              className="p-1 hover:bg-white rounded text-slate-600 cursor-pointer"
              title="Zoom Out"
            >
              <Icon icon="solar:magnifer-minus-bold" className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] w-10 text-center font-semibold">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(200, z + 25))}
              type="button"
              className="p-1 hover:bg-white rounded text-slate-600 cursor-pointer"
              title="Zoom In"
            >
              <Icon icon="solar:magnifer-plus-bold" className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              type="button"
              className="p-1 hover:bg-white rounded text-slate-600 cursor-pointer"
              title="Reset Zoom"
            >
              <Icon icon="solar:full-screen-bold" className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopySvg}
              type="button"
              className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              {copiedSvg ? (
                <Icon icon="solar:check-circle-bold" className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Icon icon="solar:copy-bold" className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{copiedSvg ? "Copied" : "Copy SVG"}</span>
            </button>

            <button
              onClick={handleDownloadSvg}
              type="button"
              className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Icon icon="solar:download-square-bold" className="w-3.5 h-3.5 text-slate-500" />
              <span>SVG</span>
            </button>

            <button
              onClick={handleDownloadPng}
              disabled={downloadingPng}
              type="button"
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Icon
                icon={downloadingPng ? "solar:restart-bold" : "solar:download-square-bold"}
                className={`w-3.5 h-3.5 ${downloadingPng ? "animate-spin" : ""}`}
              />
              <span>{downloadingPng ? "Rendering..." : "Download PNG"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Card View */}
      <div className="p-4 sm:p-6 bg-slate-100/60 overflow-auto flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between pb-2 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900">
              <Icon icon="solar:layers-bold" className="w-4 h-4 text-indigo-600" />
              <span>Extracted 16:9 Vector Wireframe</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded border border-indigo-100">
                1920 x 1080
              </span>
            </div>
          </div>

          {/* SVG Render Container */}
          <div
            className={`aspect-video w-full rounded-xl overflow-hidden border border-slate-200 relative bg-white transition-transform ${
              showGrid ? "bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] bg-size-[16px_16px]" : ""
            }`}
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "center top" }}
          >
            <div
              className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
              dangerouslySetInnerHTML={{ __html: wireframeSvg }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
