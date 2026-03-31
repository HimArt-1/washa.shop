function SkeletonLine({
    widthClass,
    heightClass = "h-4",
}: {
    widthClass: string;
    heightClass?: string;
}) {
    return (
        <div
            className={`animate-pulse rounded-full bg-theme-faint/80 ${heightClass} ${widthClass}`}
        />
    );
}

function SkeletonPanel({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`theme-surface-panel rounded-[30px] p-5 sm:p-6 ${className}`}>
            {children}
        </div>
    );
}

function SkeletonCard({
    className = "",
}: {
    className?: string;
}) {
    return (
        <div className={`theme-surface-panel rounded-[26px] p-5 ${className}`}>
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                    <SkeletonLine widthClass="w-24" heightClass="h-3" />
                    <SkeletonLine widthClass="w-28" heightClass="h-8" />
                </div>
                <div className="h-12 w-12 animate-pulse rounded-2xl border border-theme-subtle bg-theme-faint/80" />
            </div>
            <div className="mt-6 flex items-center justify-between gap-3">
                <SkeletonLine widthClass="w-32" />
                <div className="h-4 w-4 animate-pulse rounded-full bg-theme-faint/80" />
            </div>
        </div>
    );
}

function SkeletonQueueCard() {
    return (
        <div className="theme-surface-panel rounded-[26px] p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
                <div className="space-y-3">
                    <SkeletonLine widthClass="w-32" heightClass="h-6" />
                    <SkeletonLine widthClass="w-56" />
                </div>
                <SkeletonLine widthClass="w-14" heightClass="h-4" />
            </div>

            <div className="space-y-3">
                {[0, 1, 2].map((item) => (
                    <div
                        key={item}
                        className="rounded-2xl border border-theme-subtle bg-theme-faint p-4"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-2">
                                <SkeletonLine widthClass="w-32" />
                                <SkeletonLine widthClass="w-24" heightClass="h-3" />
                            </div>
                            <SkeletonLine widthClass="w-12" heightClass="h-3" />
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-4">
                            <SkeletonLine widthClass="w-20" heightClass="h-3" />
                            <SkeletonLine widthClass="w-14" heightClass="h-3" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SkeletonTable() {
    return (
        <SkeletonPanel className="overflow-hidden p-0">
            <div className="border-b border-theme-subtle px-6 py-5">
                <div className="space-y-3">
                    <SkeletonLine widthClass="w-36" heightClass="h-3" />
                    <SkeletonLine widthClass="w-44" heightClass="h-7" />
                    <SkeletonLine widthClass="w-72" />
                </div>
            </div>

            <div className="space-y-0">
                {[0, 1, 2, 3].map((row) => (
                    <div
                        key={row}
                        className="grid grid-cols-6 gap-3 border-b border-theme-faint px-6 py-4"
                    >
                        <SkeletonLine widthClass="w-20" />
                        <SkeletonLine widthClass="w-24" />
                        <SkeletonLine widthClass="w-16" />
                        <SkeletonLine widthClass="w-14" />
                        <SkeletonLine widthClass="w-14" />
                        <SkeletonLine widthClass="w-16" />
                    </div>
                ))}
            </div>
        </SkeletonPanel>
    );
}

export default function DashboardLoading() {
    return (
        <div className="space-y-6" dir="rtl">
            <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
                <SkeletonPanel className="relative overflow-hidden p-5 sm:p-6 md:p-7">
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <SkeletonLine widthClass="w-36" heightClass="h-7" />
                            <SkeletonLine widthClass="w-32" heightClass="h-7" />
                            <SkeletonLine widthClass="w-40" heightClass="h-7" />
                        </div>

                        <div className="space-y-4">
                            <SkeletonLine widthClass="w-72 max-w-full" heightClass="h-10" />
                            <SkeletonLine widthClass="w-full" />
                            <SkeletonLine widthClass="w-11/12" />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {[0, 1, 2].map((item) => (
                                <div
                                    key={item}
                                    className="rounded-2xl border border-theme-subtle bg-theme-faint p-4"
                                >
                                    <div className="space-y-3">
                                        <SkeletonLine widthClass="w-28" heightClass="h-3" />
                                        <SkeletonLine widthClass="w-20" heightClass="h-8" />
                                        <SkeletonLine widthClass="w-full" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {[0, 1, 2, 3].map((item) => (
                                <div
                                    key={item}
                                    className="flex items-center justify-between rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 animate-pulse rounded-2xl border border-theme-subtle bg-[color:color-mix(in_srgb,var(--wusha-surface)_72%,transparent)]" />
                                        <div className="space-y-2">
                                            <SkeletonLine widthClass="w-16" />
                                            <SkeletonLine widthClass="w-20" heightClass="h-3" />
                                        </div>
                                    </div>
                                    <div className="h-4 w-4 animate-pulse rounded-full bg-theme-faint/80" />
                                </div>
                            ))}
                        </div>
                    </div>
                </SkeletonPanel>

                <SkeletonPanel>
                    <div className="space-y-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-3">
                                <SkeletonLine widthClass="w-28" heightClass="h-3" />
                                <SkeletonLine widthClass="w-40" heightClass="h-8" />
                                <SkeletonLine widthClass="w-full" />
                            </div>
                            <div className="h-5 w-5 animate-pulse rounded-full bg-theme-faint/80" />
                        </div>

                        <div className="flex items-center justify-center py-3">
                            <div className="grid h-36 w-36 place-items-center rounded-full border border-theme-subtle bg-theme-faint sm:h-44 sm:w-44">
                                <div className="grid h-28 w-28 place-items-center rounded-full border border-theme-subtle bg-[color:var(--wusha-surface)] sm:h-36 sm:w-36">
                                    <div className="space-y-2 text-center">
                                        <SkeletonLine widthClass="w-16" />
                                        <SkeletonLine widthClass="w-12" heightClass="h-10" />
                                        <SkeletonLine widthClass="w-10" heightClass="h-3" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {[0, 1, 2, 3].map((item) => (
                                <div
                                    key={item}
                                    className="rounded-2xl border border-theme-subtle bg-theme-faint p-4"
                                >
                                    <div className="space-y-3">
                                        <SkeletonLine widthClass="w-20" heightClass="h-3" />
                                        <SkeletonLine widthClass="w-12" heightClass="h-8" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </SkeletonPanel>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((item) => (
                    <SkeletonCard key={item} />
                ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
                <SkeletonPanel>
                    <div className="space-y-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div className="space-y-3">
                                <SkeletonLine widthClass="w-32" heightClass="h-3" />
                                <SkeletonLine widthClass="w-56" heightClass="h-8" />
                                <SkeletonLine widthClass="w-full" />
                                <SkeletonLine widthClass="w-5/6" />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
                                {[0, 1].map((item) => (
                                    <div
                                        key={item}
                                        className="rounded-2xl border border-theme-subtle bg-theme-faint p-4"
                                    >
                                        <div className="space-y-3">
                                            <SkeletonLine widthClass="w-20" heightClass="h-3" />
                                            <SkeletonLine widthClass="w-24" heightClass="h-6" />
                                            <SkeletonLine widthClass="w-16" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-[26px] border border-theme-subtle bg-theme-faint p-4 sm:p-5">
                            <div className="grid h-[290px] grid-cols-12 items-end gap-2 md:gap-3">
                                {Array.from({ length: 12 }).map((_, index) => (
                                    <div key={index} className="flex flex-col items-center gap-3">
                                        <div className="flex h-[230px] w-full items-end justify-center gap-1 rounded-2xl border border-theme-subtle bg-[color:color-mix(in_srgb,var(--wusha-surface)_70%,transparent)] px-1 py-3">
                                            <div
                                                className="w-full animate-pulse rounded-full bg-gold/25"
                                                style={{ height: `${28 + (index % 5) * 14}%` }}
                                            />
                                        </div>
                                        <div className="space-y-2 text-center">
                                            <SkeletonLine widthClass="w-8" heightClass="h-3" />
                                            <SkeletonLine widthClass="w-6" heightClass="h-3" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </SkeletonPanel>

                <SkeletonPanel>
                    <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-3">
                                <SkeletonLine widthClass="w-28" heightClass="h-3" />
                                <SkeletonLine widthClass="w-48" heightClass="h-8" />
                                <SkeletonLine widthClass="w-full" />
                            </div>
                            <SkeletonLine widthClass="w-16" heightClass="h-4" />
                        </div>

                        {[0, 1, 2].map((item) => (
                            <div
                                key={item}
                                className="rounded-2xl border border-theme-subtle bg-theme-faint p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1 space-y-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <SkeletonLine widthClass="w-14" heightClass="h-6" />
                                            <SkeletonLine widthClass="w-12" heightClass="h-3" />
                                        </div>
                                        <SkeletonLine widthClass="w-36" />
                                        <SkeletonLine widthClass="w-11/12" />
                                    </div>
                                    <SkeletonLine widthClass="w-10" heightClass="h-3" />
                                </div>
                            </div>
                        ))}
                    </div>
                </SkeletonPanel>
            </div>

            <div className="grid gap-4 xl:grid-cols-4">
                {[0, 1, 2, 3].map((item) => (
                    <SkeletonCard key={`operations-${item}`} />
                ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
                {[0, 1, 2].map((item) => (
                    <SkeletonQueueCard key={item} />
                ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
                <SkeletonTable />

                <div className="space-y-5">
                    {[0, 1].map((item) => (
                        <div
                            key={item}
                            className="theme-surface-panel min-h-[360px] rounded-[30px] p-5 sm:p-6"
                        >
                            <div className="space-y-4">
                                <SkeletonLine widthClass="w-28" heightClass="h-3" />
                                <SkeletonLine widthClass="w-40" heightClass="h-7" />
                                {[0, 1, 2, 3].map((row) => (
                                    <div
                                        key={row}
                                        className="rounded-2xl border border-theme-subtle bg-theme-faint p-4"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="space-y-2">
                                                <SkeletonLine widthClass="w-28" />
                                                <SkeletonLine widthClass="w-20" heightClass="h-3" />
                                            </div>
                                            <SkeletonLine widthClass="w-12" heightClass="h-8" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((item) => (
                    <div
                        key={`footer-${item}`}
                        className="theme-surface-panel rounded-[26px] p-4"
                    >
                        <div className="flex items-center justify-between">
                            <div className="h-5 w-5 animate-pulse rounded-full bg-theme-faint/80" />
                            <SkeletonLine widthClass="w-20" heightClass="h-3" />
                        </div>
                        <div className="mt-4 space-y-3">
                            <SkeletonLine widthClass="w-20" heightClass="h-8" />
                            <SkeletonLine widthClass="w-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
