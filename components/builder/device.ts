import { Device, Column, ColumnWidths } from "./types";

/**
 * Device-aware value read/write utilities.
 *
 * Storage format:
 *   A control value is stored as the desktop value with optional `_tablet` / `_mobile` keys:
 *   { value: 50, unit: "%", _mobile: { value: 100, unit: "%" } }
 *
 * - Desktop is the base (everything except _tablet/_mobile keys)
 * - Tablet/Mobile overrides are nested under _tablet/_mobile
 * - If no override exists for a device, desktop value is used (fallback)
 *
 * Primitive desktop values that need device overrides are wrapped as:
 *   { _v: "someString", _tablet?: ..., _mobile?: ... }
 * Object desktop values store overrides directly as sibling keys:
 *   { top: 0, right: 0, ..., _mobile: { top: 10, right: 10, ... } }
 */

/**
 * Resolve the effective column width (%) for a given device.
 * Falls back: mobile → tablet → desktop → col.width (legacy).
 */
export function getColumnWidth(col: Column, device: Device): number {
    if (col.widths) {
        if (device === "mobile" && col.widths.mobile !== undefined) return col.widths.mobile;
        if (device === "tablet" && col.widths.tablet !== undefined) return col.widths.tablet;
        return col.widths.desktop;
    }
    // Legacy flat width
    return col.width;
}

/**
 * Read the value for a specific device.
 * Returns a clean value without device override keys.
 */
export function getDeviceValue(storedValue: any, device: Device): any {
    // Primitives (string, number, boolean, null, undefined) — no device overrides possible
    if (!storedValue || typeof storedValue !== "object" || Array.isArray(storedValue)) {
        return storedValue;
    }

    // Wrapped primitive format: { _v: "value", _tablet?: ..., _mobile?: ... }
    if ("_v" in storedValue) {
        if (device !== "desktop") {
            const key = `_${device}` as "_tablet" | "_mobile";
            if (key in storedValue && storedValue[key] !== undefined) {
                return storedValue[key];
            }
        }
        return storedValue._v;
    }

    // Check if this object has device keys
    const hasDeviceKeys = "_tablet" in storedValue || "_mobile" in storedValue;

    if (!hasDeviceKeys) {
        return storedValue;
    }

    if (device !== "desktop") {
        const key = `_${device}` as "_tablet" | "_mobile";
        if (key in storedValue && storedValue[key] !== undefined) {
            return storedValue[key];
        }
        // Fallback to desktop
    }

    // Return desktop value (strip device keys)
    const clean: any = {};
    for (const k of Object.keys(storedValue)) {
        if (k !== "_tablet" && k !== "_mobile") {
            clean[k] = storedValue[k];
        }
    }
    return clean;
}

/**
 * Write a value for a specific device.
 * Returns the new stored value (with device overrides preserved).
 */
export function setDeviceValue(storedValue: any, device: Device, newValue: any): any {
    if (device === "desktop") {
        // Preserve existing device overrides, replace desktop portion
        if (!storedValue || typeof storedValue !== "object" || Array.isArray(storedValue)) {
            return newValue;
        }

        // Wrapped primitive format — storedValue._v is a primitive.
        // If newValue is also a primitive, keep the _v wrapper.
        // If newValue is an object, the control type changed — unwrap and
        // store as a plain object with device overrides as sibling keys.
        if ("_v" in storedValue && (newValue === null || typeof newValue !== "object" || Array.isArray(newValue))) {
            const result: any = { _v: newValue };
            if ("_tablet" in storedValue) result._tablet = storedValue._tablet;
            if ("_mobile" in storedValue) result._mobile = storedValue._mobile;
            return result;
        }

        // If newValue is not an object, can't attach overrides — but preserve them via _v wrapper
        if (!newValue || typeof newValue !== "object" || Array.isArray(newValue)) {
            const hasOverrides = "_tablet" in storedValue || "_mobile" in storedValue;
            if (hasOverrides) {
                const result: any = { _v: newValue };
                if ("_tablet" in storedValue) result._tablet = storedValue._tablet;
                if ("_mobile" in storedValue) result._mobile = storedValue._mobile;
                return result;
            }
            return newValue;
        }

        // Merge: new desktop value + existing overrides
        const result: any = { ...newValue };
        if ("_tablet" in storedValue) result._tablet = storedValue._tablet;
        if ("_mobile" in storedValue) result._mobile = storedValue._mobile;
        return result;
    }

    // Setting tablet or mobile override
    const key = `_${device}`;

    if (!storedValue || typeof storedValue !== "object" || Array.isArray(storedValue)) {
        // Base is a primitive — wrap it so we can attach the override
        return { _v: storedValue, [key]: newValue };
    }

    return { ...storedValue, [key]: newValue };
}
