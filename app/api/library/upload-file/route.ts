import { NextRequest, NextResponse } from 'next/server'
import { getLibrariesCollection, initializeLibrariesCollection } from '@/models/Library'
import { uploadToCloudinary, uploadToCloudflareR2, uploadToLocal, extractNameFromFile } from '@/lib/imageUpload'
import { getMediaConfig, type MediaConfig } from '@/lib/mediaConfig'

export async function POST(request: NextRequest) {
    try {
        await initializeLibrariesCollection();
        const collection = await getLibrariesCollection();
        const config = await getMediaConfig();
        const formData = await request.formData();
        const files = formData.getAll('files') as File[];
        const requestedType = (formData.get('type') as string) || 'auto';

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'No files provided' }, { status: 400 });
        }

        const results = [];
        const errors = [];

        for (const file of files) {
            try {
                // Validate file with dynamic config (max size & allowed types)
                const validation = validateFile(file, config);
                if (!validation.valid) {
                    errors.push({ filename: file.name, error: validation.error });
                    continue;
                }

                // Convert file to buffer
                const buffer = Buffer.from(await file.arrayBuffer());

                let uploadResult;
                let finalUploadType: 'cloudinary' | 'cloudflare' | 'url' = 'url';

                // Determine provider precedence based on requestedType and config.provider
                const preferred = requestedType !== 'auto' ? requestedType : config.provider;

                if (preferred === 'cloudflare' && config.isR2Configured) {
                    try {
                        uploadResult = await uploadToCloudflareR2(buffer, file.name, 'library', config);
                        finalUploadType = 'cloudflare';
                    } catch (err) {
                        console.warn(`Cloudflare R2 preferred upload failed for ${file.name}:`, err);
                    }
                } else if (preferred === 'cloudinary' && config.isCloudinaryConfigured) {
                    try {
                        uploadResult = await uploadToCloudinary(buffer, file.name, 'library', config);
                        finalUploadType = 'cloudinary';
                    } catch (err) {
                        console.warn(`Cloudinary preferred upload failed for ${file.name}:`, err);
                    }
                } else if (preferred === 'local') {
                    try {
                        uploadResult = await uploadToLocal(buffer, file.name);
                        finalUploadType = 'url';
                    } catch (err) {
                        console.warn(`Local preferred upload failed for ${file.name}:`, err);
                    }
                }

                // Fallback cascade: R2 -> Cloudinary -> Local (if not uploaded yet)
                if (!uploadResult && config.isR2Configured) {
                    try {
                        uploadResult = await uploadToCloudflareR2(buffer, file.name, 'library', config);
                        finalUploadType = 'cloudflare';
                    } catch (err) {
                        console.warn(`Cascade R2 upload failed for ${file.name}:`, err);
                    }
                }

                if (!uploadResult && config.isCloudinaryConfigured) {
                    try {
                        uploadResult = await uploadToCloudinary(buffer, file.name, 'library', config);
                        finalUploadType = 'cloudinary';
                    } catch (err) {
                        console.warn(`Cascade Cloudinary upload failed for ${file.name}:`, err);
                    }
                }

                // Final fallback to Local upload
                if (!uploadResult) {
                    try {
                        uploadResult = await uploadToLocal(buffer, file.name);
                        finalUploadType = 'url';
                    } catch (err) {
                        console.error(`Local upload fallback failed for ${file.name}:`, err);
                        errors.push({
                            filename: file.name,
                            error: `Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`
                        });
                        continue;
                    }
                }

                // Save to database
                const imageName = extractNameFromFile(file.name);

                const newLibrary = {
                    name: imageName,
                    url: uploadResult.url,
                    type: finalUploadType,
                    status: 'active' as const,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                const result = await collection.insertOne(newLibrary);
                const library = await collection.findOne({ _id: result.insertedId });

                if (!library) {
                    console.error('Failed to save to database');
                    errors.push({ filename: file.name, error: 'Failed to save to database' });
                    continue;
                }

                results.push({
                    filename: file.name,
                    library: {
                        ...library,
                        id: library._id.toString()
                    },
                    uploadResult,
                    uploadType: finalUploadType
                });

            } catch (error) {
                console.error(`Error processing file ${file.name}:`, error);
                errors.push({
                    filename: file.name,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        const response: any = {
            message: `Processed ${files.length} files`,
            successful: results.length,
            failed: errors.length,
            results
        };

        if (errors.length > 0) {
            response.errors = errors;
        }

        const statusCode = results.length > 0 ? 201 : 400;
        return NextResponse.json(response, { status: statusCode });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

function validateFile(file: File, config: MediaConfig): { valid: boolean; error?: string } {
    if (file.size === 0) {
        return {
            valid: false,
            error: 'File is empty'
        };
    }

    if (file.size > config.maxFileSize) {
        const mb = (config.maxFileSize / (1024 * 1024)).toFixed(1).replace('.0', '');
        return {
            valid: false,
            error: `File size exceeds the configured limit of ${mb}MB (${config.maxFileSize} bytes)`
        };
    }

    const isVideo = file.type.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi'].some(ext => file.name.toLowerCase().endsWith(`.${ext}`));
    const isImage = file.type.startsWith('image/');

    if (!isImage && !isVideo) {
        return {
            valid: false,
            error: `File type "${file.type || 'unknown'}" is not supported. Please upload an image or video file.`
        };
    }

    if (isImage && config.allowedImageTypes && config.allowedImageTypes.length > 0) {
        const fileTypeLower = (file.type || '').toLowerCase();
        const isAllowed = config.allowedImageTypes.some(type => {
            const clean = type.trim().toLowerCase();
            return clean === fileTypeLower || clean === '*' || clean === 'image/*';
        });

        if (!isAllowed) {
            return {
                valid: false,
                error: `Image type "${file.type}" is not in the allowed list: ${config.allowedImageTypes.join(', ')}`
            };
        }
    }

    return { valid: true };
}
