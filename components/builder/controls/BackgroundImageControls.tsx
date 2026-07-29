"use client";

interface BackgroundImageControlsProps {
  current: any;
  update: (field: string, value: any) => void;
}

const POSITION_OPTIONS = [
  { value: "", label: "Default" },
  { value: "center center", label: "Center Center" },
  { value: "center left", label: "Center Left" },
  { value: "center right", label: "Center Right" },
  { value: "top left", label: "Top Left" },
  { value: "top center", label: "Top Center" },
  { value: "top right", label: "Top Right" },
  { value: "bottom left", label: "Bottom Left" },
  { value: "bottom center", label: "Bottom Center" },
  { value: "bottom right", label: "Bottom Right" },
];

const ATTACHMENT_OPTIONS = [
  { value: "", label: "Default" },
  { value: "scroll", label: "Scroll" },
  { value: "fixed", label: "Fixed" },
];

const REPEAT_OPTIONS = [
  { value: "", label: "Default" },
  { value: "no-repeat", label: "No-repeat" },
  { value: "repeat", label: "Repeat" },
  { value: "repeat-x", label: "Repeat-x" },
  { value: "repeat-y", label: "Repeat-y" },
];

const DISPLAY_SIZE_OPTIONS = [
  { value: "", label: "Default" },
  { value: "auto", label: "Auto" },
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
  { value: "custom", label: "Custom" },
];

export default function BackgroundImageControls({ current, update }: BackgroundImageControlsProps) {
  if (!current?.image) return null;

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
      {/* Position */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-gray-700">Position</span>
        <select
          value={current.position || ""}
          onChange={(e) => update("position", e.target.value)}
          className="px-2 py-1 border border-gray-200 rounded text-xs bg-white focus:outline-none"
        >
          {POSITION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Attachment */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-gray-700">Attachment</span>
        <select
          value={current.attachment || ""}
          onChange={(e) => update("attachment", e.target.value)}
          className="px-2 py-1 border border-gray-200 rounded text-xs bg-white focus:outline-none"
        >
          {ATTACHMENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Repeat */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-gray-700">Repeat</span>
        <select
          value={current.repeat || ""}
          onChange={(e) => update("repeat", e.target.value)}
          className="px-2 py-1 border border-gray-200 rounded text-xs bg-white focus:outline-none"
        >
          {REPEAT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Display Size */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-gray-700">Display Size</span>
        <select
          value={current.displaySize || ""}
          onChange={(e) => update("displaySize", e.target.value)}
          className="px-2 py-1 border border-gray-200 rounded text-xs bg-white focus:outline-none"
        >
          {DISPLAY_SIZE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Custom Display Size */}
      {current.displaySize === "custom" && (
        <div className="pt-1">
          <span className="text-[12px] text-gray-600 block mb-1">Custom Width / Size</span>
          <input
            type="text"
            value={current.customDisplaySize || ""}
            onChange={(e) => update("customDisplaySize", e.target.value)}
            placeholder="e.g. 100% auto or 500px"
            className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
