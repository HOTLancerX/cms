"use client";

import { useState, type KeyboardEvent } from "react";
import type { FieldProps } from "@/hook";

export function Tags({ name, label, value, onChange }: FieldProps) {
    const tags = value ? value.split(",").filter(Boolean) : [];
    const [input, setInput] = useState("");

    const add = () => {
        const trimmed = input.trim();
        if (!trimmed || tags.includes(trimmed)) return;
        onChange([...tags, trimmed].join(","));
        setInput("");
    };

    const remove = (tag: string) => {
        onChange(tags.filter((t) => t !== tag).join(","));
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
        } else if (e.key === "Backspace" && !input && tags.length) {
            remove(tags[tags.length - 1]);
        }
    };

    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={name} className="text-xs font-semibold">
                {label}
            </label>
            <div className="flex flex-wrap gap-1.5 min-h-10.5 w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500">
                {tags.map((tag) => (
                    <span
                        key={tag}
                        className="inline-flex items-center gap-1 w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={() => remove(tag)}
                            className="text-indigo-400 hover:text-white transition leading-none"
                            aria-label={`Remove ${tag}`}
                        >
                            ×
                        </button>
                    </span>
                ))}
                <input
                    id={name}
                    name={name}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    onBlur={add}
                    className="flex-1 min-w-30 text-sm outline-none"
                    placeholder={tags.length ? "" : `Add ${label}…`}
                />
            </div>
            <span className="text-xs text-slate-500">Press Enter or comma to add</span>
        </div>
    );
}
