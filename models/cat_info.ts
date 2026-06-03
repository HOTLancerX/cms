import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ICatInfo extends Document {
    catId: Types.ObjectId;
    name: string;
    value: string;
}

const CatInfoSchema = new Schema<ICatInfo>(
    {
        catId: {
            type: Schema.Types.ObjectId,
            ref: "Cat",
            required: true,
            index: true,
        },
        name: { type: String, required: true },
        value: { type: String, default: "" },
    },
    { timestamps: true }
);

// Compound index: one key per category
CatInfoSchema.index({ catId: 1, name: 1 }, { unique: true });

export default (mongoose.models.CatInfo as mongoose.Model<ICatInfo>) ||
    mongoose.model<ICatInfo>("CatInfo", CatInfoSchema);
