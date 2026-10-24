import { v2 as cloudinary } from 'cloudinary'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'
import { getMediaConfig, type MediaConfig } from '@/lib/mediaConfig'

// Helper to configure Cloudinary dynamically using DB settings or .env fallback
export function getCloudinaryClient(config: MediaConfig) {
    cloudinary.config({
        cloud_name: config.cloudinaryCloudName,
        api_key: config.cloudinaryApiKey,
        api_secret: config.cloudinaryApiSecret,
    });
    return cloudinary;
}

// Helper to instantiate Cloudflare R2 S3Client dynamically using DB settings or .env fallback
export function getR2Client(config: MediaConfig) {
    return new S3Client({
        region: 'auto',
        endpoint: config.r2Endpoint,
        credentials: {
            accessKeyId: config.r2AccessKeyId || '',
            secretAccessKey: config.r2SecretAccessKey || '',
        },
    });
}

export interface UploadResult {
    url: string
    publicId?: string
    width?: number
    height?: number
    format: string
    size: number
}

export async function convertToWebP(buffer: Buffer, quality: number = 80): Promise<Buffer> {
    return await sharp(buffer, { animated: true })
        .webp({ quality })
        .toBuffer()
}

export const isVideoFilename = (filename: string): boolean => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi'].includes(ext || '');
};

export async function uploadToLocal(
    buffer: Buffer,
    filename: string,
    folder: string = 'uploads'
): Promise<UploadResult> {
    try {
        const timestamp = Date.now();
        const cleanFilename = filename.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');
        const isVideo = isVideoFilename(filename);
        const ext = isVideo ? (filename.split('.').pop()?.toLowerCase() || 'mp4') : 'webp';

        let finalBuffer = buffer;
        if (!isVideo) {
            try {
                finalBuffer = await convertToWebP(buffer);
            } catch {
                finalBuffer = buffer;
            }
        }

        const targetDir = path.join(process.cwd(), 'public', folder);
        await fs.mkdir(targetDir, { recursive: true });

        const saveName = `${timestamp}_${cleanFilename}.${ext}`;
        const filePath = path.join(targetDir, saveName);
        await fs.writeFile(filePath, finalBuffer);

        const publicUrl = `/${folder}/${saveName}`;

        let width = undefined;
        let height = undefined;
        if (!isVideo) {
            try {
                const metadata = await sharp(finalBuffer, { animated: true }).metadata();
                width = metadata.width;
                height = metadata.height;
            } catch { /* silent */ }
        }

        return {
            url: publicUrl,
            publicId: `${folder}/${saveName}`,
            width,
            height,
            format: ext,
            size: finalBuffer.length
        };
    } catch (error) {
        console.error('Local upload error:', error);
        throw new Error('Failed to save file locally');
    }
}

export async function uploadToCloudinary(
    buffer: Buffer,
    filename: string,
    folder: string = 'library',
    providedConfig?: MediaConfig
): Promise<UploadResult> {
    try {
        const config = providedConfig || await getMediaConfig();

        if (!config.cloudinaryCloudName || !config.cloudinaryApiKey) {
            throw new Error('Cloudinary credentials missing (not configured in settings or .env)');
        }

        getCloudinaryClient(config);

        const isVideo = isVideoFilename(filename);
        let finalBuffer = buffer;
        let options: any = {
            folder,
            public_id: `${folder}/${Date.now()}_${filename.split('.')[0]}`,
            timeout: 30000 // 30 seconds timeout
        };

        if (isVideo) {
            options.resource_type = 'video';
        } else {
            if (config.autoWebp) {
                finalBuffer = await convertToWebP(buffer, config.webpQuality);
                options.format = 'webp';
            }
            options.resource_type = 'image';
            options.transformation = [
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ];
        }

        const result = await Promise.race([
            new Promise<any>((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    options,
                    (error, res) => {
                        if (error) reject(error);
                        else resolve(res);
                    }
                ).end(finalBuffer);
            }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000)
            )
        ]);

        return {
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            size: result.bytes
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error(`Failed to upload to Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function uploadToCloudflareR2(
    buffer: Buffer,
    filename: string,
    folder: string = 'library',
    providedConfig?: MediaConfig
): Promise<UploadResult> {
    try {
        const config = providedConfig || await getMediaConfig();

        if (!config.r2Bucket || !config.r2Endpoint) {
            throw new Error('Cloudflare R2 credentials missing (not configured in settings or .env)');
        }

        const r2Client = getR2Client(config);
        const isVideo = isVideoFilename(filename);
        const timestamp = Date.now();
        const cleanFilename = filename.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');
        
        let finalBuffer = buffer;
        let key = '';
        let contentType = '';
        let format = '';
        let width = undefined;
        let height = undefined;

        if (isVideo) {
            const ext = filename.split('.').pop()?.toLowerCase() || 'mp4';
            key = `${folder}/${timestamp}_${cleanFilename}.${ext}`;
            contentType = `video/${ext === 'mov' ? 'quicktime' : ext}`;
            format = ext;
        } else {
            if (config.autoWebp) {
                finalBuffer = await convertToWebP(buffer, config.webpQuality);
                key = `${folder}/${timestamp}_${cleanFilename}.webp`;
                contentType = 'image/webp';
                format = 'webp';
            } else {
                const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
                key = `${folder}/${timestamp}_${cleanFilename}.${ext}`;
                contentType = `image/${ext === 'svg' ? 'svg+xml' : ext}`;
                format = ext;
            }
            
            try {
                const metadata = await sharp(finalBuffer, { animated: true }).metadata();
                width = metadata.width;
                height = metadata.height;
            } catch (err) {
                console.error('Sharp metadata error:', err);
            }
        }

        const command = new PutObjectCommand({
            Bucket: config.r2Bucket,
            Key: key,
            Body: finalBuffer,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000',
        });

        await r2Client.send(command);

        const cdnBase = config.imageCdn || 'https://pub-r2.r2.dev';
        const publicUrl = `${cdnBase.replace(/\/+$/, '')}/${key}`;

        return {
            url: publicUrl,
            publicId: key,
            width,
            height,
            format,
            size: finalBuffer.length
        };
    } catch (error) {
        console.error('Cloudflare R2 upload error:', error);
        throw new Error(`Failed to upload to Cloudflare R2: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function deleteFromCloudinary(publicId: string, providedConfig?: MediaConfig): Promise<void> {
    try {
        const config = providedConfig || await getMediaConfig();
        getCloudinaryClient(config);
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        throw new Error('Failed to delete from Cloudinary');
    }
}

export async function deleteFromCloudflareR2(key: string, providedConfig?: MediaConfig): Promise<void> {
    try {
        const config = providedConfig || await getMediaConfig();
        const r2Client = getR2Client(config);
        const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
        const command = new DeleteObjectCommand({
            Bucket: config.r2Bucket,
            Key: key,
        });
        await r2Client.send(command);
    } catch (error) {
        console.error('Cloudflare R2 delete error:', error);
        throw new Error('Failed to delete from Cloudflare R2');
    }
}

export function extractNameFromFile(filename: string): string {
    const nameWithoutExt = filename.split('.')[0] || 'image';
    return nameWithoutExt
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .trim();
}