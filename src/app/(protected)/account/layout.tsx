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
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Logo size="sm" />
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-sm transition-colors hover:text-[var(--wusha-gold)]"
                            style={{ color: "color-mix(in srgb, var(--wusha-text) 50%, transparent)" }}
                        >
                            <span>العودة للموقع</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </header>
            {children}
        </div>
    );
}
