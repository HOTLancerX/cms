"use client";

import { useUser } from "@/context/Provider";
import UserForm from "@/components/admin/UserForm";
import { useActivePlugins } from "@/hook/useActivePlugins";

/**
 * /account/settings — any logged-in user can edit their own profile.
 * Uses UserForm in "edit" mode so role/status fields are hidden.
 */
export default function AccountSettingsPage() {
    const { user, loading, refresh } = useUser();
    const activePlugins = useActivePlugins();

    if (loading || activePlugins === null || !user) return null;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Account Settings</h1>
                <p className="text-sm text-gray-500 mt-0.5">Update your personal information</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <UserForm
                    mode="edit"
                    initialData={{
                        _id: user._id,
                        name: user.name,
                        slug: user.slug,
                        email: user.email,
                        phone: user.phone,
                        type: user.type,
                        image: user.image,
                        status: user.status,
                        address: user.address,
                        state: user.state,
                        city: user.city,
                        zipCode: user.zipCode,
                    }}
                    activePlugins={activePlugins}
                    onSuccess={() => refresh()}
                />
            </div>
        </div>
    );
}
