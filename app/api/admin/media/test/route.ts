import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { S3Client, ListObjectsV2Command, HeadBucketCommand } from "@aws-sdk/client-s3";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { provider, credentials } = body;

        if (provider === "cloudinary") {
            const { cloudName, apiKey, apiSecret } = credentials || {};
            if (!cloudName || !apiKey) {
                return NextResponse.json({
                    success: false,
                    error: "Cloud Name and API Key are required to test Cloudinary."
                }, { status: 400 });
            }

            cloudinary.config({
                cloud_name: cloudName,
                api_key: apiKey,
                api_secret: apiSecret || "",
            });

            try {
                const res = await cloudinary.api.ping();
                return NextResponse.json({
                    success: true,
                    message: "Cloudinary connection successful! Ping response: " + JSON.stringify(res),
                });
            } catch (err: any) {
                return NextResponse.json({
                    success: false,
                    error: err?.message || "Failed to connect to Cloudinary. Please check your credentials.",
                }, { status: 400 });
            }
        }

        if (provider === "cloudflare") {
            const { endpoint, bucket, accessKeyId, secretAccessKey } = credentials || {};
            if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
                return NextResponse.json({
                    success: false,
                    error: "Endpoint, Bucket, Access Key ID, and Secret Access Key are required for Cloudflare R2."
                }, { status: 400 });
            }

            const client = new S3Client({
                region: "auto",
                endpoint,
                credentials: {
                    accessKeyId,
                    secretAccessKey,
                },
            });

            try {
                // Check if bucket exists and is accessible
                await client.send(new HeadBucketCommand({ Bucket: bucket }));
                return NextResponse.json({
                    success: true,
                    message: `Cloudflare R2 connection successful! Bucket "${bucket}" is accessible.`,
                });
            } catch (err: any) {
                // If HeadBucket failed, try ListObjects with maxKeys 1
                try {
                    await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
                    return NextResponse.json({
                        success: true,
                        message: `Cloudflare R2 connection successful! Bucket "${bucket}" is accessible.`,
                    });
                } catch (fallbackErr: any) {
                    return NextResponse.json({
                        success: false,
                        error: fallbackErr?.message || err?.message || "Failed to connect to Cloudflare R2 bucket.",
                    }, { status: 400 });
                }
            }
        }

        return NextResponse.json({ error: "Invalid provider specified" }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error?.message || "Internal server error while testing connection",
        }, { status: 500 });
    }
}
