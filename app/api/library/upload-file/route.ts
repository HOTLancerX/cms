import { NextRequest, NextResponse } from 'next/server'
import { getLibrariesCollection, initializeLibrariesCollection } from '@/models/Library'
import { uploadToCloudinary, uploadToCloudflareR2, extractNameFromFile } from '@/lib/imageUpload'

const MAX_FILE_SIZE = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760') // 10MB
const ALLOWED_TYPES = (process.env.NEXT_PUBLIC_ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp,image/gif').split(',')

export async function POST(request: NextRequest) {
    try {
        await initializeLibrariesCollection();
        const collection = await getLibrariesCollection();
        const formData = await request.formData()
        const files = formData.getAll('files') as File[]
        const uploadType = formData.get('type') as string || 'cloudflare' // Default to Cloudflare R2

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'No files provided' }, { status: 400 })
        }

        const results = []
        const errors = []

        for (const file of files) {
            try {
                // Validate file
                const validation = validateFile(file)
                if (!validation.valid) {
                    errors.push({ filename: file.name, error: validation.error })
                    continue
                }

                // Convert file to buffer
                const buffer = Buffer.from(await file.arrayBuffer())

                // Upload based on type with fallback
                let uploadResult
                let finalUploadType = uploadType
                try {
                    if (uploadType === 'cloudinary') {
                        uploadResult = await uploadToCloudinary(buffer, file.name)
                    } else {
                        uploadResult = await uploadToCloudflareR2(buffer, file.name)
                    }
                } catch (uploadError) {
                    console.error(`${uploadType} upload failed for ${file.name}:`, uploadError)

                    // Fallback: if Cloudinary fails, try Cloudflare R2
                    if (uploadType === 'cloudinary') {
                        try {
                            uploadResult = await uploadToCloudflareR2(buffer, file.name)
                            finalUploadType = 'cloudflare' // Update type for database
                        } catch (fallbackError) {
                            console.error(`Fallback upload also failed for ${file.name}:`, fallbackError)
                            errors.push({
                                filename: file.name,
                                error: `Upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`
                            })
                            continue
                        }
                    } else {
                        errors.push({
                            filename: file.name,
                            error: `Upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`
                        })
                        continue
                    }
                }

                // Save to database
                const imageName = extractNameFromFile(file.name)

                const newLibrary = {
                    name: imageName,
                    url: uploadResult.url,
                    type: finalUploadType as 'cloudinary' | 'cloudflare' | 'url',
                    status: 'active' as const,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                const result = await collection.insertOne(newLibrary);
                const library = await collection.findOne({ _id: result.insertedId });

                if (!library) {
                    console.error('Failed to save to database')
                    errors.push({ filename: file.name, error: 'Failed to save to database' })
                    continue
                }

                results.push({
                    filename: file.name,
                    library: {
                        ...library,
                        id: library._id.toString()
                    },
                    uploadResult,
                    uploadType: finalUploadType
                })

            } catch (error) {
                console.error(`Error processing file ${file.name}:`, error)
                errors.push({
                    filename: file.name,
                    error: error instanceof Error ? error.message : 'Unknown error'
                })
            }
        }

        const response: any = {
            message: `Processed ${files.length} files`,
            successful: results.length,
            failed: errors.length,
            results
        }

        if (errors.length > 0) {
            response.errors = errors
        }

        const statusCode = results.length > 0 ? 201 : 400
        return NextResponse.json(response, { status: statusCode })

    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

function validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File size exceeds ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB limit`
        }
    }

    // Check file type (allow all images and videos)
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
        return {
            valid: false,
            error: `File type ${file.type} not allowed. Please upload an image or video file.`
        }
    }

    // Check if file has content
    if (file.size === 0) {
        return {
            valid: false,
            error: 'File is empty'
        }
    }

    return { valid: true }
}
