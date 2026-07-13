export default function StoreLoading() {
    return (
        <div className="store-page min-h-[70vh] pb-16 pt-8" dir="rtl" aria-label="جاري تحميل المتجر">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <div className="mb-10 h-72 animate-pulse rounded-[1.5rem] bg-theme-subtle" />
                <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 8 }, (_, index) => (
                        <div
                            key={index}
                            className={`overflow-hidden rounded-[1.375rem] border border-theme-subtle bg-surface ${index === 0 ? "col-span-2" : ""}`}
                        >
                            <div className={`animate-pulse bg-theme-subtle ${index === 0 ? "aspect-[2/1]" : "aspect-square"}`} />
                            <div className="space-y-3 p-4">
                                <div className="h-4 w-3/4 animate-pulse rounded bg-theme-subtle" />
                                <div className="h-3 w-1/3 animate-pulse rounded bg-theme-subtle" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
