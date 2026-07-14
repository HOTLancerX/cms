import mongoose, { Schema, type Document } from "mongoose";

export interface IContactUs extends Document {
    fields: Record<string, any>;
    files?: string[];
    ip?: string;
    location?: string;
    device?: string;
    status: "unread" | "read" | "replied";
    createdAt: Date;
    updatedAt: Date;
}

const ContactUsSchema = new Schema<IContactUs>(
    {
        fields: { type: Schema.Types.Mixed, default: {} },
        files: { type: [String], default: [] },
        ip: { type: String, default: "" },
        location: { type: String, default: "" },
        device: { type: String, default: "" },
        status: {
            type: String,
            enum: ["unread", "read", "replied"],
            default: "unread",
        },
    },
    { timestamps: true }
);

export default (mongoose.models.ContactUs as mongoose.Model<IContactUs>) ||
    mongoose.model<IContactUs>("ContactUs", ContactUsSchema);
