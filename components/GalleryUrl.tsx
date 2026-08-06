"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";

interface GalleryUrlProps {
  onLibraryRefresh: () => void;
  onSwitchTab: (tab: "library") => void;
}

export default function GalleryUrl({ onLibraryRefresh, onSwitchTab }: GalleryUrlProps) {
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeUploadType, setActiveUploadType] = useState<"url" | "cloudinary" | "cloudflare" | null>(null);

  const handleUrlSubmit = async (uploadType: "url" | "cloudinary" | "cloudflare") => {
    const urls = urlInput
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    if (urls.length === 0) return;

    setLoading(true);
    setActiveUploadType(uploadType);

    try {
      const response = await fetch("/api/library/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls, type: uploadType }),
      });

      if (response.ok) {
        setUrlInput("");
        onLibraryRefresh();
        onSwitchTab("library");
      } else {
        const data = await response.json();
        alert("Upload failed: " + (data.error || data.message || "Unknown error"));
      }
    } catch (error: any) {
      console.error("Failed to import URLs:", error);
      alert("Network error while processing URLs");
    } finally {
      setLoading(false);
      setActiveUploadType(null);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="border border-gray-100 p-4 md:p-6 rounded-2xl bg-white shadow-xs space-y-5">
        {/* Header Title & Info */}
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner">
            <Icon icon="solar:link-circle-bold" width={28} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800 tracking-tight">
              Import Media from URL or CDN
            </h3>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">
              Add absolute URLs to import images or videos directly into your media storage (Cloudflare, Cloudinary, or Direct Link).
            </p>
          </div>
        </div>

        {/* Textarea Input */}
        <div className="space-y-2">
          <label htmlFor="url-input" className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
            Absolute Media URLs (one per line)
          </label>
          <textarea
            id="url-input"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://images.unsplash.com/photo-example.jpg&#10;https://example.com/assets/videos/product-demo.mp4"
            className="w-full h-44 p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-mono placeholder:text-gray-400/80 transition shadow-inner"
            rows={6}
            disabled={loading}
          />
        </div>

        {/* Agreement / Usage Notice */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-100/80 text-amber-900 text-xs">
          <Icon icon="solar:info-circle-bold" width={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed font-medium">
            By importing media via URL, you confirm you have rights or permission to use and host these assets. You can upload directly to your cloud storage providers below.
          </p>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="space-y-2 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
            <div className="flex justify-between items-center text-xs font-bold text-indigo-700">
              <span className="flex items-center gap-2">
                <Icon icon="line-md:loading-twotone-loop" width={18} />
                Processing and uploading media URLs to {activeUploadType}...
              </span>
            </div>
            <div className="w-full bg-indigo-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-indigo-600 h-1.5 rounded-full animate-pulse w-full" />
            </div>
          </div>
        )}

        {/* Action Buttons Below Agreement */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {/* Cloudflare ("Cloud Fire") Upload Button */}
          <button
            type="button"
            onClick={() => handleUrlSubmit("cloudflare")}
            disabled={loading || !urlInput.trim()}
            className="flex-1 py-3 px-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Icon icon="solar:cloud-bold" width={18} />
            {loading && activeUploadType === "cloudflare" ? "Uploading to Cloudflare..." : "Upload to Cloudflare"}
          </button>

          {/* Cloudinary Upload Button */}
          <button
            type="button"
            onClick={() => handleUrlSubmit("cloudinary")}
            disabled={loading || !urlInput.trim()}
            className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Icon icon="solar:cloud-upload-bold" width={18} />
            {loading && activeUploadType === "cloudinary" ? "Uploading to Cloudinary..." : "Upload to Cloudinary"}
          </button>

          {/* Direct Link Import Button */}
          <button
            type="button"
            onClick={() => handleUrlSubmit("url")}
            disabled={loading || !urlInput.trim()}
            className="py-3 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 disabled:opacity-50 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Icon icon="solar:link-bold" width={16} />
            {loading && activeUploadType === "url" ? "Saving..." : "Add Direct Link"}
          </button>
        </div>
      </div>
    </div>
  );
}
