import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IUser extends Document {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    email: string;
    phone?: string;
    password: string;
    type: "admin" | "reporter" | "editor" | "user" | "seller";
    image?: string;
    status: "active" | "inactive" | "suspended";
    address?: string;
    state?: string;
    city?: string;
    zipCode?: string;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true },
        phone: { type: String, default: "" },
        password: { type: String, required: true },
        type: {
            type: String,
            enum: ["admin", "reporter", "editor", "user", "seller"],
            default: "user",
        },
        image: { type: String, default: "" },
        status: {
            type: String,
            enum: ["active", "inactive", "suspended"],
            default: "active",
        },
        address: { type: String, default: "" },
        state: { type: String, default: "" },
        city: { type: String, default: "" },
        zipCode: { type: String, default: "" },
    },
    { timestamps: true }
);

export default (mongoose.models.User as mongoose.Model<IUser>) ||
    mongoose.model<IUser>("User", UserSchema);
