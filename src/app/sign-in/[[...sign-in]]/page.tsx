import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ArrowRight } from "lucide-react";
import { CyberAuthBackground } from "@/components/auth/CyberAuthBackground";

type Props = { searchParams?: { redirect_url?: string } };

export default function SignInPage({ searchParams }: Props) {
    const redirectUrl = searchParams?.redirect_url?.startsWith("/") ? searchParams.redirect_url : "/account";

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-bg px-4 py-12 relative overflow-hidden">
            <CyberAuthBackground />

            <div className="relative w-full max-w-md z-10">
                {/* شعار متوهج */}
                <Link
                    href="/"
                    className="flex justify-center mb-8 group"
                >
                    <div className="relative">
                        <div className="absolute inset-0 blur-xl bg-gold/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl scale-150" />
                        <div className="relative animate-neon-pulse">
                            <Logo size="lg" asLink={false} />
                        </div>
                    </div>
                </Link>

                {/* بطاقة زجاجية */}
                <div className="glass-premium rounded-2xl p-2 shadow-2xl border border-gold/10">
                    <div className="rounded-xl overflow-hidden">
                        <SignIn
                            path="/sign-in"
                            fallbackRedirectUrl={redirectUrl}
                            signUpUrl="/sign-up"
                        />
                    </div>
                </div>

                <p className="text-center text-theme-subtle text-sm mt-6">
                    ليس لديك حساب؟{" "}
                    <Link
                        href="/sign-up"
                        className="text-gold hover:text-gold-light font-medium inline-flex items-center gap-1 transition-colors"
                    >
                        إنشاء حساب
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </p>
            </div>
        </div>
    );
}
