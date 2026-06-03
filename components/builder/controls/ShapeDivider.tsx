"use client";

export default function ShapeDivider({
  value,
  onChange,
}: any) {
  const current = {
    enabled: false,
    position: "bottom",
    shape: "wave",
    ...value,
  };

  const update = (
    field: string,
    fieldValue: string
  ) => {
    onChange({
      ...current,
      [field]: fieldValue,
    });
  };

  return (
    <div className="space-y-4">

      <button
        type="button"
        onClick={() =>
          onChange({
            ...current,
            enabled: !current.enabled,
          })
        }
        className={`rounded-lg border p-3 ${
          current.enabled
            ? "bg-black text-white"
            : ""
        }`}
      >
        Enable Divider
      </button>

      {current.enabled && (
        <>
          <select
            value={current.position}
            onChange={(e) =>
              update("position", e.target.value)
            }
            className="w-full rounded-lg border p-2"
          >
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
          </select>

          <select
            value={current.shape}
            onChange={(e) =>
              update("shape", e.target.value)
            }
            className="w-full rounded-lg border p-2"
          >
            <option value="wave">Wave</option>
            <option value="curve">Curve</option>
            <option value="triangle">Triangle</option>
          </select>
        </>
      )}

    </div>
  );
}