import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IPostInfo extends Document {
    postId: Types.ObjectId;
    name: string;
    value: string;
}

const PostInfoSchema = new Schema<IPostInfo>(
    {
        postId: {
            type: Schema.Types.ObjectId,
            ref: "Post",
            required: true,
            index: true,
        },
        name: { type: String, required: true },
        value: { type: String, default: "" },
    },
    { timestamps: true }
);

// Compound index: one key per post
PostInfoSchema.index({ postId: 1, name: 1 }, { unique: true });

export default (mongoose.models.PostInfo as mongoose.Model<IPostInfo>) ||
    mongoose.model<IPostInfo>("PostInfo", PostInfoSchema);
