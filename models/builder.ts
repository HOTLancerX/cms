import mongoose, { Schema, type Document } from "mongoose";

export interface IBuilder extends Document {
    title: string;
    content: any; // JSON structure of rows/columns/elements
    status: "active" | "inactive";
    /**
     * Optional template type this builder page registers as.
     * When set (e.g. "header", "footer") it can be selected as the
     * default layout for that type in the Template Manager.
     */
    templateType?: string;
    createdAt: Date;
    updatedAt: Date;
}

const BuilderSchema = new Schema<IBuilder>(
    {
        title: { type: String, required: true },
        content: { type: Schema.Types.Mixed, default: [] },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },
        templateType: { type: String, default: null },
    },
    { timestamps: true }
);

export default (mongoose.models.Builder as mongoose.Model<IBuilder>) ||
    mongoose.model<IBuilder>("Builder", BuilderSchema);
