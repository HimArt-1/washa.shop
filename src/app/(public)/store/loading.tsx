/** هيكل تحميل يطابق الشبكة (بطاقة مميزة + أعمدة) — redesign-existing-projects */
export default function StoreLoading() {
    return (
        <div
            className="store-page min-h-[60vh] pb-12 pt-6 sm:pb-16 sm:pt-8"
            dir="rtl"
            aria-busy="true"
            aria-label="جاري تحميل المتجر"
        >
            <div className="store-page-shell mx-auto max-w-7xl px-4 sm:px-6">
                <div className="store-hero-panel mb-8 animate-pulse rounded-[2rem] px-5 py-6 sm:mb-10 sm:px-7 sm:py-7 lg:px-8">
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex-1 space-y-3 text-center lg:text-right">
                            <div className="mx-auto h-3 w-16 rounded bg-theme-subtle lg:mx-0" />
                            <div className="mx-auto h-10 max-w-xs rounded-lg bg-theme-subtle lg:mx-0" />
                        </div>
                        <div className="flex flex-wrap justify-center gap-2 lg:justify-end">
                            <div className="h-8 w-28 rounded-full bg-theme-subtle" />
                            <div className="h-8 w-24 rounded-full bg-theme-faint" />
                            <div className="h-8 w-28 rounded-full bg-theme-faint" />
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                        <div className="h-10 w-20 rounded-2xl bg-theme-faint" />
                        <div className="h-10 w-24 rounded-2xl bg-theme-faint" />
                        <div className="h-10 w-24 rounded-2xl bg-theme-faint" />
                        <div className="h-10 w-32 rounded-2xl bg-theme-faint" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
                    <div className="wusha-product-card col-span-2 overflow-hidden rounded-[1.65rem]">
                        <div className="aspect-[5/4] skeleton" />
                        <div className="wusha-product-card-footer space-y-2 p-3 sm:p-4">
                            <div className="h-4 w-[75%] max-w-[12rem] rounded bg-theme-subtle" />
                            <div className="flex justify-between">
                                <div className="h-3 w-20 rounded bg-theme-faint" />
                                <div className="h-4 w-14 rounded bg-theme-subtle" />
                            </div>
                        </div>
                    </div>
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <div
                            key={i}
                            className="wusha-product-card overflow-hidden rounded-[1.65rem]"
                        >
                            <div className="aspect-square skeleton" />
                            <div className="wusha-product-card-footer space-y-2 p-3 sm:p-4">
                                <div className="h-4 w-full rounded bg-theme-subtle" />
                                <div className="flex justify-between">
                                    <div className="h-3 w-16 rounded bg-theme-faint" />
                                    <div className="h-4 w-12 rounded bg-theme-subtle" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
