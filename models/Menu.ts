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
    icon?: string;
    /** How to display the menu item in the navbar: 'both' (default: icon/image + text), 'text' (text only), 'icon' (icon/image only) */
    showMode?: 'both' | 'text' | 'icon';
    displayStyle?: MenuDisplayStyle;
    gridNumber?: number;
    /**
     * When displayStyle === 'builder', this holds the Builder document _id.
     * The panel renders the full page-builder content for that ID instead of
     * a standard grid of child links.
     */
    builderId?: string;
    /** Whether to fetch and render posts in category ratio / subpanel */
    showPosts?: boolean;
    /** Specific category ID or slug for filtering posts */
    postCategory?: string;
    /** Post type (e.g. "blog", "news", "post") */
    postType?: string;
    /** Total posts to fetch and display (e.g. 4, 6, 8, 12) */
    postLimit?: number;
    /** Display posts as a responsive Grid or interactive Embla Slider */
    layoutType?: 'grid' | 'slider';
    /** Carousel slider settings */
    sliderAutoplay?: boolean;
    sliderSpeed?: number;
    sliderArrows?: boolean;
    sliderDots?: boolean;
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
