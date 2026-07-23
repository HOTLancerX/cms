import mongoose, { Schema, type Document } from "mongoose";

export interface ICommentReply {
    content: string;
    createdAt?: Date;
}

export interface IComment extends Document {
    targetType: string; // "directory", "post", "blog", "product", "page"
    targetId: string; // _id of the directory item, blog post, or product
    ownerId?: string; // _id of the owner of the target item
    userId: string; // _id of the user posting the comment/review
    userName: string; // display name
    userImage?: string; // avatar image URL
    rating?: number; // 0 to 5 (optional for simple comments, 1-5 for reviews)
    title?: string; // optional review title
    content: string; // main description/comment text (preserves line-by-line whitespace)
    images?: string[]; // uploaded image URLs
    videos?: string[]; // uploaded video URLs
    status: "pending" | "approved" | "rejected";
    reply?: ICommentReply;
    createdAt: Date;
    updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
    {
        targetType: { type: String, default: "directory", index: true },
        targetId: { type: String, required: true, index: true },
        ownerId: { type: String, default: "", index: true },
        userId: { type: String, required: true, index: true },
        userName: { type: String, required: true },
        userImage: { type: String, default: "" },
        rating: { type: Number, default: 0, min: 0, max: 5 },
        title: { type: String, default: "" },
        content: { type: String, required: true },
        images: { type: [String], default: [] },
        videos: { type: [String], default: [] },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
            index: true,
        },
        reply: {
            content: { type: String, default: "" },
            createdAt: { type: Date, default: Date.now },
        },
    },
    { timestamps: true }
);

// Compound indexes for fast querying & summary statistics
CommentSchema.index({ targetId: 1, status: 1, createdAt: -1 });
CommentSchema.index({ ownerId: 1, status: 1 });

export default (mongoose.models.Comment as mongoose.Model<IComment>) ||
    mongoose.model<IComment>("Comment", CommentSchema);
