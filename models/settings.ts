import mongoose, { Schema, type Document } from "mongoose";

export interface ISetting extends Document {
    title: string;
    content: any;
    createdAt: Date;
    updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>(
    {
        title:   { type: String, required: true, unique: true },
        content: { type: Schema.Types.Mixed, default: "" },
    },
    { timestamps: true }
);

export default (mongoose.models.Setting as mongoose.Model<ISetting>) ||
    mongoose.model<ISetting>("Setting", SettingSchema);
