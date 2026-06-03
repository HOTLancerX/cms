import mongoose, { Schema, type Document } from "mongoose";

export interface IBuilder extends Document {
    title: string;
    content: any; // JSON structure of rows/columns/elements
    status: "active" | "inactive";
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
    },
    { timestamps: true }
);

export default (mongoose.models.Builder as mongoose.Model<IBuilder>) ||
    mongoose.model<IBuilder>("Builder", BuilderSchema);
