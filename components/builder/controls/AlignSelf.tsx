"use client";

export default function AlignSelf({
  value,
  onChange,
}: any) {
  const options = [
    "auto",
    "flex-start",
    "center",
    "flex-end",
    "stretch",
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`rounded-lg border p-2 text-xs ${
            value === item
              ? "bg-black text-white"
              : ""
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}