import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IUserInfo extends Document {
    userId: Types.ObjectId;
    name: string;
    value: string;
}

const UserInfoSchema = new Schema<IUserInfo>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        name: { type: String, required: true },
        value: { type: String, default: "" },
    },
    { timestamps: true }
);

// Compound index: one key per user
UserInfoSchema.index({ userId: 1, name: 1 }, { unique: true });

export default (mongoose.models.UserInfo as mongoose.Model<IUserInfo>) ||
    mongoose.model<IUserInfo>("UserInfo", UserInfoSchema);
