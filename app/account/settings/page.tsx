"use client";

import { useUser } from "@/context/Provider";
import UserForm from "@/components/admin/UserForm";
import { useActivePlugins } from "@/hook/useActivePlugins";
import { Icon } from "@iconify/react";

/**
 * /account/settings — any logged-in user can edit their own profile.
 * Uses UserForm in "edit" mode so role/status fields are hidden.
 */
export default function AccountSettingsPage() {
    const { user, loading, refresh } = useUser();
    const activePlugins = useActivePlugins();

    if (loading || activePlugins === null || !user) {
        return (
            <div className="space-y-5">
                <div className="h-8 w-48 bg-gray-100 rounded-xl animate-pulse" />
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
                    ))}
                </div>
            </div>
        );
    }

    const initials = user.name.charAt(0).toUpperCase();

    return (
        <div className="space-y-6">

            {/* ── Page header ── */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-gray-900">Account Settings</h1>
                    <p className="text-sm text-gray-400 mt-1">Manage your personal information and preferences</p>
                </div>
                <div className="shrink-0 relative">
                    {user.image ? (
                        <img
                            src={user.image}
                            alt={user.name}
                            className="w-12 h-12 rounded-2xl object-cover ring-2 ring-indigo-100"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-200">
                            {initials}
                        </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white" />
                </div>
            </div>

            {/* ── Info banner ── */}
            <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3.5">
                <Icon icon="solar:lock-keyhole-bold" width={18} className="text-indigo-500 shrink-0" />
                <p className="text-xs text-indigo-700 font-medium leading-relaxed">
                    Your information is encrypted and secure. Role and account status can only be changed by an administrator.
                </p>
            </div>

            {/* ── Form card ── */}
            <div>
                {/* Card header */}
                <div className="py-4 border-b border-gray-50 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <Icon icon="solar:user-bold" width={16} className="text-indigo-500" />
                    </span>
                    <div>
                        <p className="text-sm font-bold text-gray-800">Personal Information</p>
                        <p className="text-xs text-gray-400">Update your profile details below</p>
                    </div>
                </div>

                <>
                    <UserForm
                        mode="edit"
                        initialData={{
                            _id:      user._id,
                            name:     user.name,
                            slug:     user.slug,
                            email:    user.email,
                            phone:    user.phone,
                            type:     user.type,
                            image:    user.image,
                            status:   user.status,
                            address:  user.address,
                            state:    user.state,
                            city:     user.city,
                            zipCode:  user.zipCode,
                        }}
                        activePlugins={activePlugins}
                        onSuccess={() => refresh()}
                    />
                </>
            </div>

        </div>
    );
}
