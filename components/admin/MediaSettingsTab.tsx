"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { xFetch } from "@/lib/express";

interface MediaSettingsTabProps {
    activePlugins: string[];
    initialValues: Record<string, any>;
    onSaved?: () => void;
}

export default function MediaSettingsTab({
    initialValues,
    onSaved,
}: MediaSettingsTabProps) {
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    // Form values
    const [provider, setProvider] = useState<string>(initialValues.media_storage_provider || "auto");
    
    // Cloudflare R2
    const [r2Endpoint, setR2Endpoint] = useState<string>(initialValues.r2_endpoint || "");
    const [r2Bucket, setR2Bucket] = useState<string>(initialValues.r2_bucket || "");
    const [r2AccessKey, setR2AccessKey] = useState<string>(initialValues.r2_access_key_id || "");
    const [r2SecretKey, setR2SecretKey] = useState<string>(initialValues.r2_secret_access_key || "");
    const [imageCdn, setImageCdn] = useState<string>(initialValues.next_public_image_cdn || initialValues.image_cdn || "");
    const [showR2Secret, setShowR2Secret] = useState(false);

    // Cloudinary
    const [cloudinaryCloudName, setCloudinaryCloudName] = useState<string>(initialValues.cloudinary_cloud_name || "");
    const [cloudinaryApiKey, setCloudinaryApiKey] = useState<string>(initialValues.cloudinary_api_key || "");
    const [cloudinaryApiSecret, setCloudinaryApiSecret] = useState<string>(initialValues.cloudinary_api_secret || "");
    const [showCloudinarySecret, setShowCloudinarySecret] = useState(false);

    // Processing & limits
    const [maxFileSize, setMaxFileSize] = useState<string>(
        String(initialValues.media_max_file_size || initialValues.next_public_max_file_size || "10485760")
    );
    const [allowedTypes, setAllowedTypes] = useState<string>(
        initialValues.media_allowed_image_types ||
        initialValues.next_public_allowed_image_types ||
        "image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
    );
    const [autoWebp, setAutoWebp] = useState<boolean>(
        initialValues.media_auto_webp !== "false" && initialValues.media_auto_webp !== false
    );
    const [webpQuality, setWebpQuality] = useState<number>(
        parseInt(String(initialValues.media_webp_quality || "80"), 10) || 80
    );

    // Test connection states
    const [testingR2, setTestingR2] = useState(false);
    const [r2TestResult, setR2TestResult] = useState<{ ok: boolean; msg: string } | null>(null);

    const [testingCloudinary, setTestingCloudinary] = useState(false);
    const [cloudinaryTestResult, setCloudinaryTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

    const handleTestR2 = async () => {
        setTestingR2(true);
        setR2TestResult(null);
        try {
            const res = await fetch("/api/admin/media/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider: "cloudflare",
                    credentials: {
                        endpoint: r2Endpoint,
                        bucket: r2Bucket,
                        accessKeyId: r2AccessKey,
                        secretAccessKey: r2SecretKey,
                    },
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setR2TestResult({ ok: true, msg: data.message || "R2 Bucket verified successfully!" });
            } else {
                setR2TestResult({ ok: false, msg: data.error || "R2 verification failed." });
            }
        } catch (err: any) {
            setR2TestResult({ ok: false, msg: err?.message || "Network error while testing R2." });
        } finally {
            setTestingR2(false);
        }
    };

    const handleTestCloudinary = async () => {
        setTestingCloudinary(true);
        setCloudinaryTestResult(null);
        try {
            const res = await fetch("/api/admin/media/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider: "cloudinary",
                    credentials: {
                        cloudName: cloudinaryCloudName,
                        apiKey: cloudinaryApiKey,
                        apiSecret: cloudinaryApiSecret,
                    },
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setCloudinaryTestResult({ ok: true, msg: data.message || "Cloudinary credentials verified successfully!" });
            } else {
                setCloudinaryTestResult({ ok: false, msg: data.error || "Cloudinary verification failed." });
            }
        } catch (err: any) {
            setCloudinaryTestResult({ ok: false, msg: err?.message || "Network error while testing Cloudinary." });
        } finally {
            setTestingCloudinary(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        const payload: Record<string, any> = {
            ...initialValues,
            media_storage_provider: provider,

            // Cloudflare R2
            r2_endpoint: r2Endpoint.trim(),
            r2_bucket: r2Bucket.trim(),
            r2_access_key_id: r2AccessKey.trim(),
            r2_secret_access_key: r2SecretKey.trim(),
            next_public_image_cdn: imageCdn.trim(),
            image_cdn: imageCdn.trim(),

            // Cloudinary
            cloudinary_cloud_name: cloudinaryCloudName.trim(),
            cloudinary_api_key: cloudinaryApiKey.trim(),
            cloudinary_api_secret: cloudinaryApiSecret.trim(),

            // Processing
            media_max_file_size: maxFileSize.trim(),
            next_public_max_file_size: maxFileSize.trim(),
            media_allowed_image_types: allowedTypes.trim(),
            next_public_allowed_image_types: allowedTypes.trim(),
            media_auto_webp: autoWebp ? "true" : "false",
            media_webp_quality: String(webpQuality),
        };

        try {
            // Send to Express /settings
            let saved = false;
            try {
                const res = await xFetch("/settings", {
                    method: "PUT",
                    body: JSON.stringify(payload),
                });
                if (res.ok) saved = true;
            } catch {
                // Ignore Express network errors, will sync with local route
            }

            // Always sync directly with Next.js /api/settings as well
            const localRes = await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (localRes.ok || saved) {
                setMessage({ text: "Media & storage settings saved successfully!", type: "success" });
                try {
                    localStorage.setItem("cms_settings_updated", Date.now().toString());
                    window.dispatchEvent(new Event("cms_settings_updated"));
                } catch { }
                onSaved?.();
                setTimeout(() => setMessage(null), 4000);
            } else {
                setMessage({ text: "Failed to save settings. Please try again.", type: "error" });
            }
        } catch (err: any) {
            setMessage({ text: err?.message || "Network error while saving settings", type: "error" });
        } finally {
            setSaving(false);
        }
    };

    const maxFileSizeMB = (parseInt(maxFileSize || "0", 10) / (1024 * 1024)).toFixed(1).replace(".0", "");

    return (
        <form onSubmit={handleSave} className="space-y-8">
            {/* Status Feedback */}
            {message && (
                <div
                    className={`p-4 rounded-xl text-sm font-semibold border flex items-center gap-2.5 animate-in fade-in ${
                        message.type === "error"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                    }`}
                >
                    <Icon
                        icon={message.type === "error" ? "solar:danger-circle-bold" : "solar:check-circle-bold"}
                        width={20}
                        className="shrink-0"
                    />
                    <span>{message.text}</span>
                </div>
            )}

            {/* Architecture / Fallback Information Banner */}
            <div className="rounded-2xl border border-indigo-100 bg-linear-to-r from-indigo-50/70 via-white to-sky-50/60 p-5 shadow-xs">
                <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Icon icon="solar:shield-check-bold" width={20} />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                            Dynamic Configuration &amp; Fallback System
                        </h4>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            Credentials configured here in the Database take immediate precedence across the entire CMS.
                            If any field is left blank, the system automatically falls back to your local environment file (<code className="px-1.5 py-0.5 rounded bg-white text-indigo-700 font-mono text-[11px] border border-indigo-200">.env.local</code>).
                        </p>
                    </div>
                </div>
            </div>

            {/* Storage Strategy Section */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
                    <Icon icon="solar:server-square-bold" width={20} className="text-indigo-600" />
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">Default Upload Storage Strategy</h3>
                        <p className="text-xs text-gray-500">Choose where uploaded assets should be saved first</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                    {[
                        {
                            id: "auto",
                            label: "Automatic Cascade",
                            desc: "Tries Cloudflare R2 ➜ Cloudinary ➜ Local",
                            icon: "solar:layers-bold",
                        },
                        {
                            id: "cloudflare",
                            label: "Cloudflare R2",
                            desc: "Fast S3-compatible cloud storage",
                            icon: "simple-icons:cloudflare",
                        },
                        {
                            id: "cloudinary",
                            label: "Cloudinary",
                            desc: "Automated media optimizations & CDN",
                            icon: "simple-icons:cloudinary",
                        },
                        {
                            id: "local",
                            label: "Local Storage",
                            desc: "Saves files directly in /public/uploads",
                            icon: "solar:hard-drive-bold",
                        },
                    ].map((opt) => {
                        const isSelected = provider === opt.id;
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setProvider(opt.id)}
                                className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                                    isSelected
                                        ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs"
                                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <Icon
                                        icon={opt.icon}
                                        width={22}
                                        className={isSelected ? "text-indigo-600" : "text-gray-400"}
                                    />
                                    {isSelected && (
                                        <span className="w-2 h-2 rounded-full bg-indigo-600" />
                                    )}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-800">{opt.label}</div>
                                    <div className="text-[11px] text-gray-500 mt-0.5">{opt.desc}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Cloudflare R2 Storage Block */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                            <Icon icon="simple-icons:cloudflare" width={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Cloudflare R2 Object Storage</h3>
                            <p className="text-xs text-gray-500">Zero-egress fee S3-compatible cloud storage</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleTestR2}
                        disabled={testingR2}
                        className="px-3.5 py-1.5 rounded-lg border border-gray-300 hover:border-indigo-400 text-xs font-semibold text-gray-700 hover:text-indigo-600 bg-white transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                    >
                        {testingR2 ? (
                            <>
                                <Icon icon="svg-spinners:ring-resize" width={14} />
                                Testing R2...
                            </>
                        ) : (
                            <>
                                <Icon icon="solar:check-read-bold" width={14} className="text-amber-500" />
                                Test R2 Connection
                            </>
                        )}
                    </button>
                </div>

                {r2TestResult && (
                    <div
                        className={`p-3 rounded-xl text-xs font-semibold border flex items-center gap-2 ${
                            r2TestResult.ok
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-red-50 text-red-600 border-red-200"
                        }`}
                    >
                        <Icon icon={r2TestResult.ok ? "solar:check-circle-bold" : "solar:danger-triangle-bold"} width={16} />
                        <span>{r2TestResult.msg}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <Icon icon="solar:link-circle-bold" width={14} className="text-amber-500" />
                            R2 Endpoint URL
                        </label>
                        <input
                            type="text"
                            value={r2Endpoint}
                            onChange={(e) => setR2Endpoint(e.target.value)}
                            placeholder="https://<account_id>.r2.cloudflarestorage.com"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                        />
                        <p className="text-[11px] text-gray-400">Fallback: process.env.R2_ENDPOINT</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <Icon icon="solar:folder-bold" width={14} className="text-amber-500" />
                            R2 Bucket Name
                        </label>
                        <input
                            type="text"
                            value={r2Bucket}
                            onChange={(e) => setR2Bucket(e.target.value)}
                            placeholder="e.g. img or assets"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                        />
                        <p className="text-[11px] text-gray-400">Fallback: process.env.R2_BUCKET</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <Icon icon="solar:key-bold" width={14} className="text-amber-500" />
                            R2 Access Key ID
                        </label>
                        <input
                            type="text"
                            value={r2AccessKey}
                            onChange={(e) => setR2AccessKey(e.target.value)}
                            placeholder="Access key ID"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                        />
                        <p className="text-[11px] text-gray-400">Fallback: process.env.R2_ACCESS_KEY_ID</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <Icon icon="solar:lock-password-bold" width={14} className="text-amber-500" />
                                R2 Secret Access Key
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowR2Secret(!showR2Secret)}
                                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                            >
                                {showR2Secret ? "Hide" : "Show"}
                            </button>
                        </label>
                        <div className="relative">
                            <input
                                type={showR2Secret ? "text" : "password"}
                                value={r2SecretKey}
                                onChange={(e) => setR2SecretKey(e.target.value)}
                                placeholder="Secret access key"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                            />
                        </div>
                        <p className="text-[11px] text-gray-400">Fallback: process.env.R2_SECRET_ACCESS_KEY</p>
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <Icon icon="solar:global-bold" width={14} className="text-amber-500" />
                            Public Image CDN URL (Domain or R2 Public URL)
                        </label>
                        <input
                            type="text"
                            value={imageCdn}
                            onChange={(e) => setImageCdn(e.target.value)}
                            placeholder="https://cdn.example.com or https://pub-r2.r2.dev"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                        />
                        <p className="text-[11px] text-gray-400">
                            The public URL prefix prepended to images stored on R2. Fallback: process.env.NEXT_PUBLIC_IMAGE_CDN
                        </p>
                    </div>
                </div>
            </div>

            {/* Cloudinary Storage Block */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0">
                            <Icon icon="simple-icons:cloudinary" width={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Cloudinary Media Service</h3>
                            <p className="text-xs text-gray-500">Automated media optimizations, transformations and delivery</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleTestCloudinary}
                        disabled={testingCloudinary}
                        className="px-3.5 py-1.5 rounded-lg border border-gray-300 hover:border-indigo-400 text-xs font-semibold text-gray-700 hover:text-indigo-600 bg-white transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                    >
                        {testingCloudinary ? (
                            <>
                                <Icon icon="svg-spinners:ring-resize" width={14} />
                                Testing Cloudinary...
                            </>
                        ) : (
                            <>
                                <Icon icon="solar:check-read-bold" width={14} className="text-sky-500" />
                                Test Cloudinary Connection
                            </>
                        )}
                    </button>
                </div>

                {cloudinaryTestResult && (
                    <div
                        className={`p-3 rounded-xl text-xs font-semibold border flex items-center gap-2 ${
                            cloudinaryTestResult.ok
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-red-50 text-red-600 border-red-200"
                        }`}
                    >
                        <Icon icon={cloudinaryTestResult.ok ? "solar:check-circle-bold" : "solar:danger-triangle-bold"} width={16} />
                        <span>{cloudinaryTestResult.msg}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <Icon icon="solar:cloud-bold" width={14} className="text-sky-500" />
                            Cloud Name
                        </label>
                        <input
                            type="text"
                            value={cloudinaryCloudName}
                            onChange={(e) => setCloudinaryCloudName(e.target.value)}
                            placeholder="e.g. dqfdlaanx"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                        />
                        <p className="text-[11px] text-gray-400">Fallback: process.env.CLOUDINARY_CLOUD_NAME</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <Icon icon="solar:key-bold" width={14} className="text-sky-500" />
                            API Key
                        </label>
                        <input
                            type="text"
                            value={cloudinaryApiKey}
                            onChange={(e) => setCloudinaryApiKey(e.target.value)}
                            placeholder="e.g. 836513227241252"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                        />
                        <p className="text-[11px] text-gray-400">Fallback: process.env.CLOUDINARY_API_KEY</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <Icon icon="solar:lock-password-bold" width={14} className="text-sky-500" />
                                API Secret
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowCloudinarySecret(!showCloudinarySecret)}
                                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                            >
                                {showCloudinarySecret ? "Hide" : "Show"}
                            </button>
                        </label>
                        <input
                            type={showCloudinarySecret ? "text" : "password"}
                            value={cloudinaryApiSecret}
                            onChange={(e) => setCloudinaryApiSecret(e.target.value)}
                            placeholder="API secret token"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                        />
                        <p className="text-[11px] text-gray-400">Fallback: process.env.CLOUDINARY_API_SECRET</p>
                    </div>
                </div>
            </div>

            {/* Upload Limits & Processing Rules Block */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
                    <Icon icon="solar:tuning-square-2-bold" width={20} className="text-indigo-600" />
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">Upload Limits &amp; Image Processing</h3>
                        <p className="text-xs text-gray-500">Configure file size limits, MIME restrictions, and WebP compression</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <Icon icon="solar:file-bold" width={14} className="text-indigo-500" />
                                Max File Size (in bytes)
                            </span>
                            <span className="text-[11px] font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                                ≈ {maxFileSizeMB} MB
                            </span>
                        </label>
                        <input
                            type="number"
                            value={maxFileSize}
                            onChange={(e) => setMaxFileSize(e.target.value)}
                            placeholder="10485760 (10MB)"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                        <p className="text-[11px] text-gray-400">Default: 10485760 (10MB). Fallback: process.env.NEXT_PUBLIC_MAX_FILE_SIZE</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <Icon icon="solar:document-bold" width={14} className="text-indigo-500" />
                            Allowed MIME Types (comma separated)
                        </label>
                        <input
                            type="text"
                            value={allowedTypes}
                            onChange={(e) => setAllowedTypes(e.target.value)}
                            placeholder="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                        <p className="text-[11px] text-gray-400">Fallback: process.env.NEXT_PUBLIC_ALLOWED_IMAGE_TYPES</p>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
                        <div>
                            <span className="text-xs font-bold text-gray-800 block">Automatic WebP Conversion</span>
                            <span className="text-[11px] text-gray-500 block">
                                Automatically converts uploaded raster images to WebP format for fast web delivery
                            </span>
                        </div>
                        <input
                            type="checkbox"
                            checked={autoWebp}
                            onChange={(e) => setAutoWebp(e.target.checked)}
                            className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                    </div>

                    <div className="space-y-2 p-4 rounded-xl bg-gray-50 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-800">WebP Compression Quality</span>
                            <span className="text-xs font-bold font-mono text-indigo-600">{webpQuality}%</span>
                        </div>
                        <input
                            type="range"
                            min={50}
                            max={100}
                            value={webpQuality}
                            onChange={(e) => setWebpQuality(parseInt(e.target.value, 10))}
                            className="w-full cursor-pointer accent-indigo-600"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                            <span>50% (Smaller size)</span>
                            <span>80% (Recommended)</span>
                            <span>100% (Lossless)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 text-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
                {saving ? (
                    <>
                        <Icon icon="svg-spinners:ring-resize" width={18} />
                        Saving Media Settings...
                    </>
                ) : (
                    <>
                        <Icon icon="solar:disk-bold" width={18} />
                        Save Media Settings
                    </>
                )}
            </button>
        </form>
    );
}
