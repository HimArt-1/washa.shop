import Link from "next/link";

export default function NotFound() {
    return (
        <main className="container-wusha flex min-h-[80dvh] items-center justify-center px-4 py-24" dir="rtl">
            <section className="theme-surface-panel relative w-full max-w-3xl overflow-hidden rounded-[1.5rem] px-6 py-14 text-center sm:px-12 sm:py-20">
                <span className="text-sm font-semibold text-gold">404</span>
                <h1 className="mt-4 text-3xl font-black text-theme sm:text-5xl">هذه الصفحة غير موجودة</h1>
                <p className="prose-readable mx-auto mt-5 text-sm text-theme-subtle sm:text-base">
                    ربما تغيّر الرابط أو أزيلت الصفحة. يمكنك العودة إلى المتجر أو بدء تصميم قطعة جديدة.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                    <Link href="/store" className="btn-gold rounded-xl px-7 py-3 font-bold">العودة إلى المتجر</Link>
                    <Link href="/design" className="rounded-xl border border-theme-soft px-7 py-3 font-bold text-theme transition-colors hover:border-gold/30 hover:text-gold">
                        صمّم قطعتك
                    </Link>
                </div>
            </section>
        </main>
    );
}
