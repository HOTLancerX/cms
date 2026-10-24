export default function RootLoading() {
    return (
        <div className="w-full min-h-[60vh] py-8 animate-in fade-in duration-200">
            <div className="container mx-auto px-4 max-w-7xl">
                {/* Breadcrumb Skeleton */}
                <div className="flex items-center gap-2 mb-6">
                    <div className="h-4 w-16 bg-gray-200/80 rounded animate-pulse" />
                    <div className="h-4 w-4 bg-gray-200/80 rounded animate-pulse" />
                    <div className="h-4 w-28 bg-gray-200/80 rounded animate-pulse" />
                </div>

                {/* Hero / Header Skeleton */}
                <div className="space-y-4 mb-10">
                    <div className="h-9 md:h-12 w-3/4 max-w-2xl bg-gray-200/80 rounded-xl animate-pulse" />
                    <div className="h-4 w-1/2 max-w-lg bg-gray-200/60 rounded animate-pulse" />
                </div>

                {/* Main Content Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                            key={i}
                            className="flex flex-col bg-white rounded-2xl border border-gray-100 p-4 shadow-xs overflow-hidden"
                        >
                            {/* Card Image Placeholder */}
                            <div className="w-full aspect-video rounded-xl bg-gray-200/70 animate-pulse mb-4" />

                            {/* Card Content Placeholder */}
                            <div className="space-y-2.5 flex-1">
                                <div className="h-3 w-20 bg-gray-200/60 rounded animate-pulse" />
                                <div className="h-5 w-5/6 bg-gray-200/80 rounded-md animate-pulse" />
                                <div className="h-4 w-2/3 bg-gray-200/50 rounded animate-pulse" />
                            </div>

                            {/* Card Footer Placeholder */}
                            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
                                <div className="h-4 w-24 bg-gray-200/50 rounded animate-pulse" />
                                <div className="h-4 w-16 bg-gray-200/60 rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
