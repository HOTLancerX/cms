"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import MediaSettingsTab from "@/components/admin/MediaSettingsTab";
import { useActivePlugins } from "@/hook/useActivePlugins";
import useSettings from "@/lib/useSettings";

export default function AdminMediaSettingsPage() {
    const activePlugins = useActivePlugins();
    const { settings, loading, refresh } = useSettings();

    if (activePlugins === null || loading) {
        return (
            <div className="flex items-center justify-center py-24 text-gray-400">
                <Icon icon="svg-spinners:ring-resize" width={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header & Breadcrumb */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-gray-200 pb-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
                        <Link href="/admin/settings" className="hover:text-indigo-600 transition flex items-center gap-1">
                            <Icon icon="solar:settings-bold" width={14} />
                            Settings
                        </Link>
                        <span>/</span>
                        <span className="text-gray-900 font-bold">Media &amp; Storage</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
                        <Icon icon="solar:gallery-bold" className="text-indigo-600" width={28} />
                        Media &amp; Storage Settings
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Configure Cloudflare R2, Cloudinary, Image CDN, and upload size &amp; format limits.
                    </p>
                </div>

                <Link
                    href="/admin/settings"
                    className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:text-indigo-600 hover:border-indigo-300 bg-white shadow-2xs transition flex items-center gap-1.5"
                >
                    <Icon icon="solar:arrow-left-bold" width={14} />
                    All Settings
                </Link>
            </div>

            {/* Media Settings Tab Component */}
            <MediaSettingsTab
                activePlugins={activePlugins}
                initialValues={settings}
                onSaved={refresh}
            />
        </div>
    );
}
