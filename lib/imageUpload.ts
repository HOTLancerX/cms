import { v2 as cloudinary } from 'cloudinary'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Configure Cloudflare R2
const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
})

export interface UploadResult {
    url: string
    publicId?: string
    width?: number
    height?: number
    format: string
    size: number
}

export async function convertToWebP(buffer: Buffer, quality: number = 80): Promise<Buffer> {
    return await sharp(buffer)
        .webp({ quality })
        .toBuffer()
}

export async function uploadToCloudinary(
    buffer: Buffer,
    filename: string,
    folder: string = 'library'
): Promise<UploadResult> {
    try {
        // Convert to WebP
        const webpBuffer = await convertToWebP(buffer)

        // Upload to Cloudinary with timeout
        const result = await Promise.race([
            new Promise<any>((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'image',
                        folder,
                        public_id: `${folder}/${Date.now()}_${filename.split('.')[0]}`,
                        format: 'webp',
                        transformation: [
                            { quality: 'auto:good' },
                            { fetch_format: 'auto' }
                        ],
                        timeout: 30000 // 30 seconds timeout
                    },
                    (error, result) => {
                        if (error) reject(error)
                        else resolve(result)
                    }
                ).end(webpBuffer)
            }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000)
            )
        ])

        return {
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            size: result.bytes
        }
    } catch (error) {
        console.error('Cloudinary upload error:', error)
        throw new Error(`Failed to upload to Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}

export async function uploadToCloudflareR2(
    buffer: Buffer,
    filename: string,
    folder: string = 'library'
): Promise<UploadResult> {
    try {
        // Convert to WebP
        const webpBuffer = await convertToWebP(buffer)

        // Generate unique filename
        const timestamp = Date.now()
        const cleanFilename = filename.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_')
        const key = `${folder}/${timestamp}_${cleanFilename}.webp`

        // Upload to Cloudflare R2
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET!,
            Key: key,
            Body: webpBuffer,
            ContentType: 'image/webp',
            CacheControl: 'public, max-age=31536000', // 1 year cache
        })

        await r2Client.send(command)

        // Get image metadata
        const metadata = await sharp(webpBuffer).metadata()

        const publicUrl = `${process.env.NEXT_PUBLIC_IMAGE_CDN}/${key}`

        return {
            url: publicUrl,
            publicId: key,
            width: metadata.width,
            height: metadata.height,
            format: 'webp',
            size: webpBuffer.length
        }
    } catch (error) {
        console.error('Cloudflare R2 upload error:', error)
        throw new Error('Failed to upload to Cloudflare R2')
    }
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
    try {
        await cloudinary.uploader.destroy(publicId)
    } catch (error) {
        console.error('Cloudinary delete error:', error)
        throw new Error('Failed to delete from Cloudinary')
    }
}

export async function deleteFromCloudflareR2(key: string): Promise<void> {
    try {
        const { DeleteObjectCommand } = await import('@aws-sdk/client-s3')
        const command = new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET!,
            Key: key,
        })
        await r2Client.send(command)
    } catch (error) {
        console.error('Cloudflare R2 delete error:', error)
        throw new Error('Failed to delete from Cloudflare R2')
    }
}

export function extractNameFromFile(filename: string): string {
    const nameWithoutExt = filename.split('.')[0] || 'image'
    return nameWithoutExt
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .trim()
}