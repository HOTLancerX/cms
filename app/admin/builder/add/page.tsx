"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BuilderAddPage() {
    const [title, setTitle] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setLoading(true);
        try {
            const res = await fetch("/api/builder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: title.trim() }),
            });
            const doc = await res.json();
            if (doc._id) {
                router.push(`/admin/builder/${doc._id}`);
            }
        } catch {
            setLoading(false);
        }
    };

    return (
        <div className="">
            <h1 className="text-xl font-bold mb-5">Create Builder Page</h1>
            <form onSubmit={handleSubmit}>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Page Title
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter page title"
                    autoFocus
                    className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-sm outline-none focus:border-blue-400 mb-4"
                />
                <button
                    type="submit"
                    disabled={loading || !title.trim()}
                    className={`px-6 py-2.5 text-sm font-medium text-white rounded-lg border-none cursor-pointer ${loading || !title.trim()
                            ? "bg-neutral-400 cursor-not-allowed"
                            : "bg-blue-500 hover:bg-blue-600"
                        }`}
                >
                    {loading ? "Creating..." : "Create & Edit"}
                </button>
            </form>
        </div>
    );
}
