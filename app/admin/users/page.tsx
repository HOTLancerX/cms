import Link from "next/link";
import { Icon } from "@iconify/react";

export const dynamic = "force-dynamic";

const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
    active: { label: "Active", cls: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300" },
    inactive: { label: "Inactive", cls: "bg-gray-100 text-gray-500 ring-1 ring-gray-300" },
    suspended: { label: "Suspended", cls: "bg-red-100 text-red-700 ring-1 ring-red-300" },
};

const TYPE_BADGE: Record<string, string> = {
    admin: "bg-violet-100 text-violet-700",
    editor: "bg-blue-100 text-blue-700",
    reporter: "bg-sky-100 text-sky-700",
    seller: "bg-amber-100 text-amber-700",
    user: "bg-gray-100 text-gray-600",
};

export default async function UsersListPage() {
    const res = await fetch(`${EXPRESS_API}/user`, {
        headers: { "x-license-key": LICENSE_KEY },
        cache: "no-store",
    });

    const { users = [] } = res.ok ? await res.json() : { users: [] };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Users</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{users.length} total</p>
                </div>
                <Link
                    href="/admin/users/add"
                    className="inline-flex items-center gap-2 bg-linear-to-r from-indigo-600 to-violet-600 text-white px-4 py-2 rounded-xl font-medium hover:opacity-90 transition text-sm shadow"
                >
                    <Icon icon="solar:user-plus-bold" width={18} />
                    Add User
                </Link>
            </div>

            {/* Table */}
            {users.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <Icon icon="solar:users-group-rounded-bold" width={48} className="mx-auto mb-3 opacity-40" />
                    <p>No users yet.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">User</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Email</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Role</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Joined</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {users.map((user: any) => {
                                const badge = STATUS_BADGE[user.status] ?? STATUS_BADGE.inactive;
                                const typeCls = TYPE_BADGE[user.type] ?? TYPE_BADGE.user;
                                return (
                                    <tr key={user._id} className="hover:bg-gray-50 transition">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                {user.image ? (
                                                    <img
                                                        src={user.image}
                                                        alt={user.name}
                                                        className="w-8 h-8 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <span className="font-medium text-gray-800">{user.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-gray-500">{user.email}</td>
                                        <td className="px-5 py-3">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${typeCls}`}>
                                                {user.type}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>
                                                {badge.label}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-gray-400 text-xs">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <Link
                                                href={`/admin/users/${user._id}`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                                            >
                                                <Icon icon="solar:pen-bold" width={13} />
                                                Edit
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
