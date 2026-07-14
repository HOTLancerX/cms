"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";
import {
  Text,
  Select,
  NumberControl,
  Dimensions,
  ColorPickerPopup,
  Tabs,
  Typography,
  ButtonGroup,
  ImageGallery,
  Section,
} from "../controls";

function getTypographyStyles(value: any) {
  if (!value || typeof value !== "object") return {};
  const styles: React.CSSProperties = {};
  if (value.fontFamily) styles.fontFamily = value.fontFamily;
  if (value.fontSize) styles.fontSize = `${value.fontSize}${value.fontSizeUnit || "px"}`;
  if (value.fontWeight) styles.fontWeight = value.fontWeight;
  if (value.textTransform) styles.textTransform = value.textTransform as any;
  if (value.fontStyle) styles.fontStyle = value.fontStyle;
  if (value.textDecoration) styles.textDecoration = value.textDecoration;
  if (value.lineHeight && value.lineHeight > 0)
    styles.lineHeight = `${value.lineHeight}${value.lineHeightUnit || "px"}`;
  if (value.letterSpacing !== undefined && value.letterSpacing !== 0)
    styles.letterSpacing = `${value.letterSpacing}${value.letterSpacingUnit || "px"}`;
  return styles;
}

function getDimensionsStyles(obj: any, property: "margin" | "padding") {
  if (!obj || typeof obj !== "object") return {};
  const u = obj.unit || "px";
  if (u === "auto") return { [property]: "auto" };
  const t = obj.top === "" || obj.top === undefined ? 0 : obj.top;
  const r = obj.right === "" || obj.right === undefined ? 0 : obj.right;
  const b = obj.bottom === "" || obj.bottom === undefined ? 0 : obj.bottom;
  const l = obj.left === "" || obj.left === undefined ? 0 : obj.left;
  if (t === 0 && r === 0 && b === 0 && l === 0) return {};
  return { [property]: `${t}${u} ${r}${u} ${b}${u} ${l}${u}` };
}

function normalizeImages(val: any): any[] {
  if (!val) return [];
  let arr: any[] = [];
  if (Array.isArray(val)) {
    arr = val;
  } else if (typeof val === "string") {
    if (val.includes(",")) {
      arr = val.split(",").map((s) => s.trim());
    } else {
      arr = [val];
    }
  }

  return arr.map((item: any) => {
    if (!item) return { url: "", title: "", showTitle: true };
    if (typeof item === "string") {
      const filename = item.split("/").pop()?.split("?")[0] || "Image";
      const cleanTitle = filename.replace(/[-_]/g, " ").replace(/\.[^/.]+$/, "");
      return {
        url: item,
        title: cleanTitle,
        showTitle: true,
      };
    }
    const url = item.url || "";
    let title = item.title;
    if (!title && url) {
      const filename = url.split("/").pop()?.split("?")[0] || "Image";
      title = filename.replace(/[-_]/g, " ").replace(/\.[^/.]+$/, "");
    }
    return {
      url,
      title: title || "",
      showTitle: item.showTitle !== false,
    };
  });
}

function resolveResponsiveValue(val: any, fallback: number): number {
  if (val === undefined || val === null) return fallback;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const num = parseInt(val, 10);
    return isNaN(num) ? fallback : num;
  }
  if (typeof val === "object") {
    const res = val.desktop ?? val.tablet ?? val.mobile ?? val.value;
    if (res !== undefined && res !== null) {
      if (typeof res === "number") return res;
      const num = parseInt(res, 10);
      return isNaN(num) ? fallback : num;
    }
  }
  return fallback;
}

interface GalleryItem {
  id: string;
  url: string;
  title: string;
  showTitle: boolean;
}

function GalleryFrontend({ element }: { element: any }) {
  const s = element.schema;

  // Content state
  const type: "single" | "multiple" = s.content?.type || "single";
  const singleImages = normalizeImages(s.content?.singleImages);
  const galleries: any[] = s.content?.galleries || [];
  
  const layout: "grid" | "justified" | "masonry" = s.content?.layout || "grid";
  
  const columnsDesktop = resolveResponsiveValue(s.content?.columns?.desktop ?? s.content?.columns, 4);
  const columnsTablet = resolveResponsiveValue(s.content?.columns?.tablet ?? s.content?.columns, 3);
  const columnsMobile = resolveResponsiveValue(s.content?.columns?.mobile ?? s.content?.columns, 2);

  const spacingDesktop = resolveResponsiveValue(s.content?.spacing?.desktop ?? s.content?.spacing, 10);
  const spacingTablet = resolveResponsiveValue(s.content?.spacing?.tablet ?? s.content?.spacing, 10);
  const spacingMobile = resolveResponsiveValue(s.content?.spacing?.mobile ?? s.content?.spacing, 10);
  const linkType: "none" | "media" | "custom" = s.content?.link || "media";
  const customLinkUrl: string = s.content?.customLinkUrl || "";
  const aspectRatio: string = s.content?.aspectRatio || "3:2";

  // Style state
  const borderRadius: number = s.style?.borderRadius ?? 4;
  const borderWidth: number = s.style?.borderWidth ?? 0;
  const borderColor: string = s.style?.borderColor || "#e2e8f0";
  const hoverBorderColor: string = s.style?.hoverBorderColor || "#3b82f6";
  const hoverAnimation: string = s.style?.hoverAnimation || "zoom-in"; // zoom-in | zoom-out | none
  const animDuration: number = s.style?.animDuration ?? 350;

  // Overlay state
  const normalOverlayColor: string = s.style?.normalOverlayColor || "rgba(0,0,0,0)";
  const hoverOverlayColor: string = s.style?.hoverOverlayColor || "rgba(0,0,0,0.5)";
  const blendMode: string = s.style?.blendMode || "normal";
  const overlayAnimation: string = s.style?.overlayAnimation || "fade-in"; // fade-in | slide-up | none

  // Content alignment
  const contentAlign: string = s.style?.contentAlign || "center";
  const contentVAlign: string = s.style?.contentVAlign || "center";
  const contentPadding: number = s.style?.contentPadding ?? 15;
  const contentColor: string = s.style?.contentColor || "#ffffff";
  const contentTyp = getTypographyStyles(s.style?.contentTypography || {});

  // Filter Bar state
  const filterAlign: string = s.style?.filterAlign || "center";
  const filterSpacing: number = s.style?.filterSpacing ?? 20;
  const filterColor: string = s.style?.filterColor || "#4b5563";
  const filterActiveColor: string = s.style?.filterActiveColor || "#3b82f6";

  const margin = s.advanced?.margin || {};
  const padding = s.advanced?.padding || {};
  const marginStyle = getDimensionsStyles(margin, "margin");
  const paddingStyle = getDimensionsStyles(padding, "padding");

  // Filter tabs state
  const [selectedGalleryId, setSelectedGalleryId] = useState<string>("all");
  
  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Dynamic selector ID
  const elementId = `gallery-el-${element.id}`;

  // Evaluate active list of images to render
  let activeImages: GalleryItem[] = [];

  if (type === "single") {
    activeImages = singleImages
      .filter((imgObj) => !!imgObj?.url)
      .map((imgObj, idx) => ({
        id: `single-${idx}`,
        url: imgObj.url,
        title: imgObj.title || "",
        showTitle: imgObj.showTitle !== false,
      }));
  } else {
    // Multiple galleries Mode
    if (selectedGalleryId === "all") {
      const urlsSeen = new Set<string>();
      galleries.forEach((gal) => {
        const imgs = normalizeImages(gal.images);
        imgs.forEach((imgObj: any, imgIdx: number) => {
          const url = imgObj?.url || "";
          if (url && !urlsSeen.has(url)) {
            urlsSeen.add(url);
            activeImages.push({
              id: `${gal.id}-${imgIdx}`,
              url,
              title: imgObj?.title || "",
              showTitle: imgObj?.showTitle !== false,
            });
          }
        });
      });
    } else {
      const activeGal = galleries.find((g) => g.id === selectedGalleryId);
      if (activeGal) {
        const imgs = normalizeImages(activeGal.images);
        imgs.forEach((imgObj: any, imgIdx: number) => {
          const url = imgObj?.url || "";
          if (url) {
            activeImages.push({
              id: `${activeGal.id}-${imgIdx}`,
              url,
              title: imgObj?.title || "",
              showTitle: imgObj?.showTitle !== false,
            });
          }
        });
      }
    }
  }

  // Handle link clicks
  const handleItemClick = (idx: number, e: React.MouseEvent) => {
    if (linkType === "media") {
      e.preventDefault();
      setLightboxIndex(idx);
    }
  };

  const handlePrev = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + activeImages.length) % activeImages.length);
    }
  };

  const handleNext = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % activeImages.length);
    }
  };

  const ratioPercent = (() => {
    if (aspectRatio === "1:1") return "100%";
    if (aspectRatio === "3:2") return "66.66%";
    if (aspectRatio === "4:3") return "75%";
    if (aspectRatio === "16:9") return "56.25%";
    if (aspectRatio === "21:9") return "42.85%";
    if (aspectRatio === "9:16") return "177.77%";
    return "66.66%";
  })();

  return (
    <div
      className={`w-full box-border ${elementId}`}
      style={{
        ...marginStyle,
        ...paddingStyle,
      }}
    >
      <style>{`
        /* Desktop Breakpoint */
        .${elementId} .gallery-grid {
          display: ${layout === "grid" ? "grid" : layout === "justified" ? "flex" : "block"};
          flex-wrap: ${layout === "justified" ? "wrap" : "nowrap"};
          column-count: ${layout === "masonry" ? columnsDesktop : "auto"};
          column-gap: ${layout === "masonry" ? `${spacingDesktop}px` : "normal"};
          grid-template-columns: ${layout === "grid" ? `repeat(${columnsDesktop}, minmax(0, 1fr))` : "none"};
          gap: ${layout !== "masonry" ? `${spacingDesktop}px` : "normal"};
        }
        .${elementId} .gallery-item-wrapper {
          margin-bottom: ${layout === "masonry" ? `${spacingDesktop}px` : "0px"};
        }

        /* Tablet Breakpoint (max-width: 1024px) */
        @media (max-width: 1024px) {
          .${elementId} .gallery-grid {
            column-count: ${layout === "masonry" ? columnsTablet : "auto"};
            column-gap: ${layout === "masonry" ? `${spacingTablet}px` : "normal"};
            grid-template-columns: ${layout === "grid" ? `repeat(${columnsTablet}, minmax(0, 1fr))` : "none"};
            gap: ${layout !== "masonry" ? `${spacingTablet}px` : "normal"};
          }
          .${elementId} .gallery-item-wrapper {
            margin-bottom: ${layout === "masonry" ? `${spacingTablet}px` : "0px"};
          }
        }

        /* Mobile Breakpoint (max-width: 768px) */
        @media (max-width: 768px) {
          .${elementId} .gallery-grid {
            column-count: ${layout === "masonry" ? columnsMobile : "auto"};
            column-gap: ${layout === "masonry" ? `${spacingMobile}px` : "normal"};
            grid-template-columns: ${layout === "grid" ? `repeat(${columnsMobile}, minmax(0, 1fr))` : "none"};
            gap: ${layout !== "masonry" ? `${spacingMobile}px` : "normal"};
          }
          .${elementId} .gallery-item-wrapper {
            margin-bottom: ${layout === "masonry" ? `${spacingMobile}px` : "0px"};
          }
        }

        .${elementId} .filter-tab-button {
          color: ${filterColor};
          background: transparent;
          border: none;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: color 0.3s ease;
        }
        .${elementId} .filter-tab-button.active {
          color: ${filterActiveColor};
        }
        
        .${elementId} .gallery-item-wrapper {
          position: relative;
          overflow: hidden;
          background: #f3f4f6;
          border: ${borderWidth}px solid ${borderColor};
          border-radius: ${borderRadius}px;
          transition: border-color ${animDuration}ms ease;
        }
        .${elementId} .gallery-item-wrapper:hover {
          border-color: ${hoverBorderColor};
        }
        .${elementId} .gallery-image {
          transition: transform ${animDuration}ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        ${hoverAnimation === "zoom-in" ? `
        .${elementId} .gallery-item-wrapper:hover .gallery-image {
          transform: scale(1.1);
        }
        ` : ""}
        ${hoverAnimation === "zoom-out" ? `
        .${elementId} .gallery-item-wrapper:hover .gallery-image {
          transform: scale(0.92);
        }
        ` : ""}

        .${elementId} .gallery-overlay {
          position: absolute;
          inset: 0;
          background: ${normalOverlayColor};
          mix-blend-mode: ${blendMode};
          display: flex;
          align-items: ${contentVAlign === "center" ? "center" : contentVAlign === "flex-start" ? "flex-start" : "flex-end"};
          justify-content: ${contentAlign === "center" ? "center" : contentAlign === "left" ? "flex-start" : "flex-end"};
          padding: ${contentPadding}px;
          opacity: 0;
          transition: all ${animDuration}ms ease;
          z-index: 10;
        }
        .${elementId} .gallery-item-wrapper:hover .gallery-overlay {
          opacity: 1;
          background: ${hoverOverlayColor};
        }
        
        .${elementId} .gallery-overlay-text {
          transition: transform ${animDuration}ms ease;
        }
        ${overlayAnimation === "slide-up" ? `
        .${elementId} .gallery-overlay-text {
          transform: translateY(12px);
        }
        .${elementId} .gallery-item-wrapper:hover .gallery-overlay-text {
          transform: translateY(0);
        }
        ` : ""}
      `}</style>

      {/* ── Filter Bar Navigation ── */}
      {type === "multiple" && galleries.length > 0 && (
        <div
          className="flex flex-wrap gap-4 mb-6"
          style={{
            justifyContent: filterAlign === "left" ? "flex-start" : filterAlign === "right" ? "flex-end" : "center",
            marginBottom: `${filterSpacing}px`,
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedGalleryId("all")}
            className={`filter-tab-button ${selectedGalleryId === "all" ? "active" : ""}`}
          >
            All
          </button>
          {galleries.map((gal) => (
            <button
              key={gal.id}
              type="button"
              onClick={() => setSelectedGalleryId(gal.id)}
              className={`filter-tab-button ${selectedGalleryId === gal.id ? "active" : ""}`}
            >
              {gal.name || "Unnamed Gallery"}
            </button>
          ))}
        </div>
      )}

      {/* ── Grid Container ── */}
      {activeImages.length === 0 ? (
        <div className="p-8 border border-dashed text-center text-gray-500 rounded bg-gray-50 text-sm">
          No images selected. Please add images in the editor.
        </div>
      ) : (
        <div className="gallery-grid">
          {activeImages.map((img, idx) => {
            let aspectStyle: React.CSSProperties = {};
            if (layout === "grid") {
              aspectStyle = {
                paddingTop: ratioPercent,
                position: "relative",
              };
            } else if (layout === "justified") {
              aspectStyle = {
                height: "200px",
                flexGrow: 1,
                minWidth: "150px",
              };
            } else {
              // Masonry layout style
              aspectStyle = {
                display: "inline-block",
                width: "100%",
                breakInside: "avoid",
              };
            }

            const imgInner = (
              <>
                <img
                  src={img.url}
                  alt={img.title}
                  className="gallery-image object-cover block"
                  style={{
                    position: layout === "grid" ? "absolute" : "relative",
                    top: layout === "grid" ? 0 : undefined,
                    left: layout === "grid" ? 0 : undefined,
                    width: "100%",
                    height: layout === "grid" ? "100%" : layout === "justified" ? "200px" : "auto",
                  }}
                />
                
                {/* Overlay Text Details */}
                {(hoverOverlayColor !== "rgba(0,0,0,0)" || (img.title && img.showTitle)) && (
                  <div className="gallery-overlay">
                    <div className="gallery-overlay-text" style={{ color: contentColor, ...contentTyp }}>
                      {img.title && img.showTitle && <span className="font-semibold block">{img.title}</span>}
                    </div>
                  </div>
                )}
              </>
            );

            return (
              <div
                key={img.id}
                className="gallery-item-wrapper"
                style={aspectStyle}
              >
                {linkType === "custom" && customLinkUrl ? (
                  <a href={customLinkUrl} className="w-full h-full block">
                    {imgInner}
                  </a>
                ) : linkType === "media" ? (
                  <a
                    href={img.url}
                    onClick={(e) => handleItemClick(idx, e)}
                    className="w-full h-full block cursor-zoom-in"
                  >
                    {imgInner}
                  </a>
                ) : (
                  <div className="w-full h-full block">
                    {imgInner}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Built-in Lightbox Component ── */}
      {lightboxIndex !== null && activeImages.length > 0 && (
        <div className="fixed inset-0 z-99999 bg-black bg-opacity-95 flex flex-col justify-between p-4 select-none">
          {/* Top Actions */}
          <div className="flex justify-between items-center text-white p-2">
            <span className="text-xs font-semibold text-gray-400">
              {lightboxIndex + 1} / {activeImages.length}
            </span>
            <button
              onClick={() => setLightboxIndex(null)}
              className="text-white hover:text-red-400 p-2 text-2xl transition-colors cursor-pointer border-none bg-transparent"
              title="Close Lightbox"
            >
              <Icon icon="mdi:close" width="28" />
            </button>
          </div>

          {/* Centered Image display */}
          <div className="flex-1 flex items-center justify-between relative max-w-7xl mx-auto w-full">
            <button
              onClick={handlePrev}
              className="absolute left-2 text-white hover:text-blue-400 p-3 bg-black bg-opacity-50 hover:bg-opacity-80 rounded-full transition-all cursor-pointer border-none"
              title="Previous"
            >
              <Icon icon="mdi:chevron-left" width="32" />
            </button>

            <div className="mx-auto max-h-[80vh] flex flex-col items-center justify-center p-4">
              <img
                src={activeImages[lightboxIndex].url}
                alt={activeImages[lightboxIndex].title}
                className="max-h-[75vh] max-w-[85vw] object-contain rounded shadow-2xl"
              />
              {activeImages[lightboxIndex].showTitle && activeImages[lightboxIndex].title && (
                <span className="text-white font-medium text-sm mt-3.5 block max-w-[70vw] truncate">
                  {activeImages[lightboxIndex].title}
                </span>
              )}
            </div>

            <button
              onClick={handleNext}
              className="absolute right-2 text-white hover:text-blue-400 p-3 bg-black bg-opacity-50 hover:bg-opacity-80 rounded-full transition-all cursor-pointer border-none"
              title="Next"
            >
              <Icon icon="mdi:chevron-right" width="32" />
            </button>
          </div>

          <div className="h-6" />
        </div>
      )}
    </div>
  );
}

// ─── Custom Gallery images editor Repeater list ───
function GalleryImageListEditor({ value, onChange }: { value: any[]; onChange: (v: any[]) => void }) {
  const items = normalizeImages(value);

  const handleSelectImages = (newUrls: string | string[]) => {
    const urls = Array.isArray(newUrls) ? newUrls : [newUrls];
    const newList = urls.map((url) => {
      const existing = items.find((item: any) => item.url === url);
      if (existing) return existing;
      const filename = url.split("/").pop()?.split("?")[0] || "Image";
      const cleanTitle = filename.replace(/[-_]/g, " ").replace(/\.[^/.]+$/, "");
      return {
        url,
        title: cleanTitle,
        showTitle: true,
      };
    });
    onChange(newList);
  };

  const handleTitleChange = (idx: number, title: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], title };
    onChange(next);
  };

  const handleShowTitleToggle = (idx: number, showTitle: boolean) => {
    const next = [...items];
    next[idx] = { ...next[idx], showTitle };
    onChange(next);
  };

  const handleRemove = (idx: number) => {
    onChange(items.filter((_: any, i: number) => i !== idx));
  };

  return (
    <div className="space-y-4 pt-1">
      <ImageGallery
        label="Select / Add Gallery Images"
        value={items.map((i: any) => i.url)}
        onChange={handleSelectImages}
        multiple={true}
      />
      
      {items.length > 0 && (
        <div className="space-y-3 mt-4 max-h-[350px] overflow-y-auto pr-1">
          <span className="text-[11px] font-semibold text-gray-400 block uppercase tracking-wider">Images Settings (Line by Line)</span>
          {items.map((item: any, idx: number) => (
            <div key={idx} className="flex flex-col gap-2.5 p-2.5 border border-gray-700 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <img src={item.url} className="w-10 h-10 object-cover rounded border border-gray-700" alt="" />
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] text-gray-300 truncate block font-medium">
                    {item.url.split("/").pop()?.split("?")[0] || `Image #${idx + 1}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="w-6 h-6 flex items-center justify-center rounded bg-gray-700 hover:bg-red-950 text-gray-400 hover:text-red-400 cursor-pointer transition-colors border-none"
                  title="Remove Image"
                >
                  <Icon icon="solar:trash-bin-trash-linear" width="13" />
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Custom Image Title"
                  value={item.title || ""}
                  onChange={(e) => handleTitleChange(idx, e.target.value)}
                  className="flex-1 bg-gray-900 border border-gray-700 text-white text-xs rounded px-2 py-1.5 outline-none placeholder-gray-500"
                />
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={item.showTitle !== false}
                    onChange={(e) => handleShowTitleToggle(idx, e.target.checked)}
                    className="accent-indigo-500 rounded border-gray-700 bg-gray-900"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const galleryElement = {
  type: "gallery-element",
  category: "Basic",
  label: "Gallery",
  icon: "solar:gallery-bold-duotone",

  schema: {
    content: {
      type: "single",
      singleImages: [
        {
          url: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800&auto=format&fit=crop&q=80",
          title: "Forest Pathways",
          showTitle: true,
        },
        {
          url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80",
          title: "Grand Canyon",
          showTitle: true,
        },
        {
          url: "https://images.unsplash.com/photo-1511497584788-876760111969?w=800&auto=format&fit=crop&q=80",
          title: "Pine Forest",
          showTitle: true,
        },
        {
          url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80",
          title: "Morning Fog",
          showTitle: true,
        },
      ],
      galleries: [],
      layout: "grid",
      columns: 4,
      spacing: 10,
      link: "media",
      customLinkUrl: "",
      aspectRatio: "3:2",
    },

    style: {
      borderRadius: 4,
      borderWidth: 0,
      borderColor: "#e2e8f0",
      hoverBorderColor: "#3b82f6",
      hoverAnimation: "zoom-in",
      animDuration: 350,
      normalOverlayColor: "rgba(0,0,0,0)",
      hoverOverlayColor: "rgba(0,0,0,0.5)",
      blendMode: "normal",
      overlayAnimation: "fade-in",
      contentAlign: "center",
      contentVAlign: "center",
      contentPadding: 15,
      contentColor: "#ffffff",
      contentTypography: {
        fontSize: 14,
        fontWeight: "600",
      },
      filterAlign: "center",
      filterSpacing: 20,
      filterColor: "#4b5563",
      filterActiveColor: "#3b82f6",
    },

    advanced: {
      margin: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
      padding: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
    },
  },

  controls: [
    // ═══════════════════ CONTENT TAB ════════════════
    {
      tab: "Content",
      section: "Settings",
      controls: [
        {
          name: "type",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select
              label="Type"
              value={value ?? "single"}
              onChange={onChange}
              options={[
                { value: "single", label: "Single" },
                { value: "multiple", label: "Multiple" },
              ]}
            />
          ),
        },
        {
          name: "singleImages",
          responsive: false,
          render: (value: any, onChange: any, { schema }: any) => (
            schema.content.type === "single" ? (
              <GalleryImageListEditor value={value || []} onChange={onChange} />
            ) : null
          ),
        },
        {
          name: "galleries",
          responsive: false,
          render: (value: any, onChange: any, { schema }: any) => {
            if (schema.content.type !== "multiple") return null;
            const items = value || [];
            return (
              <div className="space-y-4 pt-1">
                <span className="text-xs font-semibold text-gray-400">Galleries Repeater</span>
                {items.map((gal: any, idx: number) => (
                  <Section key={gal.id || idx} label={gal.name || `Gallery #${idx + 1}`}>
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const newG = {
                              id: `gal-${Date.now()}`,
                              name: `${gal.name || "Copy"} (Copy)`,
                              images: [...(gal.images || [])],
                            };
                            const copyList = [...items];
                            copyList.splice(idx + 1, 0, newG);
                            onChange(copyList);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-400 hover:text-white cursor-pointer"
                        >
                          <Icon icon="solar:copy-linear" width="14" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onChange(items.filter((_: any, i: number) => i !== idx))}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-400 hover:text-red-400 cursor-pointer"
                        >
                          <Icon icon="solar:trash-bin-trash-linear" width="14" />
                        </button>
                      </div>
                      <Text
                        label="Gallery Name"
                        value={gal.name || ""}
                        onChange={(v) => {
                          const list = [...items];
                          list[idx] = { ...list[idx], name: v };
                          onChange(list);
                        }}
                      />
                      <GalleryImageListEditor
                        value={gal.images || []}
                        onChange={(imgs) => {
                          const list = [...items];
                          list[idx] = { ...list[idx], images: imgs };
                          onChange(list);
                        }}
                      />
                    </div>
                  </Section>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const next = [
                      ...items,
                      { id: `gal-${Date.now()}`, name: `New Gallery`, images: [] },
                    ];
                    onChange(next);
                  }}
                  className="w-full py-2 bg-gray-700 hover:bg-gray-800 text-white rounded text-xs font-semibold cursor-pointer text-center"
                >
                  + Add Gallery Category
                </button>
              </div>
            );
          },
        },
        {
          name: "layout",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select
              label="Layout"
              value={value ?? "grid"}
              onChange={onChange}
              options={[
                { value: "grid", label: "Grid" },
                { value: "justified", label: "Justified" },
                { value: "masonry", label: "Masonry" },
              ]}
            />
          ),
        },
        {
          name: "columns",
          responsive: true,
          render: (value: any, onChange: any, { schema }: any) => (
            schema.content.layout !== "justified" ? (
              <NumberControl label="Columns" value={value ?? 4} onChange={onChange} min={1} max={8} />
            ) : null
          ),
        },
        {
          name: "spacing",
          responsive: true,
          render: (value: any, onChange: any) => (
            <NumberControl label="Spacing" value={value ?? 10} onChange={onChange} min={0} max={100} />
          ),
        },
        {
          name: "link",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select
              label="Link Click Action"
              value={value ?? "media"}
              onChange={onChange}
              options={[
                { value: "none", label: "None" },
                { value: "media", label: "Media File (Lightbox)" },
                { value: "custom", label: "Custom URL" },
              ]}
            />
          ),
        },
        {
          name: "customLinkUrl",
          responsive: false,
          render: (value: any, onChange: any, { schema }: any) => (
            schema.content.link === "custom" ? (
              <Text label="Custom URL" value={value || ""} onChange={onChange} placeholder="https://..." />
            ) : null
          ),
        },
        {
          name: "aspectRatio",
          responsive: false,
          render: (value: any, onChange: any, { schema }: any) => (
            schema.content.layout === "grid" ? (
              <Select
                label="Aspect Ratio"
                value={value ?? "3:2"}
                onChange={onChange}
                options={[
                  { value: "1:1", label: "1:1" },
                  { value: "3:2", label: "3:2" },
                  { value: "4:3", label: "4:3" },
                  { value: "9:16", label: "9:16" },
                  { value: "16:9", label: "16:9" },
                  { value: "21:9", label: "21:9" },
                ]}
              />
            ) : null
          ),
        },
      ],
    },

    // ═══════════════════ STYLE TAB ══════════════════
    {
      tab: "Style",
      section: "Image Styling",
      controls: [
        {
          name: "borderColor",
          responsive: false,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <Tabs
              tabs={[
                {
                  label: "Normal Image",
                  content: (
                    <div className="pt-2 space-y-4">
                      <ColorPickerPopup label="Border Color" value={value ?? "#e2e8f0"} onChange={onChange} />
                      <NumberControl label="Border Width" value={schema.style.borderWidth ?? 0} onChange={(v) => updateSchema("style", "borderWidth", v)} min={0} max={10} />
                      <NumberControl label="Border Radius" value={schema.style.borderRadius ?? 4} onChange={(v) => updateSchema("style", "borderRadius", v)} min={0} max={100} />
                    </div>
                  ),
                },
                {
                  label: "Hover Image",
                  content: (
                    <div className="pt-2 space-y-4">
                      <ColorPickerPopup label="Hover Border Color" value={schema.style.hoverBorderColor ?? "#3b82f6"} onChange={(v) => updateSchema("style", "hoverBorderColor", v)} />
                      <Select
                        label="Hover Animation"
                        value={schema.style.hoverAnimation || "zoom-in"}
                        onChange={(v) => updateSchema("style", "hoverAnimation", v)}
                        options={[
                          { value: "none", label: "None" },
                          { value: "zoom-in", label: "Zoom In" },
                          { value: "zoom-out", label: "Zoom Out" },
                        ]}
                      />
                    </div>
                  ),
                },
              ]}
            />
          ),
        },
        {
          name: "animDuration",
          responsive: false,
          render: (value: any, onChange: any) => (
            <NumberControl label="Animation Duration (ms)" value={value ?? 350} onChange={onChange} min={100} max={2000} step={50} />
          ),
        },
      ],
    },

    {
      tab: "Style",
      section: "Overlay Configurations",
      controls: [
        {
          name: "normalOverlayColor",
          responsive: false,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <Tabs
              tabs={[
                {
                  label: "Normal Overlay",
                  content: (
                    <div className="pt-2">
                      <ColorPickerPopup label="Overlay Background Color" value={value ?? "rgba(0,0,0,0)"} onChange={onChange} />
                    </div>
                  ),
                },
                {
                  label: "Hover Overlay",
                  content: (
                    <div className="pt-2 space-y-4">
                      <ColorPickerPopup label="Hover Background Color" value={schema.style.hoverOverlayColor ?? "rgba(0,0,0,0.5)"} onChange={(v) => updateSchema("style", "hoverOverlayColor", v)} />
                      <Select
                        label="Blend Mode"
                        value={schema.style.blendMode || "normal"}
                        onChange={(v) => updateSchema("style", "blendMode", v)}
                        options={[
                          { value: "normal", label: "Normal" },
                          { value: "multiply", label: "Multiply" },
                          { value: "screen", label: "Screen" },
                          { value: "overlay", label: "Overlay" },
                          { value: "darken", label: "Darken" },
                          { value: "lighten", label: "Lighten" },
                          { value: "color-dodge", label: "Color Dodge" },
                          { value: "saturation", label: "Saturation" },
                          { value: "color", label: "Color" },
                          { value: "luminosity", label: "Luminosity" },
                        ]}
                      />
                      <Select
                        label="Overlay Animation"
                        value={schema.style.overlayAnimation || "fade-in"}
                        onChange={(v) => updateSchema("style", "overlayAnimation", v)}
                        options={[
                          { value: "none", label: "None" },
                          { value: "fade-in", label: "Fade In" },
                          { value: "slide-up", label: "Slide Up" },
                        ]}
                      />
                    </div>
                  ),
                },
              ]}
            />
          ),
        },
      ],
    },

    {
      tab: "Style",
      section: "Content & Typography",
      controls: [
        {
          name: "contentAlign",
          responsive: false,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <div className="space-y-4">
              <ButtonGroup
                label="Horizontal Position"
                value={value ?? "center"}
                onChange={onChange}
                options={[
                  { value: "left", icon: "mdi:align-horizontal-left" },
                  { value: "center", icon: "mdi:align-horizontal-center" },
                  { value: "right", icon: "mdi:align-horizontal-right" },
                ]}
              />
              <ButtonGroup
                label="Vertical Position"
                value={schema.style.contentVAlign ?? "center"}
                onChange={(v) => updateSchema("style", "contentVAlign", v)}
                options={[
                  { value: "flex-start", icon: "mdi:align-vertical-top" },
                  { value: "center", icon: "mdi:align-vertical-center" },
                  { value: "flex-end", icon: "mdi:align-vertical-bottom" },
                ]}
              />
              <NumberControl label="Padding (px)" value={schema.style.contentPadding ?? 15} onChange={(v) => updateSchema("style", "contentPadding", v)} min={0} max={100} />
            </div>
          ),
        },
        {
          name: "contentColor",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Text Color" value={value ?? "#ffffff"} onChange={onChange} />
          ),
        },
        {
          name: "contentTypography",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Typography label="Text Typography" value={value} onChange={onChange} />
          ),
        },
      ],
    },

    {
      tab: "Style",
      section: "Filter Bar",
      controls: [
        {
          name: "filterAlign",
          responsive: false,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            schema.content.type === "multiple" ? (
              <div className="space-y-4">
                <ButtonGroup
                  label="Alignment"
                  value={value ?? "center"}
                  onChange={onChange}
                  options={[
                    { value: "left", icon: "mdi:format-align-left" },
                    { value: "center", icon: "mdi:format-align-center" },
                    { value: "right", icon: "mdi:format-align-right" },
                  ]}
                />
                <NumberControl label="Spacing (px)" value={schema.style.filterSpacing ?? 20} onChange={(v) => updateSchema("style", "filterSpacing", v)} min={0} max={100} />
                <ColorPickerPopup label="Color" value={schema.style.filterColor ?? "#4b5563"} onChange={(v) => updateSchema("style", "filterColor", v)} />
                <ColorPickerPopup label="Active Color" value={schema.style.filterActiveColor ?? "#3b82f6"} onChange={(v) => updateSchema("style", "filterActiveColor", v)} />
              </div>
            ) : null
          ),
        },
      ],
    },

    // ═══════════════════ ADVANCED TAB ═══════════════
    {
      tab: "Advanced",
      section: "Spacing Bounds",
      controls: [
        {
          name: "margin",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Dimensions type="margin" value={value} onChange={onChange} />
          ),
        },
        {
          name: "padding",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Dimensions type="padding" value={value} onChange={onChange} />
          ),
        },
      ],
    },
  ],

  render: (element: any) => <GalleryFrontend element={element} />,
};

export default galleryElement;
