import { Settings } from "@/lib/settings";

export interface MediaConfig {
    /** Default or preferred upload provider */
    provider: "auto" | "cloudflare" | "cloudinary" | "local";

    /** Cloudinary credentials */
    cloudinaryCloudName: string;
    cloudinaryApiKey: string;
    cloudinaryApiSecret: string;
    isCloudinaryConfigured: boolean;
    cloudinarySource: "database" | "env" | "none";

    /** Cloudflare R2 credentials */
    r2AccessKeyId: string;
    r2SecretAccessKey: string;
    r2Endpoint: string;
    r2Bucket: string;
    imageCdn: string;
    isR2Configured: boolean;
    r2Source: "database" | "env" | "none";

    /** Image processing and upload rules */
    maxFileSize: number; // in bytes
    allowedImageTypes: string[];
    autoWebp: boolean;
    webpQuality: number;
}

/**
 * Resolves media storage configuration.
 *
 * Hierarchy:
 * 1. Database Setting (Configured via Admin Media Settings)
 * 2. Environment Variables (.env.local / process.env)
 * 3. Safe system defaults
 */
export async function getMediaConfig(): Promise<MediaConfig> {
    let settings: Record<string, any> = {};
    try {
        settings = await Settings();
    } catch (err) {
        console.warn("Could not read settings for media config, falling back to process.env:", err);
    }

    // Cloudinary values
    const dbCloudName = settings.cloudinary_cloud_name?.trim();
    const dbApiKey = settings.cloudinary_api_key?.trim();
    const dbApiSecret = settings.cloudinary_api_secret?.trim();

    const envCloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() || "";
    const envApiKey = process.env.CLOUDINARY_API_KEY?.trim() || "";
    const envApiSecret = process.env.CLOUDINARY_API_SECRET?.trim() || "";

    const cloudinaryCloudName = dbCloudName || envCloudName;
    const cloudinaryApiKey = dbApiKey || envApiKey;
    const cloudinaryApiSecret = dbApiSecret || envApiSecret;

    const isCloudinaryConfigured = Boolean(cloudinaryCloudName && cloudinaryApiKey);
    const cloudinarySource = (dbCloudName && dbApiKey)
        ? "database"
        : (envCloudName && envApiKey ? "env" : "none");

    // Cloudflare R2 values
    const dbR2AccessKey = settings.r2_access_key_id?.trim();
    const dbR2SecretKey = settings.r2_secret_access_key?.trim();
    const dbR2Endpoint = settings.r2_endpoint?.trim();
    const dbR2Bucket = settings.r2_bucket?.trim();
    const dbImageCdn = (settings.image_cdn || settings.next_public_image_cdn)?.trim();

    const envR2AccessKey = process.env.R2_ACCESS_KEY_ID?.trim() || "";
    const envR2SecretKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || "";
    const envR2Endpoint = process.env.R2_ENDPOINT?.trim() || "";
    const envR2Bucket = process.env.R2_BUCKET?.trim() || "";
    const envImageCdn = process.env.NEXT_PUBLIC_IMAGE_CDN?.trim() || "";

    const r2AccessKeyId = dbR2AccessKey || envR2AccessKey;
    const r2SecretAccessKey = dbR2SecretKey || envR2SecretKey;
    const r2Endpoint = dbR2Endpoint || envR2Endpoint;
    const r2Bucket = dbR2Bucket || envR2Bucket;
    const imageCdn = (dbImageCdn || envImageCdn || "https://pub-r2.r2.dev").replace(/\/+$/, "");

    const isR2Configured = Boolean(r2Bucket && r2Endpoint && r2AccessKeyId && r2SecretAccessKey);
    const r2Source = (dbR2Bucket && dbR2Endpoint)
        ? "database"
        : (envR2Bucket && envR2Endpoint ? "env" : "none");

    // Upload & format limits
    const rawMaxSize = settings.media_max_file_size || settings.next_public_max_file_size || process.env.NEXT_PUBLIC_MAX_FILE_SIZE;
    const maxFileSize = parseInt(String(rawMaxSize || "10485760"), 10) || 10485760;

    const rawAllowedTypes = settings.media_allowed_image_types || settings.next_public_allowed_image_types || process.env.NEXT_PUBLIC_ALLOWED_IMAGE_TYPES || "image/jpeg,image/png,image/webp,image/gif,image/svg+xml";
    const allowedImageTypes = String(rawAllowedTypes)
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

    const provider = (settings.media_storage_provider || "auto") as MediaConfig["provider"];
    const autoWebp = settings.media_auto_webp !== "false" && settings.media_auto_webp !== false;
    const webpQuality = parseInt(String(settings.media_webp_quality || "80"), 10) || 80;

    return {
        provider,
        cloudinaryCloudName,
        cloudinaryApiKey,
        cloudinaryApiSecret,
        isCloudinaryConfigured,
        cloudinarySource,
        r2AccessKeyId,
        r2SecretAccessKey,
        r2Endpoint,
        r2Bucket,
        imageCdn,
        isR2Configured,
        r2Source,
        maxFileSize,
        allowedImageTypes,
        autoWebp,
        webpQuality,
    };
}
