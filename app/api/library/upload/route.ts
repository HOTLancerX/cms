import { NextRequest, NextResponse } from 'next/server'
import { getLibrariesCollection, initializeLibrariesCollection } from '@/models/Library'

export async function POST(request: NextRequest) {
    try {
        await initializeLibrariesCollection();
        const body = await request.json()
        const { urls, type = 'url', files } = body

        if (files && files.length > 0) {
            // Handle file uploads (convert to WebP)
            return await handleFileUploads(files, type)
        } else if (urls && Array.isArray(urls) && urls.length > 0) {
            // Handle URL uploads
            return await handleUrlUploads(urls, type)
        } else {
            return NextResponse.json({ error: 'URLs array or files array is required' }, { status: 400 })
        }
    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

async function handleFileUploads(files: any[], type: string) {
    const collection = await getLibrariesCollection();
    const results: any[] = []

    for (const file of files) {
        try {
            // In production, you would convert to WebP and upload to storage
            // For now, we'll just process the filename
            const imageName = extractNameFromFilename(file.name)

            const newLibrary = {
                name: imageName,
                url: file.url || file.data, // Placeholder - in production this would be the uploaded file URL
                type: type as 'cloudinary' | 'cloudflare' | 'url',
                status: 'active' as const,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await collection.insertOne(newLibrary);
            const library = await collection.findOne({ _id: result.insertedId });

            if (library) {
                results.push({
                    ...library,
                    id: library._id.toString()
                });
            }
        } catch (error) {
            console.error('Error processing file:', file.name, error)
        }
    }

    if (results.length === 0) {
        return NextResponse.json({ message: 'No files could be processed' }, { status: 400 })
    }

    return NextResponse.json({
        message: `Added ${results.length} images to library`,
        libraries: results
    }, { status: 201 })
}

async function handleUrlUploads(urls: string[], type: string) {
    const collection = await getLibrariesCollection();
    const results: any[] = []

    for (const url of urls) {
        if (!url.trim()) continue

        const imageName = extractNameFromUrl(url.trim())

        // Check if URL already exists
        const existing = await collection.findOne({ url: url.trim() });

        if (!existing) {
            const newLibrary = {
                name: imageName,
                url: url.trim(),
                type: type as 'cloudinary' | 'cloudflare' | 'url',
                status: 'active' as const,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await collection.insertOne(newLibrary);
            const library = await collection.findOne({ _id: result.insertedId });

            if (library) {
                results.push({
                    ...library,
                    id: library._id.toString()
                });
            }
        }
    }

    if (results.length === 0) {
        return NextResponse.json({ message: 'No new URLs to add' }, { status: 200 })
    }

    return NextResponse.json({
        message: `Added ${results.length} images to library`,
        libraries: results
    }, { status: 201 })
}

function extractNameFromUrl(url: string): string {
    try {
        const urlObj = new URL(url)
        const pathname = urlObj.pathname
        const filename = pathname.split('/').pop() || 'image'
        const nameWithoutExt = filename.split('.')[0] || 'image'

        // Clean up the name
        return nameWithoutExt
            .replace(/[_-]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .trim()
    } catch {
        return 'Image'
    }
}

function extractNameFromFilename(filename: string): string {
    const nameWithoutExt = filename.split('.')[0] || 'image'
    return nameWithoutExt
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .trim()
}
