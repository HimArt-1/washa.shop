import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function AccountLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen" style={{ backgroundColor: "var(--wusha-bg)" }} dir="rtl">
            {/* شريط علوي بسيط — حسابي فقط */}
            <header
                className="sticky top-0 z-50 backdrop-blur-xl border-b"
                style={{
                    backgroundColor: "color-mix(in srgb, var(--wusha-bg) 95%, transparent)",
                    borderColor: "color-mix(in srgb, var(--wusha-text) 6%, transparent)",
                }}
            >
                <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <Logo size="sm" />
                        <div className="hidden sm:block">
                            <p className="text-[11px] font-bold tracking-[0.18em] text-theme-faint">ACCOUNT</p>
                            <p className="text-xs text-theme-subtle">مساحتك الشخصية داخل وشّى</p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <ThemeToggle />
                        <Link
                            href="/"
                            className="inline-flex min-h-[42px] items-center gap-2 rounded-2xl border border-theme-soft bg-theme-faint px-3 py-2 text-sm transition-colors hover:border-gold/25 hover:text-[var(--wusha-gold)]"
                            style={{ color: "color-mix(in srgb, var(--wusha-text) 50%, transparent)" }}
                        >
                            <span className="hidden sm:inline">العودة للموقع</span>
                            <span className="sm:hidden">الموقع</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </header>
            {children}
        </div>
    );
}
