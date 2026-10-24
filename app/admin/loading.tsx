export default function AdminLoading() {
    return (
        <div className="w-full p-6 animate-in fade-in duration-200">
            {/* Header Skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-4 w-72 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-28 bg-gray-200 rounded-xl animate-pulse" />
                    <div className="h-10 w-32 bg-gray-200 rounded-xl animate-pulse" />
                </div>
            </div>

            {/* Quick Stat Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-5 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                            <div className="w-8 h-8 rounded-lg bg-gray-100 animate-pulse" />
                        </div>
                        <div className="h-7 w-24 bg-gray-300 rounded-md animate-pulse" />
                        <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
                    </div>
                ))}
            </div>

            {/* Table / Content List Skeleton */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="h-9 w-64 bg-gray-100 rounded-xl animate-pulse" />
                    <div className="flex gap-2">
                        <div className="h-9 w-20 bg-gray-100 rounded-xl animate-pulse" />
                        <div className="h-9 w-20 bg-gray-100 rounded-xl animate-pulse" />
                    </div>
                </div>
                <div className="divide-y divide-gray-100">
                    {[1, 2, 3, 4, 5].map((row) => (
                        <div key={row} className="p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse shrink-0" />
                                <div className="space-y-1.5 flex-1">
                                    <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                                    <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
                                </div>
                            </div>
                            <div className="h-4 w-24 bg-gray-100 rounded animate-pulse hidden sm:block" />
                            <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
                            <div className="w-8 h-8 rounded-lg bg-gray-100 animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
