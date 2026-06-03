import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IPost extends Document {
    title: string;
    slug: string;
    type: string;
    category: Types.ObjectId | null;
    status: "draft" | "published" | "trash";
    createdAt: Date;
    updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
    {
        title: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        type: { type: String, default: "" },
        category: { type: Schema.Types.ObjectId, ref: "Cat", default: null },
        status: {
            type: String,
            enum: ["draft", "published", "trash"],
            default: "draft",
        },
    },
    { timestamps: true }
);

export default (mongoose.models.Post as mongoose.Model<IPost>) ||
    mongoose.model<IPost>("Post", PostSchema);
