import Link from "next/link";

export default function NotFound() {
    return (
        <div
            className="min-h-screen bg-bg flex items-center justify-center px-4"
            dir="rtl"
        >
            <div className="text-center max-w-md">
                {/* Animated 404 Number */}
                <div className="relative mb-8">
                    <span className="text-[120px] sm:text-[160px] font-black text-white/[0.03] leading-none select-none">
                        404
                    </span>
                    <span className="absolute inset-0 flex items-center justify-center text-6xl sm:text-7xl font-black bg-gradient-to-b from-gold to-gold/40 bg-clip-text text-transparent">
                        404
                    </span>
                </div>

                {/* Message */}
                <h1 className="text-2xl sm:text-3xl font-bold text-theme mb-4">
                    الصفحة غير موجودة
                </h1>
                <p className="text-theme-subtle text-sm sm:text-base mb-8 leading-relaxed">
                    يبدو أن الصفحة التي تبحث عنها قد نُقلت أو حُذفت.
                    <br />
                    دعنا نعيدك للمكان الصحيح.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/"
                        className="btn-gold py-3 px-8 text-center"
                    >
                        الصفحة الرئيسية
                    </Link>
                    <Link
                        href="/gallery"
                        className="py-3 px-8 border border-gold/20 rounded-xl text-gold/80 hover:bg-gold/5 transition-colors text-center"
                    >
                        تصفح المعرض
                    </Link>
                </div>

                {/* Decorative Line */}
                <div className="mt-12 flex items-center justify-center gap-2">
                    <div className="w-8 h-px bg-gold/20" />
                    <span className="text-gold/30 text-xs">وشّى</span>
                    <div className="w-8 h-px bg-gold/20" />
                </div>
            </div>
        </div>
    );
}
