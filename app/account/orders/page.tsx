"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@iconify/react";
import useSettings from "@/lib/useSettings";

interface OrderItem {
    productTitle: string;
    productImage?: string;
    quantity: number;
    price: number;
    subtotal: number;
}

interface Order {
    _id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    paymentGatewayType: string;
    items: OrderItem[];
    subtotal: number;
    shippingCost: number;
    total: number;
    createdAt: string;
}

interface PaginatedOrders {
    orders: Order[];
    total: number;
    page: number;
    pages: number;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
    pending:    { label: "Pending",    color: "bg-yellow-100 text-yellow-700",  icon: "mdi:clock-outline" },
    processing: { label: "Processing", color: "bg-blue-100 text-blue-700",     icon: "mdi:cog-outline" },
    shipped:    { label: "Shipped",    color: "bg-indigo-100 text-indigo-700", icon: "mdi:truck-delivery-outline" },
    delivered:  { label: "Delivered",  color: "bg-green-100 text-green-700",   icon: "mdi:check-circle-outline" },
    cancelled:  { label: "Cancelled",  color: "bg-red-100 text-red-700",       icon: "mdi:close-circle-outline" },
};

function fmt(amount: number, symbol: string) {
    return `${symbol} ${Number(amount).toLocaleString("en-US", {
        minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    })}`.trim();
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
    });
}

export default function AccountOrdersPage() {
    const { settings } = useSettings();
    const currencySymbol = settings?.currency_symbol || settings?.product_currency_symbol || "";

    const [data, setData]         = useState<PaginatedOrders | null>(null);
    const [page, setPage]         = useState(1);
    const [loading, setLoading]   = useState(true);
    const [statusFilter, setStatusFilter] = useState("");

    const fetchOrders = async (p: number, status: string) => {
        setLoading(true);
        try {
            const qs = new URLSearchParams({ page: String(p), limit: "10" });
            if (status) qs.set("status", status);
            const res = await fetch(`/api/orders?${qs}`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch {
            /* silent */
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders(page, statusFilter);
    }, [page, statusFilter]);

    const handleStatusChange = (s: string) => {
        setStatusFilter(s);
        setPage(1);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {data ? `${data.total} order${data.total !== 1 ? "s" : ""} total` : ""}
                    </p>
                </div>
                {/* Status filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    <option value="">All statuses</option>
                    {Object.entries(STATUS_MAP).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-20 text-gray-400">
                    <Icon icon="svg-spinners:ring-resize" width={32} />
                </div>
            )}

            {/* Empty state */}
            {!loading && data?.orders.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
                    <Icon icon="solar:bag-outline" width={56} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-semibold text-gray-700 mb-1">No orders yet</p>
                    <p className="text-sm text-gray-400 mb-6">
                        {statusFilter ? "No orders match this filter." : "You haven't placed any orders."}
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-400 transition text-sm"
                    >
                        <Icon icon="mdi:shopping-outline" width={16} />
                        Start Shopping
                    </Link>
                </div>
            )}

            {/* Orders list */}
            {!loading && data && data.orders.length > 0 && (
                <div className="space-y-3">
                    {data.orders.map((order) => {
                        const statusInfo = STATUS_MAP[order.status] ?? STATUS_MAP.pending;
                        const firstItem  = order.items[0];
                        const moreCount  = order.items.length - 1;

                        return (
                            <div
                                key={order._id}
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                            >
                                {/* Order header */}
                                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-50 flex-wrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                                            <Icon icon="mdi:receipt-text-outline" width={16} className="text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 font-mono">{order.orderNumber}</p>
                                            <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${statusInfo.color}`}>
                                            <Icon icon={statusInfo.icon} width={12} />
                                            {statusInfo.label}
                                        </span>
                                        <span className="text-sm font-bold text-gray-900">
                                            {fmt(order.total, currencySymbol)}
                                        </span>
                                    </div>
                                </div>

                                {/* Item preview */}
                                <div className="px-5 py-4 flex items-center gap-4">
                                    {firstItem?.productImage && (
                                        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                                            <Image
                                                src={firstItem.productImage}
                                                alt={firstItem.productTitle}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">
                                            {firstItem?.productTitle ?? "—"}
                                        </p>
                                        {moreCount > 0 && (
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                + {moreCount} more item{moreCount !== 1 ? "s" : ""}
                                            </p>
                                        )}
                                    </div>
                                    <Link
                                        href={`/order-confirmation/${order.orderNumber}`}
                                        className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-50 transition"
                                    >
                                        View
                                        <Icon icon="mdi:arrow-right" width={12} />
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {data && data.pages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        aria-label="Previous page"
                    >
                        <Icon icon="mdi:chevron-left" width={18} />
                    </button>
                    <span className="text-sm text-gray-600 px-2">
                        Page {page} of {data.pages}
                    </span>
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                        disabled={page >= data.pages}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        aria-label="Next page"
                    >
                        <Icon icon="mdi:chevron-right" width={18} />
                    </button>
                </div>
            )}
        </div>
    );
}
