"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";

/**
 * MinHeight control with unit selector (px, %, em, rem, vw, vh) and "auto" mode.
 * value: { value: number, unit: string } OR number (legacy — treated as px)
 *
 * - Default: has a height value (e.g. 300px)
 * - When elements are placed inside, it becomes "auto" automatically
 * - User can override back to a fixed value
 */

const UNITS = ["px", "%", "vh", "em", "rem", "vw"];

const UNIT_RANGES: Record<string, { min: number; max: number; step: number }> = {
  px: { min: 0, max: 1200, step: 1 },
  "%": { min: 0, max: 100, step: 1 },
  vh: { min: 0, max: 100, step: 1 },
  em: { min: 0, max: 80, step: 0.1 },
  rem: { min: 0, max: 80, step: 0.1 },
  vw: { min: 0, max: 100, step: 1 },
};

export default function MinHeight({ value, onChange }: any) {
  // Normalize value
  const normalized =
    typeof value === "object" && value !== null
      ? { value: value.value ?? 0, unit: value.unit ?? "px" }
      : { value: value ?? 0, unit: "px" };

  const isAuto = normalized.unit === "auto";
  const [showUnits, setShowUnits] = useState(false);

  const range = UNIT_RANGES[normalized.unit] || UNIT_RANGES.px;

  const update = (v: number) => {
    onChange({ value: v, unit: normalized.unit });
  };

  const changeUnit = (unit: string) => {
    if (unit === "auto") {
      onChange({ value: 0, unit: "auto" });
    } else {
      const defaults: Record<string, number> = {
        px: 300,
        "%": 100,
        vh: 50,
        em: 20,
        rem: 20,
        vw: 50,
      };
      onChange({ value: defaults[unit] ?? 0, unit });
    }
    setShowUnits(false);
  };

  return (
    <div>
      {/* Label row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-medium text-gray-700">Min Height</span>
        {/* Unit selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUnits(!showUnits)}
            className="text-xs font-semibold text-fuchsia-500 bg-transparent border-none cursor-pointer"
          >
            {isAuto ? "auto" : normalized.unit}
          </button>

          {showUnits && (
            <div className="absolute top-full right-0 z-20 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[50px]">
              {UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => changeUnit(u)}
                  className={`block w-full px-3 py-1 text-xs text-left border-none cursor-pointer ${normalized.unit === u ? "bg-purple-50 text-fuchsia-500" : "bg-transparent text-gray-700"
                    }`}
                >
                  {u}
                </button>
              ))}
              {/* Auto option */}
              <button
                type="button"
                onClick={() => changeUnit("auto")}
                className={`block w-full px-3 py-1 text-xs text-left border-none cursor-pointer ${isAuto ? "bg-purple-50 text-fuchsia-500" : "bg-transparent text-gray-700"
                  }`}
              >
                auto
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Slider + input (hidden when auto) */}
      {!isAuto && (
        <>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={range.min}
              max={range.max}
              step={range.step}
              value={normalized.value}
              onChange={(e) => update(Number(e.target.value))}
              className="flex-1 accent-gray-700"
            />
            <input
              type="number"
              min={range.min}
              max={range.max}
              step={range.step}
              value={normalized.value}
              onChange={(e) => update(Number(e.target.value))}
              className="w-16 px-2 py-1 text-[13px] border border-gray-200 rounded text-center outline-none"
            />
          </div>
          <p className="text-[11px] text-gray-400 italic mt-1.5">
            To achieve full height Container use 100vh.
          </p>
        </>
      )}

      {isAuto && (
        <p className="text-[11px] text-gray-400 italic">
          Height adjusts automatically based on content.
        </p>
      )}
    </div>
  );
}
