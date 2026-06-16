import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ICat extends Document {
    title: string;
    slug: string;
    type: string;
    parentId: Types.ObjectId | null;
    status: "draft" | "published" | "trash";
    createdAt: Date;
    updatedAt: Date;
}

const CatSchema = new Schema<ICat>(
    {
        title:    { type: String, required: true },
        slug:     { type: String, required: true, unique: true },
        type:     { type: String, default: "" },
        parentId: { type: Schema.Types.ObjectId, ref: "Cat", default: null, index: true },
        status: {
            type: String,
            enum: ["draft", "published", "trash"],
            default: "draft",
        },
    },
    { timestamps: true }
);

export default (mongoose.models.Cat as mongoose.Model<ICat>) ||
    mongoose.model<ICat>("Cat", CatSchema);
