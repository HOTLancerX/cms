import { NextRequest, NextResponse } from 'next/server'
import { getLibrariesCollection, initializeLibrariesCollection } from '@/models/Library'
import { serializeDocs, serializeDoc } from '@/lib/mongodb'

export async function GET() {
    try {
        console.log("=== GET /api/library requested ===");
        await initializeLibrariesCollection();
        const collection = await getLibrariesCollection();

        const libraries = await collection
            .find({ status: 'active' })
            .sort({ createdAt: -1 })
            .toArray();

        console.log("=== GET /api/library returned:", libraries.length, "items ===");
        const serializedLibraries = serializeDocs(libraries);

        return NextResponse.json(serializedLibraries || [])
    } catch (error) {
        console.error('Server error GET /api/library:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        await initializeLibrariesCollection();
        const collection = await getLibrariesCollection();
        const body = await request.json()
        const { name, url, type = 'url' } = body

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 })
        }

        // Extract name from URL if not provided
        const imageName = name || extractNameFromUrl(url)

        const newLibrary = {
            name: imageName,
            url,
            type: type as 'cloudinary' | 'cloudflare' | 'url',
            status: 'active' as const,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await collection.insertOne(newLibrary);
        const library = await collection.findOne({ _id: result.insertedId });

        if (!library) {
            return NextResponse.json({ error: 'Failed to create library entry' }, { status: 500 })
        }

        const serializedLibrary = serializeDoc(library);

        return NextResponse.json(serializedLibrary, { status: 201 })
    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

function extractNameFromUrl(url: string): string {
    try {
        const urlObj = new URL(url)
        const pathname = urlObj.pathname
        const filename = pathname.split('/').pop() || 'image'
        return filename.split('.')[0] || 'image'
    } catch {
        return 'image'
    }
}
