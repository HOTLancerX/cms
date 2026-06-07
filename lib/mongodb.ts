import mongoose from "mongoose";
import { Collection, ObjectId, Document } from "mongodb";

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

// ─── Native MongoDB driver helpers ───────────────────────────────────────────
// Used by Library.ts and the /api/library routes which rely on the raw driver.
// We reuse the MongoClient that Mongoose creates internally so there is only
// ever one connection pool.

async function getNativeDb() {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not ready");
    return db;
}

export async function getCollection<T extends Document = Document>(
    name: string
): Promise<Collection<T>> {
    const db = await getNativeDb();
    return db.collection<T>(name);
}

// Serialize a single MongoDB document: converts ObjectId → plain string "id"
export function serializeDoc<T extends { _id?: ObjectId | string; id?: string }>(
    doc: T
): T & { id: string } {
    const { _id, ...rest } = doc as any;
    return {
        ...rest,
        id: _id ? _id.toString() : (rest.id ?? ""),
    };
}

// Serialize an array of documents
export function serializeDocs<T extends { _id?: ObjectId | string; id?: string }>(
    docs: T[]
): (T & { id: string })[] {
    return docs.map(serializeDoc);
}
