import { NextRequest, NextResponse } from 'next/server'
import { getLibrariesCollection, initializeLibrariesCollection } from '@/models/Library'
import { uploadToCloudinary, uploadToCloudflareR2, uploadToLocal, extractNameFromFile } from '@/lib/imageUpload'

const MAX_FILE_SIZE = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760') // 10MB

export async function POST(request: NextRequest) {
    try {
        await initializeLibrariesCollection();
        const collection = await getLibrariesCollection();
        const formData = await request.formData()
        const files = formData.getAll('files') as File[]
        const requestedType = (formData.get('type') as string) || 'cloudinary'

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

                // Upload based on type with cascade fallbacks
                let uploadResult
                let finalUploadType = requestedType

                // 1. Try Cloudinary if requested or if Cloudinary is configured
                if (requestedType === 'cloudinary' || process.env.CLOUDINARY_CLOUD_NAME) {
                    try {
                        uploadResult = await uploadToCloudinary(buffer, file.name)
                        finalUploadType = 'cloudinary'
                    } catch (err) {
                        console.warn(`Cloudinary upload failed for ${file.name}:`, err)
                    }
                }

                // 2. Try Cloudflare R2 if not yet uploaded and R2 is configured
                if (!uploadResult && process.env.R2_BUCKET) {
                    try {
                        uploadResult = await uploadToCloudflareR2(buffer, file.name)
                        finalUploadType = 'cloudflare'
                    } catch (err) {
                        console.warn(`Cloudflare R2 upload failed for ${file.name}:`, err)
                    }
                }

                // 3. Fallback to Local upload if cloud providers failed/unconfigured
                if (!uploadResult) {
                    try {
                        uploadResult = await uploadToLocal(buffer, file.name)
                        finalUploadType = 'url'
                    } catch (err) {
                        console.error(`Local upload failed for ${file.name}:`, err)
                        errors.push({
                            filename: file.name,
                            error: `Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`
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
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File size exceeds ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB limit`
        }
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
        return {
            valid: false,
            error: `File type ${file.type} not allowed. Please upload an image or video file.`
        }
    }

    if (file.size === 0) {
        return {
            valid: false,
            error: 'File is empty'
        }
    }

    return { valid: true }
}
