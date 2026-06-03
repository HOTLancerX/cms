import mongoose, { Schema, type Document } from "mongoose";

export interface IPlugin extends Document {
    nx: string;
    name: string;
    version: string;
    icon: string;
    color: string;
    status: "active" | "inactive" | "install" | "update" | "delete";
    createdAt: Date;
    updatedAt: Date;
}

const PluginSchema = new Schema<IPlugin>(
    {
        nx: { type: String, required: true, unique: true },
        name: { type: String, required: true, unique: true },
        version: { type: String, required: true },
        icon: { type: String, default: "solar:plugin-bold" },
        color: { type: String, default: "from-violet-500 to-purple-600" },
        status: {
            type: String,
            enum: ["active", "inactive", "install", "update", "delete"],
            default: "inactive",
        },
    },
    { timestamps: true }
);

export default (mongoose.models.Plugin as mongoose.Model<IPlugin>) ||
    mongoose.model<IPlugin>("Plugin", PluginSchema);
