"use client";

import { Icon } from "@iconify/react";
import ColorPickerPopup from "./ColorPickerPopup";
import NumberControl from "./Number";
import Tabs from "./group/Tabs";
import ImageGallery from "./ImageGallery";

/**
 * Background control — Elementor-style
 * Types: color | gradient | video | image
 * Normal / Hover tabs — each stores SEPARATE data.
 *
 * Schema shape:
 * {
 *   normal: { type, color, image, gradient, video, scrollingEffects, mouseEffects },
 *   hover: { type, color, image, gradient, scrollingEffects, mouseEffects },
 *   transition: number (ms)
 * }
 */

const BG_TYPES = [
  { value: "color", icon: "mdi:brush", title: "Classic" },
  { value: "gradient", icon: "mdi:gradient-horizontal", title: "Gradient" },
  { value: "video", icon: "mdi:video", title: "Video" },
  { value: "image", icon: "mdi:image", title: "Slideshow" },
];

const GRADIENT_TYPES = [
  { value: "linear", label: "Linear" },
  { value: "radial", label: "Radial" },
];

const ANGLE_UNITS = ["deg", "grad", "rad", "turn"];

const DEFAULT_STATE = {
  type: "none" as string,
  color: "transparent",
  image: "",
  gradient: {
    color1: "#ffffff",
    location1: 0,
    color2: "#ff0000",
    location2: 100,
    type: "linear",
    angle: 180,
    angleUnit: "deg",
  },
  video: {
    url: "",
    startTime: 0,
    endTime: 0,
    playOnce: false,
    playOnMobile: false,
    privacyMode: false,
    fallbackImage: "",
  },
  scrollingEffects: false,
  mouseEffects: false,
};

function normalizeValue(value: any) {
  // Support legacy flat format (no normal/hover keys) — migrate to new format
  if (value && !value.normal && value.type !== undefined) {
    return {
      normal: { ...DEFAULT_STATE, ...value },
      hover: { ...DEFAULT_STATE },
      transition: 300,
    };
  }
  return {
    normal: { ...DEFAULT_STATE, ...(value?.normal || {}) },
    hover: { ...DEFAULT_STATE, ...(value?.hover || {}) },
    transition: value?.transition ?? 300,
  };
}

export default function Background({ value, onChange }: any) {
  const data = normalizeValue(value);

  const makeTabContent = (tab: "normal" | "hover") => {
    const current = data[tab];

    const emit = (updated: any) => onChange({ ...data, [tab]: updated });
    const update = (field: string, fieldValue: any) => emit({ ...current, [field]: fieldValue });
    const updateGradient = (field: string, fieldValue: any) =>
      emit({ ...current, gradient: { ...current.gradient, [field]: fieldValue } });
    const updateVideo = (field: string, fieldValue: any) =>
      emit({ ...current, video: { ...current.video, [field]: fieldValue } });

    return (
      <div>
        {/* Background Type */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] text-gray-700">Background Type</span>
          <div className="flex gap-0.5">
            {BG_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => update("type", current.type === t.value ? "none" : t.value)}
                title={t.title}
                className={`flex items-center justify-center w-7 h-7 border border-gray-200 rounded-[3px] cursor-pointer ${current.type === t.value ? "bg-gray-100" : "bg-white"}`}
              >
                <Icon icon={t.icon} width="16" className={current.type === t.value ? "text-gray-900" : "text-gray-500"} />
              </button>
            ))}
          </div>
        </div>

        {/* COLOR */}
        {current.type === "color" && (
          <div>
            <ColorPickerPopup label="Color" value={current.color} onChange={(c) => update("color", c)} />
            <ImageGallery label="Image" value={current.image} onChange={(v) => update("image", v)} />
            <ToggleRow label="Scrolling Effects" value={current.scrollingEffects} onChange={(v) => update("scrollingEffects", v)} />
            <ToggleRow label="Mouse Effects" value={current.mouseEffects} onChange={(v) => update("mouseEffects", v)} />
          </div>
        )}

        {/* GRADIENT */}
        {current.type === "gradient" && (
          <div>
            <div className="bg-yellow-50 border-l-[3px] border-amber-500 px-3 py-2 mb-3 text-[11px] text-yellow-800 italic">
              Set locations and angle for each breakpoint to ensure the gradient adapts to different screen sizes.
            </div>
            <ColorPickerPopup label="Color" value={current.gradient.color1} onChange={(c) => updateGradient("color1", c)} />
            <NumberControl label="Location" value={current.gradient.location1} onChange={(v) => updateGradient("location1", v)} min={0} max={100} unit="%" />
            <ColorPickerPopup label="Second Color" value={current.gradient.color2} onChange={(c) => updateGradient("color2", c)} />
            <NumberControl label="Location" value={current.gradient.location2} onChange={(v) => updateGradient("location2", v)} min={0} max={100} unit="%" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] text-gray-700">Type</span>
              <select
                value={current.gradient.type}
                onChange={(e) => updateGradient("type", e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded text-xs"
              >
                {GRADIENT_TYPES.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
            {current.gradient.type === "linear" && (
              <NumberControl
                label="Angle"
                value={current.gradient.angle}
                onChange={(v) => updateGradient("angle", v)}
                min={0}
                max={360}
                units={ANGLE_UNITS}
                unit={current.gradient.angleUnit}
                onUnitChange={(u) => updateGradient("angleUnit", u)}
              />
            )}
          </div>
        )}

        {/* VIDEO */}
        {current.type === "video" && (
          <div>
            <ColorPickerPopup label="Color" value={current.color} onChange={(c) => update("color", c)} />
            <div className="mb-3">
              <span className="text-[13px] text-gray-700 block mb-1">Video Link</span>
              <input
                type="text"
                value={current.video.url}
                onChange={(e) => updateVideo("url", e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full p-2 border border-gray-200 rounded text-xs"
              />
              <p className="text-[10px] text-gray-400 italic mt-1">YouTube/Vimeo link, or link to video file (mp4 is recommended).</p>
            </div>
            <NumberControl label="Start Time" value={current.video.startTime} onChange={(v) => updateVideo("startTime", v)} min={0} showSlider={false} />
            <NumberControl label="End Time" value={current.video.endTime} onChange={(v) => updateVideo("endTime", v)} min={0} showSlider={false} />
            <ToggleRow label="Play Once" value={current.video.playOnce} onChange={(v) => updateVideo("playOnce", v)} />
            <ToggleRow label="Play On Mobile" value={current.video.playOnMobile} onChange={(v) => updateVideo("playOnMobile", v)} />
            <ToggleRow label="Privacy Mode" value={current.video.privacyMode} onChange={(v) => updateVideo("privacyMode", v)} />
            <ImageGallery label="Background Fallback" value={current.video.fallbackImage} onChange={(v) => updateVideo("fallbackImage", v)} />
          </div>
        )}

        {/* IMAGE */}
        {current.type === "image" && (
          <div>
            <ColorPickerPopup label="Color" value={current.color} onChange={(c) => update("color", c)} />
            <ImageGallery label="Image" value={current.image} onChange={(v) => update("image", v)} />
            <ToggleRow label="Scrolling Effects" value={current.scrollingEffects} onChange={(v) => update("scrollingEffects", v)} />
            <ToggleRow label="Mouse Effects" value={current.mouseEffects} onChange={(v) => update("mouseEffects", v)} />
          </div>
        )}

        {/* Transition — Hover tab only */}
        {tab === "hover" && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <NumberControl
              label="Transition Duration"
              unit="ms"
              value={data.transition}
              onChange={(v) => onChange({ ...data, transition: v })}
              min={0}
              max={2000}
              step={50}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <Tabs
      tabs={[
        { label: "Normal", content: makeTabContent("normal") },
        { label: "Hover", content: makeTabContent("hover") },
      ]}
    />
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function ImageUpload({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] text-gray-700">{label}</span>
          <Icon icon="mdi:monitor" width="13" className="text-gray-400" />
        </div>
        <Icon icon="mdi:auto-fix" width="14" className="text-fuchsia-500" />
      </div>
      {value ? (
        <div className="relative rounded overflow-hidden mb-1">
          <img src={value} alt="" className="w-full h-[120px] object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white border-none cursor-pointer flex items-center justify-center"
          >
            <Icon icon="mdi:close" width="12" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => {
            const url = prompt("Enter image URL:");
            if (url) onChange(url);
          }}
          className="w-full h-[120px] bg-gray-200 rounded flex items-center justify-center cursor-pointer"
        >
          <Icon icon="mdi:plus-circle" width="24" className="text-white" />
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between mb-3 pt-2 border-t border-gray-100">
      <span className="text-[13px] text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-9 h-5 rounded-[10px] border-none cursor-pointer transition-colors ${value ? "bg-blue-500" : "bg-gray-300"}`}
      >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-[left] ${value ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}
