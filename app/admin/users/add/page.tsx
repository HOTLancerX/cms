"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import UserForm from "@/components/admin/UserForm";
import { useActivePlugins } from "@/hook/useActivePlugins";

export default function AddUserPage() {
    const router = useRouter();
    const activePlugins = useActivePlugins();

    if (activePlugins === null) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Link
                    href="/admin/users"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
                >
                    <Icon icon="solar:arrow-left-bold" width={16} />
                    Users
                </Link>
                <span className="text-gray-300">/</span>
                <h1 className="text-2xl font-bold">Add User</h1>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <UserForm
                    mode="add"
                    activePlugins={activePlugins}
                    onSuccess={() => router.push("/admin/users")}
                />
            </div>
        </div>
    );
}
