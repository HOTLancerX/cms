"use client";

import { useEffect, useState } from "react";
import { xFetch } from "@/lib/express";
import type { FieldProps } from "@/hook";

export function BuilderSelect({ name, label, value, onChange }: FieldProps) {
    const [builders, setBuilders] = useState<{ _id: string; title: string; status: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        xFetch("/builder")
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch builders");
                return res.json();
            })
            .then((data) => {
                if (Array.isArray(data)) {
                    setBuilders(data);
                }
            })
            .catch((err) => console.error("Error fetching builders:", err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="flex flex-col gap-1.5 bg-white p-2 rounded">
            <label htmlFor={name} className="text-xs font-semibold">
                {label}
            </label>
            {loading ? (
                <div className="text-xs text-gray-400">Loading builders...</div>
            ) : (
                <select
                    id={name}
                    name={name}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500"
                >
                    <option value="">-- Select Builder --</option>
                    {builders.map((builder) => (
                        <option key={builder._id} value={builder._id}>
                            {builder.title} {builder.status === "inactive" ? "(Inactive)" : ""}
                        </option>
                    ))}
                </select>
            )}
        </div>
    );
}
