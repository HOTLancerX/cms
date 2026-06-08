"use client";

import { Icon } from "@iconify/react";
import FormSettings from "@/components/admin/FormSettings";
import { useActivePlugins } from "@/hook/useActivePlugins";
import useSettings from "@/lib/useSettings";

export default function AdminSettingsPage() {
    const activePlugins             = useActivePlugins();
    const { settings, loading }     = useSettings();

    if (activePlugins === null || loading) {
        return (
            <div className="flex items-center justify-center py-24 text-gray-400">
                <Icon icon="svg-spinners:ring-resize" width={32} />
            </div>
        );
    }

    return (
        <>
            <div>
                <h1 className="mb-4 block font-bold">Settings</h1>
            </div>
            <FormSettings
                type="settings"
                activePlugins={activePlugins}
                initialValues={settings}
            />
        </>
    );
}
