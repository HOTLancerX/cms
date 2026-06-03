import mongoose, { Schema, type Document } from "mongoose";

export interface IBuilderSection extends Document {
    title: string;
    type: string; // e.g. "header", "footer", "hero", "category", "cta", "testimonial", "faq", "contact", "pricing", "team", "general"
    image: string; // thumbnail/preview image URL
    content: any; // JSON structure of rows/columns/elements (same as builder content)
    status: "active" | "inactive";
    createdAt: Date;
    updatedAt: Date;
}

const BuilderSectionSchema = new Schema<IBuilderSection>(
    {
        title: { type: String, required: true },
        type: { type: String, required: true, default: "general" },
        image: { type: String, default: "" },
        content: { type: Schema.Types.Mixed, default: [] },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },
    },
    { timestamps: true }
);

BuilderSectionSchema.index({ type: 1, updatedAt: -1 });

export default (mongoose.models.BuilderSection as mongoose.Model<IBuilderSection>) ||
    mongoose.model<IBuilderSection>("BuilderSection", BuilderSectionSchema);
