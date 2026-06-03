import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
    throw new Error("Please define MONGODB_URI in .env.local");
}

// Reuse connection across hot-reloads in development
declare global {
    // eslint-disable-next-line no-var
    var _mongooseConn: Promise<typeof mongoose> | undefined;
}

async function connectDB(): Promise<typeof mongoose> {
    if (global._mongooseConn) {
        return global._mongooseConn;
    }
    global._mongooseConn = mongoose.connect(MONGODB_URI);
    return global._mongooseConn;
}

export default connectDB;
