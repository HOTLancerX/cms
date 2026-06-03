import mongoose, { Schema, type Document } from "mongoose";

export interface ITemplate extends Document {
    type: string;      // e.g. "cat", "post"
    key: string;       // hook key, e.g. "category"
    label: string;     // human-readable name, e.g. "Cat page Layout 1"
    position: number;  // ordering within the type
    pluginNx: string;  // nx of the plugin that registered this template
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const TemplateSchema = new Schema<ITemplate>(
    {
        type: { type: String, required: true },
        key: { type: String, required: true },
        label: { type: String, required: true },
        position: { type: Number, default: 0 },
        pluginNx: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Compound unique index — one record per (type + label + pluginNx) combination
TemplateSchema.index({ type: 1, label: 1, pluginNx: 1 }, { unique: true });

export default (mongoose.models.Template as mongoose.Model<ITemplate>) ||
    mongoose.model<ITemplate>("Template", TemplateSchema);
