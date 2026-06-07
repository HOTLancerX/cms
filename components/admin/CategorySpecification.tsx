"use client";

import { Icon } from "@iconify/react";
import Gallery from "@/components/Gallery";

export interface SpecificationField {
    title: string;
    description: string;
    image?: string;
}

export interface SpecificationBox {
    title: string;
    fields: SpecificationField[];
}

interface CategorySpecificationProps {
    specifications: SpecificationBox[];
    onChange: (specifications: SpecificationBox[]) => void;
}

export default function CategorySpecification({ specifications, onChange }: CategorySpecificationProps) {
    const addBox = () => {
        onChange([...specifications, { title: "", fields: [] }]);
    };

    const removeBox = (boxIndex: number) => {
        onChange(specifications.filter((_, i) => i !== boxIndex));
    };

    const updateBoxTitle = (boxIndex: number, title: string) => {
        onChange(specifications.map((box, i) => i === boxIndex ? { ...box, title } : box));
    };

    const addField = (boxIndex: number) => {
        onChange(
            specifications.map((box, i) =>
                i === boxIndex ? { ...box, fields: [...box.fields, { title: "", description: "" }] } : box
            )
        );
    };

    const removeField = (boxIndex: number, fieldIndex: number) => {
        onChange(
            specifications.map((box, i) =>
                i === boxIndex
                    ? { ...box, fields: box.fields.filter((_, fi) => fi !== fieldIndex) }
                    : box
            )
        );
    };

    const updateField = (boxIndex: number, fieldIndex: number, patch: Partial<SpecificationField>) => {
        onChange(
            specifications.map((box, i) =>
                i === boxIndex
                    ? {
                        ...box,
                        fields: box.fields.map((f, fi) =>
                            fi === fieldIndex ? { ...f, ...patch } : f
                        ),
                    }
                    : box
            )
        );
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Specifications</h2>
                <button
                    type="button"
                    onClick={addBox}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-400 transition"
                >
                    <Icon icon="solar:add-circle-bold" width={16} />
                    Add Box
                </button>
            </div>

            <div className="space-y-4">
                {specifications.map((box, boxIndex) => (
                    <div key={boxIndex} className="border rounded-lg p-4 bg-gray-50">
                        {/* Box header */}
                        <div className="flex items-center gap-2 mb-3">
                            <input
                                type="text"
                                value={box.title}
                                onChange={(e) => updateBoxTitle(boxIndex, e.target.value)}
                                placeholder="Box Title (e.g. General, Dimensions)"
                                className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                            />
                            <button
                                type="button"
                                onClick={() => removeBox(boxIndex)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                title="Remove Box"
                            >
                                <Icon icon="solar:trash-bin-trash-bold" width={18} />
                            </button>
                        </div>

                        {/* Fields */}
                        <div className="space-y-2">
                            {box.fields.map((field, fieldIndex) => (
                                <div key={fieldIndex} className="flex items-start gap-2">
                                    <div className="flex-1 grid grid-cols-3 gap-2">
                                        <Gallery
                                            value={field.image || ""}
                                            onChange={(img) =>
                                                updateField(boxIndex, fieldIndex, {
                                                    image: typeof img === "string" ? img : img[0] || "",
                                                })
                                            }
                                            placeholder="Field image"
                                        />
                                        <input
                                            type="text"
                                            value={field.title}
                                            onChange={(e) =>
                                                updateField(boxIndex, fieldIndex, { title: e.target.value })
                                            }
                                            placeholder="Field Title"
                                            className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                                        />
                                        <textarea
                                            value={field.description}
                                            onChange={(e) =>
                                                updateField(boxIndex, fieldIndex, { description: e.target.value })
                                            }
                                            placeholder="Field Description"
                                            rows={1}
                                            className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-indigo-500 resize-none"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeField(boxIndex, fieldIndex)}
                                        className="mt-1 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                                        title="Remove Field"
                                    >
                                        <Icon icon="solar:close-circle-bold" width={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => addField(boxIndex)}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition"
                        >
                            <Icon icon="solar:add-circle-bold" width={14} />
                            Add Field
                        </button>
                    </div>
                ))}

                {specifications.length === 0 && (
                    <p className="text-center py-6 text-sm text-gray-400">
                        No specification boxes yet. Click "Add Box" to get started.
                    </p>
                )}
            </div>
        </div>
    );
}
