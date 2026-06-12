'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { xFetch } from '@/lib/express';

interface Menu {
    _id: string;
    title: string;
    location: string[];
    items: any[];
    status: 'active' | 'inactive';
    createdAt: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

// ── Inner component (needs useSearchParams, wrapped in Suspense below) ────────

function MenuList() {
    const router        = useRouter();
    const searchParams  = useSearchParams();
    const currentPage   = parseInt(searchParams.get('page') || '1', 10);

    const [menus,      setMenus]      = useState<Menu[]>([]);
    const [loading,    setLoading]    = useState(true);
    const [deleting,   setDeleting]   = useState<string | null>(null);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1, limit: 10, total: 0, totalPages: 0,
    });

    useEffect(() => { loadMenus(); }, [currentPage]);

    const loadMenus = async () => {
        setLoading(true);
        try {
            const res  = await xFetch(`/menu?page=${currentPage}&limit=10`);
            if (res.ok) {
                const data = await res.json();
                setMenus(data.menus ?? []);
                setPagination(data.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 });
            }
        } catch (err) {
            console.error('Error loading menus:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this menu?')) return;
        setDeleting(id);
        try {
            const res = await xFetch(`/menu?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setMenus((prev) => prev.filter((m) => m._id !== id));
                setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
            } else {
                alert('Failed to delete menu');
            }
        } catch {
            alert('Error deleting menu');
        } finally {
            setDeleting(null);
        }
    };

    const goToPage = (page: number) => router.push(`/admin/menu?page=${page}`);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24 text-gray-400">
                <Icon icon="svg-spinners:ring-resize" width={32} />
            </div>
        );
    }

    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Menus</h1>
                    {pagination.total > 0 && (
                        <p className="text-sm text-gray-500 mt-0.5">{pagination.total} menu{pagination.total !== 1 ? 's' : ''}</p>
                    )}
                </div>
                <Link
                    href="/admin/menu/add"
                    className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
                >
                    <Icon icon="solar:add-circle-bold" width={18} />
                    Add New Menu
                </Link>
            </div>

            {menus.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Icon icon="solar:menu-dots-bold" width={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 mb-4">No menus yet</p>
                    <Link href="/admin/menu/add" className="text-indigo-600 hover:underline text-sm font-medium">
                        Create your first menu
                    </Link>
                </div>
            ) : (
                <>
                    <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Title', 'Locations', 'Items', 'Status', 'Actions'].map((h) => (
                                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {menus.map((menu) => (
                                    <tr key={menu._id} className="hover:bg-gray-50 transition">
                                        {/* Title */}
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-semibold text-gray-900">{menu.title}</p>
                                        </td>

                                        {/* Locations */}
                                        <td className="px-6 py-4">
                                            {menu.location.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {menu.location.map((loc) => (
                                                        <span key={loc} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-mono">
                                                            {loc}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">— not assigned —</span>
                                            )}
                                        </td>

                                        {/* Items count */}
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-700">
                                                {Array.isArray(menu.items) ? menu.items.length : 0} item{(Array.isArray(menu.items) ? menu.items.length : 0) !== 1 ? 's' : ''}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                                                menu.status === 'active'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${menu.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                                {menu.status}
                                            </span>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Link
                                                    href={`/admin/menu/${menu._id}`}
                                                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                                >
                                                    <Icon icon="solar:pen-bold" width={14} />
                                                    Edit
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(menu._id)}
                                                    disabled={deleting === menu._id}
                                                    className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-40"
                                                >
                                                    {deleting === menu._id
                                                        ? <Icon icon="svg-spinners:ring-resize" width={14} />
                                                        : <Icon icon="solar:trash-bin-trash-bold" width={14} />
                                                    }
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="mt-6 flex justify-center items-center gap-2">
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-2 border rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center gap-1"
                            >
                                <Icon icon="mdi:chevron-left" width={16} /> Prev
                            </button>

                            <div className="flex gap-1">
                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => goToPage(page)}
                                        className={`w-9 h-9 rounded-lg border text-sm font-medium transition ${
                                            page === currentPage
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : 'hover:bg-gray-50'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === pagination.totalPages}
                                className="px-3 py-2 border rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center gap-1"
                            >
                                Next <Icon icon="mdi:chevron-right" width={16} />
                            </button>
                        </div>
                    )}
                </>
            )}
        </>
    );
}

// ── Page export — Suspense boundary required for useSearchParams ──────────────

export default function MenuListPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center py-24 text-gray-400">
                <Icon icon="svg-spinners:ring-resize" width={32} />
            </div>
        }>
            <MenuList />
        </Suspense>
    );
}
