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

/**
 * Export database collections as a serialized JSON object.
 * @param selectedCollections Optional array of collection names to export.
 */
export async function exportDatabase(selectedCollections?: string[]): Promise<{
    timestamp: string;
    version: string;
    collections: Record<string, any[]>;
}> {
    const db = await getNativeDb();
    const allCollections = await db.listCollections().toArray();

    const collectionsToExport = selectedCollections && selectedCollections.length > 0
        ? allCollections.filter((c) => selectedCollections.includes(c.name))
        : allCollections.filter((c) => !c.name.startsWith("system."));

    const dumpData: Record<string, any[]> = {};

    for (const colDef of collectionsToExport) {
        const collectionName = colDef.name;
        const docs = await db.collection(collectionName).find({}).toArray();
        dumpData[collectionName] = docs;
    }

    return {
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        collections: dumpData,
    };
}

/**
 * Export dataset with type proportion (limiting or sampling specific types/collections).
 * @param proportions Map of collection name to limit count or percentage (0.1 to 1.0 or integer limit).
 */
export async function exportTypeProportion(proportions: Record<string, number>): Promise<{
    timestamp: string;
    version: string;
    collections: Record<string, any[]>;
}> {
    const db = await getNativeDb();
    const dumpData: Record<string, any[]> = {};

    for (const [collectionName, proportion] of Object.entries(proportions)) {
        if (proportion <= 0) continue;
        const col = db.collection(collectionName);
        const total = await col.countDocuments();
        
        let limit = total;
        if (proportion > 0 && proportion <= 1) {
            limit = Math.max(1, Math.round(total * proportion));
        } else if (proportion > 1) {
            limit = Math.min(total, Math.round(proportion));
        }

        const docs = await col.find({}).limit(limit).toArray();
        dumpData[collectionName] = docs;
    }

    return {
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        collections: dumpData,
    };
}

/**
 * Import/Dump dataset into MongoDB collections.
 * @param collections Data object keyed by collection name with array of document records.
 * @param mode 'replace' clears target collection before insertion; 'merge' inserts or updates.
 */
export async function importDatabaseDump(
    collections: Record<string, any[]>,
    mode: "replace" | "merge" = "replace"
): Promise<{ success: boolean; importedCounts: Record<string, number> }> {
    const db = await getNativeDb();
    const importedCounts: Record<string, number> = {};

    for (const [collectionName, docs] of Object.entries(collections)) {
        if (!Array.isArray(docs) || docs.length === 0) {
            importedCounts[collectionName] = 0;
            continue;
        }

        const col = db.collection(collectionName);

        if (mode === "replace") {
            try {
                await col.deleteMany({});
            } catch (err) {
                console.warn(`Could not clear collection ${collectionName}:`, err);
            }
        }

        // Format docs (converting string _id to ObjectId if valid)
        const formattedDocs = docs.map((doc) => {
            const { ...raw } = doc;
            if (raw._id && typeof raw._id === "string" && ObjectId.isValid(raw._id)) {
                raw._id = new ObjectId(raw._id);
            }
            if (raw.category && typeof raw.category === "string" && ObjectId.isValid(raw.category)) {
                raw.category = new ObjectId(raw.category);
            }
            if (raw.parentId && typeof raw.parentId === "string" && ObjectId.isValid(raw.parentId)) {
                raw.parentId = new ObjectId(raw.parentId);
            }
            if (raw.postId && typeof raw.postId === "string" && ObjectId.isValid(raw.postId)) {
                raw.postId = new ObjectId(raw.postId);
            }
            return raw;
        });

        const result = await col.insertMany(formattedDocs);
        importedCounts[collectionName] = result.insertedCount;
    }

    return { success: true, importedCounts };
}

