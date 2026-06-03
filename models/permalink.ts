import mongoose, { Schema, type Document } from "mongoose";

export interface IPermalink extends Document {
    /** The content type key, e.g. "blog", "page", "blog-category", "product-category" */
    contentType: string;
    /**
     * URL prefix segment(s) before the slug.
     * "" (empty)  → /{slug}          e.g. /my-post
     * "hello"     → /hello/{slug}    e.g. /hello/my-post
     * "news/blog" → /news/blog/{slug}
     */
    prefix: string;
    updatedAt: Date;
}

const PermalinkSchema = new Schema<IPermalink>(
    {
        contentType: { type: String, required: true, unique: true },
        prefix: { type: String, default: "" },
    },
    { timestamps: true }
);

export default (mongoose.models.Permalink as mongoose.Model<IPermalink>) ||
    mongoose.model<IPermalink>("Permalink", PermalinkSchema);
