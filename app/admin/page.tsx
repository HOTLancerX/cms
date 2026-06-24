import connectDB from "@/lib/mongodb";
import Post from "@/models/post";
import Cat from "@/models/cat";
import Link from "next/link";
import { Icon } from "@iconify/react";
import LicenseBanner from "@/components/admin/LicenseBanner";

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

const STATUS_COLOR: Record<string, string> = {
    published: "bg-emerald-100 text-emerald-700",
    draft: "bg-amber-100 text-amber-700",
    trash: "bg-red-100 text-red-600",
    active: "bg-emerald-100 text-emerald-700",
    inactive: "bg-gray-100 text-gray-500",
    suspended: "bg-red-100 text-red-600",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
    // Local DB queries (posts, cats haven't moved yet)
    await connectDB();

    const [
        totalPosts,
        publishedPosts,
        draftPosts,
        totalCats,
        recentPosts,
    ] = await Promise.all([
        Post.countDocuments(),
        Post.countDocuments({ status: "published" }),
        Post.countDocuments({ status: "draft" }),
        Cat.countDocuments(),
        Post.find().sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    // User + plugin + domain data from Express — single aggregated call
    const initRes = await fetch(
        `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/admin-init`,
        { cache: "no-store" }
    );
    const {
        users: allUsers = [],
        plugins: allPlugins = [],
        domain = null,
    } = initRes.ok ? await initRes.json() : {};

    const totalUsers: number = allUsers.length;
    const activeUsers: number = allUsers.filter((u: any) => u.status === "active").length;
    const activePlugins: number = allPlugins.filter((p: any) => p.status === "active").length;
    const recentUsers: any[] = [...allUsers]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    // ── Stat cards ──────────────────────────────────────────────────────────────
    const stats = [
        {
            label: "Total Posts",
            value: totalPosts,
            sub: `${publishedPosts} published · ${draftPosts} draft`,
            icon: "streamline-sharp:story-post",
            gradient: "from-violet-500 to-purple-600",
            href: "/admin/posts/blog",
        },
        {
            label: "Categories",
            value: totalCats,
            sub: "across all types",
            icon: "solar:folder-bold",
            gradient: "from-sky-500 to-blue-600",
            href: "/admin/cats",
        },
        {
            label: "Users",
            value: totalUsers,
            sub: `${activeUsers} active`,
            icon: "solar:users-group-rounded-bold",
            gradient: "from-emerald-500 to-teal-600",
            href: "/admin/users",
        },
        {
            label: "Active Plugins",
            value: activePlugins,
            sub: "installed & running",
            icon: "solar:widget-bold",
            gradient: "from-orange-500 to-amber-500",
            href: "/admin/plugin",
        },
    ];

    return (
        <div className="space-y-8 pb-8">

            {/* ── Welcome ── */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500 mt-0.5">Welcome back — here&apos;s what&apos;s happening.</p>
            </div>

            {/* ── license ── */}
            {domain && (
                <LicenseBanner
                    projectName={domain.projectName}
                    endDate={domain.endDate}
                />
            )}

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((s) => (
                    <Link
                        key={s.label}
                        href={s.href}
                        className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5"
                    >
                        {/* gradient accent bar */}
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-linear-to-r ${s.gradient}`} />
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{s.value}</p>
                                <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
                            </div>
                            <div className={`p-2.5 rounded-xl bg-linear-to-br ${s.gradient} text-white shadow`}>
                                <Icon icon={s.icon} width={20} />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* ── Quick actions ── */}
            <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</h2>
                <div className="flex flex-wrap gap-3">
                    <Link
                        href="/admin/posts/blog/new"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition shadow"
                    >
                        <Icon icon="solar:add-circle-bold" width={16} />
                        New Post
                    </Link>
                    <Link
                        href="/cat"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium transition shadow"
                    >
                        <Icon icon="solar:folder-with-files-bold" width={16} />
                        New Category
                    </Link>
                    <Link
                        href="/admin/users/add"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition shadow"
                    >
                        <Icon icon="solar:user-plus-bold" width={16} />
                        Add User
                    </Link>
                    <Link
                        href="/admin/plugin"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition shadow"
                    >
                        <Icon icon="solar:widget-bold" width={16} />
                        Manage Plugins
                    </Link>
                </div>
            </div>

            {/* ── Recent content ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Recent Posts */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-800">Recent Posts</h2>
                        <Link href="/admin/posts/blog/new" className="text-xs text-violet-600 hover:underline font-medium">
                            + New
                        </Link>
                    </div>
                    {recentPosts.length === 0 ? (
                        <div className="py-12 text-center text-gray-400 text-sm">
                            <Icon icon="streamline-sharp:story-post" width={32} className="mx-auto mb-2 opacity-30" />
                            No posts yet
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-50">
                            {recentPosts.map((post: any) => (
                                <li key={post._id.toString()} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">{post.title}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(post.createdAt)}</p>
                                    </div>
                                    <span className={`ml-3 shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLOR[post.status] ?? "bg-gray-100 text-gray-500"}`}>
                                        {post.status}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Recent Users */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-800">Recent Users</h2>
                        <Link href="/admin/users/add" className="text-xs text-emerald-600 hover:underline font-medium">
                            + Add
                        </Link>
                    </div>
                    {recentUsers.length === 0 ? (
                        <div className="py-12 text-center text-gray-400 text-sm">
                            <Icon icon="solar:users-group-rounded-bold" width={32} className="mx-auto mb-2 opacity-30" />
                            No users yet
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-50">
                            {recentUsers.map((user: any) => (
                                <li key={user._id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition">
                                    {user.image ? (
                                        <img src={user.image} alt={user.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
                                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLOR[user.status] ?? "bg-gray-100 text-gray-500"}`}>
                                            {user.status}
                                        </span>
                                        <span className="text-xs text-gray-400">{timeAgo(user.createdAt)}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

            </div>
        </div>
    );
}
