"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import UserForm from "@/components/admin/UserForm";
import { useActivePlugins } from "@/hook/useActivePlugins";

interface UserData {
    _id: string;
    name: string;
    slug: string;
    email: string;
    phone?: string;
    type: string;
    image?: string;
    status: string;
    address?: string;
    state?: string;
    city?: string;
    zipCode?: string;
}

export default function EditUserPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [user, setUser] = useState<UserData | null>(null);
    const [info, setInfo] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const activePlugins = useActivePlugins();

    useEffect(() => {
        fetch(`/api/user?id=${id}`, { cache: "no-store" })
            .then((r) => r.json())
            .then((userData) => {
                if (!userData.user) {
                    setNotFound(true);
                } else {
                    setUser(userData.user);
                    const infoMap: Record<string, string> = {};
                    (userData.info ?? []).forEach((item: { name: string; value: string }) => {
                        infoMap[item.name] = item.value;
                    });
                    setInfo(infoMap);
                }
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [id]);

    const handleDelete = async () => {
        if (!confirm("Delete this user? This cannot be undone.")) return;
        setDeleting(true);
        await fetch(`/api/user?id=${id}`, { method: "DELETE" });
        router.push("/admin/users");
    };

    if (loading || activePlugins === null) {
        return (
            <div className="flex items-center justify-center py-24 text-gray-400">
                <Icon icon="svg-spinners:ring-resize" width={32} />
            </div>
        );
    }

    if (notFound || !user) {
        return (
            <div className="text-center py-24 text-gray-400">
                <Icon icon="solar:user-cross-bold" width={48} className="mx-auto mb-3 opacity-40" />
                <p>User not found.</p>
                <Link href="/admin/users" className="mt-4 inline-block text-indigo-500 hover:underline text-sm">
                    Back to Users
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/users"
                        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
                    >
                        <Icon icon="solar:arrow-left-bold" width={16} />
                        Users
                    </Link>
                    <span className="text-gray-300">/</span>
                    <h1 className="text-2xl font-bold">{user.name}</h1>
                </div>

                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-500 hover:bg-red-100 transition disabled:opacity-50"
                >
                    {deleting
                        ? <Icon icon="svg-spinners:ring-resize" width={16} />
                        : <Icon icon="solar:trash-bin-trash-bold" width={16} />
                    }
                    Delete
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <UserForm
                    mode="edit"
                    showAdminFields
                    initialData={{ ...user, info }}
                    activePlugins={activePlugins}
                    onSuccess={() => router.push("/admin/users")}
                />
            </div>
        </div>
    );
}
