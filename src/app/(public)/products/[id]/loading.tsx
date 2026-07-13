export default function ProductLoading() {
    return (
        <div className="min-h-[70vh] bg-bg pb-16 pt-8" dir="rtl" aria-label="جاري تحميل المنتج">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <div className="mb-8 h-4 w-52 animate-pulse rounded bg-theme-subtle" />
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)] lg:gap-10">
                    <div className="aspect-square animate-pulse rounded-[1.5rem] bg-theme-subtle" />
                    <div className="space-y-5 rounded-[1.5rem] border border-theme-subtle bg-surface p-6 sm:p-8">
                        <div className="h-6 w-28 animate-pulse rounded bg-theme-subtle" />
                        <div className="h-10 w-4/5 animate-pulse rounded bg-theme-subtle" />
                        <div className="h-20 animate-pulse rounded-xl bg-theme-subtle" />
                        <div className="h-28 animate-pulse rounded-xl bg-theme-subtle" />
                        <div className="h-14 animate-pulse rounded-xl bg-theme-subtle" />
                    </div>
                </div>
            </div>
        </div>
    );
}
