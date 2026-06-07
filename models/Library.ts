import { ObjectId, Collection } from 'mongodb';
import { getCollection } from '@/lib/mongodb';

export interface Library {
    _id?: ObjectId;
    id?: string; // For backward compatibility
    name: string; // Will automatically collect names from image url
    url: string;
    status: 'active' | 'inactive';
    type: 'cloudinary' | 'cloudflare' | 'url';
    createdAt: Date;
    updatedAt: Date;
}

export interface LibraryCreateInput {
    name?: string;
    url: string;
    type: 'cloudinary' | 'cloudflare' | 'url';
    status?: 'active' | 'inactive';
}

// Collection name
export const COLLECTION_NAME = 'libraries';

// Get libraries collection with proper typing
export async function getLibrariesCollection(): Promise<Collection<Library>> {
    return getCollection<Library>(COLLECTION_NAME);
}

// Initialize collection and create indexes
let indexesCreated = false;
export async function initializeLibrariesCollection() {
    if (indexesCreated) return;

    try {
        const collection = await getLibrariesCollection();

        // Check if collection exists by trying to get indexes
        let existingIndexes;
        try {
            existingIndexes = await collection.indexes();
        } catch (error: any) {
            if (error.code === 26 || error.codeName === 'NamespaceNotFound') {
                indexesCreated = true;
                return;
            }
            throw error;
        }

        const indexNames = existingIndexes.map(idx => idx.name);

        // Only create indexes if they don't exist
        if (!indexNames.includes('status_1')) {
            await collection.createIndex({ status: 1 });
            await collection.createIndex({ type: 1 });
            await collection.createIndex({ createdAt: -1 });
            await collection.createIndex({ url: 1 });
        }

        indexesCreated = true;
    } catch (error) {
        console.error('Error creating libraries indexes:', error);
    }
}
