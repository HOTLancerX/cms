"use client";

import React, { useState, useEffect, useCallback } from "react";
import MenuClients from "@/components/MenuClients";
import { MenuItem } from "@/models/Menu";
import { xFetch } from "@/lib/express";
import {
  Text,
  Select,
  ColorPickerPopup,
  Dimensions,
  Section,
  NumberControl,
} from "../controls";

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

function collectBuilderIds(items: MenuItem[]): string[] {
  const ids: string[] = [];
  for (const item of items) {
    if ((item.type === "builder" || item.displayStyle === "builder") && item.builderId) {
      ids.push(item.builderId);
    }
    if (item.children?.length) {
      ids.push(...collectBuilderIds(item.children));
    }
  }
  return [...new Set(ids)];
}

/* ── Frontend Component ── */
function MenusFrontend({ element }: { element: any }) {
  const s = element.schema;
  const location = s.content?.location || "header-1";

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [builderContent, setBuilderContent] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!location) return;
    setLoading(true);
    xFetch(`/menu?location=${location}`)
      .then((res) => res.json())
      .then(async (data) => {
        const items = data.menu?.items || [];
        setMenuItems(items);

        // Pre-fetch submenu builder content
        const builderIds = collectBuilderIds(items);
        if (builderIds.length > 0) {
          const contents: Record<string, any[]> = {};
          await Promise.all(
            builderIds.map(async (id) => {
              try {
                const bRes = await xFetch(`/builder?id=${id}`);
                if (bRes.ok) {
                  const bData = await bRes.json();
                  if (bData.content && Array.isArray(bData.content)) {
                    contents[id] = bData.content;
                  }
                }
              } catch (e) {
                console.error("[Menus] Error fetching builder sub-panel:", e);
              }
            })
          );
          setBuilderContent(contents);
        }
      })
      .catch((err) => console.error("[Menus] Error loading menu items:", err))
      .finally(() => setLoading(false));
  }, [location]);

  const marginStyle = getDimensionsStyles(s.advanced?.margin, "margin");
  const paddingStyle = getDimensionsStyles(s.advanced?.padding, "padding");

  if (loading) {
    return (
      <div className="py-4 text-sm text-gray-400 flex items-center justify-center gap-2">
        <span className="animate-spin inline-block w-4 h-4 border-2 border-slate-300 border-t-indigo-600 rounded-full" />
        Loading Navigation Menu...
      </div>
    );
  }

  if (menuItems.length === 0) {
    return (
      <div className="p-6 text-center text-[13px] text-gray-400 font-semibold border border-dashed border-gray-300 rounded-xl">
        No active items found for menu location: <span className="font-mono text-indigo-500 font-bold">{location}</span>.
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        position: "relative",
        zIndex: 50,
        ...marginStyle,
        ...paddingStyle,
      }}
    >
      <MenuClients
        menuItems={menuItems}
        settings={s.style}
        builderContent={builderContent}
      />
    </div>
  );
}

function MenuLocationControl({ value, onChange }: { value: any; onChange: any }) {
  const [slots, setSlots] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    xFetch("/menu?limit=100")
      .then((res) => res.json())
      .then((data) => {
        const slotsList: Array<{ value: string; label: string }> = [];
        (data.menus || []).forEach((m: any) => {
          (m.location || []).forEach((l: string) => {
            if (l) {
              slotsList.push({
                value: l,
                label: `${m.title} (${l})`,
              });
            }
          });
        });
        setSlots(slotsList);
      })
      .catch((err) => console.error("[Menus] Error fetching slots in control:", err));
  }, []);

  return (
    <Section label="Menu Source Slot" defaultOpen>
      {slots.length > 0 ? (
        <Select
          label="Select Active Menu Location"
          value={value || ""}
          onChange={onChange}
          options={[
            { value: "", label: "— Choose a location —" },
            ...slots
          ]}
        />
      ) : (
        <div className="text-xs text-amber-500 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 mb-3">
          No menus have assigned location slots. Go to Settings or Menus admin page to assign a location.
        </div>
      )}
      <Text
        label="Or enter custom Location Name"
        value={value || ""}
        onChange={onChange}
        placeholder="e.g. header-1"
      />
    </Section>
  );
}

/* ── Element Registry Definition ── */
const menusElement = {
  type: "menus",
  category: "Navigation",
  label: "Navigation Menu",
  icon: "solar:menu-dots-bold-duotone",

  schema: {
    content: {
      location: "header-1",
    },

    style: {
      nav_bg: "transparent",
      nav_text: "#111827",
      nav_highlight: "#00aaa6",
      nav_box_bg: "#ffffff",
      nav_box_text: "#111827",
      nav_hover_bg: "#f3f4f6",
      nav_hover_text: "#00aaa6",
      nav_border_color: "#e5e7eb",
      nav_active_bg: "#00aaa6",
      nav_active_text: "#ffffff",
      nav_gap: 4,
      nav_font_size: 14,
      nav_font_weight: 500,
    },

    advanced: {
      margin: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
      padding: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
    },
  },

  controls: [
    // ═══════════════════ LAYOUT TAB ═════════════════
    {
      tab: "Layout",
      section: "Menu Connection",
      controls: [
        {
          name: "location",
          responsive: false,
          render: (value: any, onChange: any) => (
            <MenuLocationControl value={value} onChange={onChange} />
          ),
        },
      ],
    },

    // ═══════════════════ STYLE TAB ══════════════════
    {
      tab: "Style",
      section: "General Colours",
      controls: [
        {
          name: "nav_bg",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Nav Background" value={value ?? "transparent"} onChange={onChange} />
          ),
        },
        {
          name: "nav_text",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Nav Text Colour" value={value ?? "#111827"} onChange={onChange} />
          ),
        },
        {
          name: "nav_hover_text",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Nav Hover Text" value={value ?? "#00aaa6"} onChange={onChange} />
          ),
        },
        {
          name: "nav_hover_bg",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Nav Hover Background" value={value ?? "#f3f4f6"} onChange={onChange} />
          ),
        },
      ],
    },

    {
      tab: "Style",
      section: "Dropdown / Mega Panel Colours",
      controls: [
        {
          name: "nav_box_bg",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Panel Background Color" value={value ?? "#ffffff"} onChange={onChange} />
          ),
        },
        {
          name: "nav_box_text",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Panel Text Color" value={value ?? "#111827"} onChange={onChange} />
          ),
        },
        {
          name: "nav_border_color",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Panel border Color" value={value ?? "#e5e7eb"} onChange={onChange} />
          ),
        },
      ],
    },

    {
      tab: "Style",
      section: "Active States",
      controls: [
        {
          name: "nav_highlight",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Nav Highlight Accent" value={value ?? "#00aaa6"} onChange={onChange} />
          ),
        },
        {
          name: "nav_active_bg",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Active Item Background" value={value ?? "#00aaa6"} onChange={onChange} />
          ),
        },
        {
          name: "nav_active_text",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Active Item Text Color" value={value ?? "#ffffff"} onChange={onChange} />
          ),
        },
      ],
    },

    {
      tab: "Style",
      section: "Typography & Spacing",
      controls: [
        {
          name: "nav_font_size",
          responsive: false,
          render: (value: any, onChange: any) => (
            <NumberControl
              label="Font Size (px)"
              value={value ?? 14}
              onChange={onChange}
              min={10}
              max={32}
              step={1}
            />
          ),
        },
        {
          name: "nav_font_weight",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select
              label="Font Weight"
              value={String(value ?? 500)}
              onChange={(v) => onChange(parseInt(v, 10))}
              options={[
                { value: "400", label: "400 — Regular" },
                { value: "500", label: "500 — Medium" },
                { value: "600", label: "600 — Semi-bold" },
                { value: "700", label: "700 — Bold" },
              ]}
            />
          ),
        },
        {
          name: "nav_gap",
          responsive: false,
          render: (value: any, onChange: any) => (
            <NumberControl
              label="Item Gap spacing (px)"
              value={value ?? 4}
              onChange={onChange}
              min={0}
              max={40}
              step={1}
            />
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

  render: (element: any) => <MenusFrontend element={element} />,
};

export default menusElement;
