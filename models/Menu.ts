import mongoose, { Schema, type Document } from "mongoose";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type MenuDisplayStyle =
    | "none"
    | "left"
    | "right"
    | "mega"
    | "style-1"
    | "style-2"
    | "style-3"
    | "style-4"
    | "style-5"
    | "builder";

/**
 * A single node in the menu tree.
 * `type` is the registered content-type key (e.g. "blog", "blog-category",
 * "page", "product") or "custom" for manually entered links.
 * Children are stored recursively as plain Mixed data.
 */
export interface MenuItem {
    id: string;
    type: string;
    label: string;
    url: string;
    referenceId?: string;
    image?: string;
    displayStyle?: MenuDisplayStyle;
    gridNumber?: number;
    /**
     * When displayStyle === 'builder', this holds the Builder document _id.
     * The panel renders the full page-builder content for that ID instead of
     * a standard grid of child links.
     */
    builderId?: string;
    customFields?: Record<string, unknown>;
    children?: MenuItem[];
    order: number;
}

export interface IMenu extends Document {
    title: string;
    /** e.g. ["header-1", "footer-2", "mobile-1"] */
    location: string[];
    items: MenuItem[];
    status: "active" | "inactive";
    createdAt: Date;
    updatedAt: Date;
}

// ─── Schema ────────────────────────────────────────────────────────────────────

const MenuSchema = new Schema<IMenu>(
    {
        title:    { type: String, required: true, trim: true },
        location: { type: [String], default: [] },
        // Stored as Mixed so recursive MenuItem trees aren't constrained by Mongoose
        items:    { type: Schema.Types.Mixed, default: [] },
        status:   { type: String, enum: ["active", "inactive"], default: "active" },
    },
    { timestamps: true, collection: "menus" }
);

MenuSchema.index({ location: 1 });
MenuSchema.index({ status: 1 });
MenuSchema.index({ title: 1 });

// ─── Model ─────────────────────────────────────────────────────────────────────

export default (mongoose.models.Menu as mongoose.Model<IMenu>) ||
    mongoose.model<IMenu>("Menu", MenuSchema);
