"use client";

import { useUser } from "@/context/Provider";
import { Icon } from "@iconify/react";
import Link from "next/link";

export default function AccountPage() {
    const { user } = useUser();

    if (!user) return null;

    return (
        <div className="max-w-2xl mx-auto py-10 space-y-6">
            {/* Avatar + greeting */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex items-center gap-6">
                {user.image ? (
                    <img
                        src={user.image}
                        alt={user.name}
                        className="w-16 h-16 rounded-full object-cover shrink-0"
                    />
                ) : (
                    <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                )}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Welcome back, {user.name.split(" ")[0]}!
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
                    <span className="inline-block mt-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 capitalize">
                        {user.type}
                    </span>
                </div>
            </div>

            {/* Quick links */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
                <Link
                    href="/account/settings"
                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition group"
                >
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition">
                        <Icon icon="solar:settings-bold" width={20} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-800">Account Settings</p>
                        <p className="text-xs text-gray-400">Update your profile and password</p>
                    </div>
                    <Icon icon="solar:arrow-right-linear" width={16} className="ml-auto text-gray-300 group-hover:text-gray-500 transition" />
                </Link>
            </div>
        </div>
    );
}
