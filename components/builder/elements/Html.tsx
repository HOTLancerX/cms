"use client";

import React, { useEffect, useRef } from "react";
import {
  Textarea,
  Dimensions,
  AlignSelf,
} from "../controls";

/**
 * HTML Element
 */

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

export function HtmlRenderer({ html, margin, padding }: { html: string; margin?: any; padding?: any }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = html || "";

    // Re-execute scripts embedded in the HTML string (e.g. Google Adsense, widgets, custom JS)
    const scriptElements = container.querySelectorAll("script");
    scriptElements.forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      if (oldScript.innerHTML) {
        newScript.innerHTML = oldScript.innerHTML;
      }
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });

    // Handle Google Adsense push trigger if present
    if (html && html.includes("adsbygoogle") && typeof window !== "undefined") {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch {
        // Ignore Adsense re-initialization errors if ad slot is already filled
      }
    }
  }, [html]);

  const marginStyle = getDimensionsStyles(margin, "margin");
  const paddingStyle = getDimensionsStyles(padding, "padding");

  if (!html || !html.trim()) {
    return (
      <div
        className="w-full min-h-15 p-4 border border-dashed border-gray-300 rounded bg-gray-50 flex items-center justify-center text-xs text-gray-400 font-mono"
        style={{ ...marginStyle, ...paddingStyle }}
      >
        HTML Code Block (Empty)
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full box-border custom-html-block"
      style={{
        ...marginStyle,
        ...paddingStyle,
      }}
    />
  );
}

const htmlElement = {
  type: "html",
  category: "Basic",
  label: "HTML",
  icon: "solar:code-bold",

  schema: {
    content: {
      html: '<div style="padding: 10px; background: #f3f4f6; text-align: center; border: 1px dashed #d1d5db; border-radius: 6px; font-size: 13px; color: #4b5563;">HTML Code Block</div>',
    },
    style: {},
    advanced: {
      margin: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
      padding: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
      alignSelf: "auto",
    },
  },

  controls: [
    // === LAYOUT ===
    {
      tab: "Layout",
      section: "Content",
      controls: [
        {
          name: "html",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Textarea
              value={value}
              onChange={onChange}
              label="HTML Code"
              placeholder="Enter your custom HTML or Adsense script here..."
              rows={10}
            />
          ),
        },
      ],
    },

    // === ADVANCED ===
    {
      tab: "Advanced",
      section: "Spacing",
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
        {
          name: "alignSelf",
          responsive: true,
          render: (value: any, onChange: any) => (
            <AlignSelf value={value} onChange={onChange} />
          ),
        },
      ],
    },
  ],

  // =========================
  // RENDER
  // =========================
  render: (element: any) => {
    const s = element.schema;
    const htmlCode = s.content?.html || "";
    const margin = s.advanced?.margin;
    const padding = s.advanced?.padding;

    return <HtmlRenderer html={htmlCode} margin={margin} padding={padding} />;
  },
};

export default htmlElement;
