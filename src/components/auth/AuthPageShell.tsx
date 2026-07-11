import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { CyberAuthBackground } from "@/components/auth/CyberAuthBackground";
import { Logo } from "@/components/ui/Logo";

type AuthPageShellProps = {
    children: ReactNode;
    title: string;
    eyebrow: string;
    switchPrompt: string;
    switchHref: string;
    switchLabel: string;
};

export function AuthPageShell({
    children,
    title,
    eyebrow,
    switchPrompt,
    switchHref,
    switchLabel,
}: AuthPageShellProps) {
    return (
        <div
            data-theme="dark"
            dir="rtl"
            className="relative min-h-[100dvh] overflow-hidden bg-[#060504] text-[#fff1dc]"
            style={{ colorScheme: "dark" }}
        >
            <CyberAuthBackground />
            <AuthHudCorners />

            <main className="relative z-10 mx-auto grid min-h-[100dvh] w-full max-w-6xl grid-cols-1 items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:px-10">
                <section className="hidden min-h-[520px] flex-col justify-between lg:flex">
                    <div>
                        <Link
                            href="/design/washa-ai"
                            className="group inline-flex items-center gap-4 rounded-full border border-[#ceae7f]/18 bg-[#ceae7f]/[0.07] px-4 py-3 text-[#f3d8aa] backdrop-blur-md transition-colors duration-300 hover:border-[#ceae7f]/35 hover:bg-[#ceae7f]/[0.1]"
                        >
                            <Logo
                                size="md"
                                asLink={false}
                                src="/header-logo-identity.png"
                                toneColor="rgb(206, 174, 127)"
                            />
                            <span className="font-mono text-[10px] text-[#ceae7f]/70">
                                WASHA://AI.GATE
                            </span>
                            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
                        </Link>

                        <div className="mt-16 max-w-[560px]">
                            <p className="font-mono text-[11px] text-[#ceae7f]/55">
                                {eyebrow}
                            </p>
                            <h1 className="mt-5 text-6xl font-black leading-[0.9] text-[#fff1dc] xl:text-8xl">
                                {title}
                            </h1>
                            <p className="mt-6 max-w-[34rem] text-base leading-8 text-[#e7ceb0]/62">
                                دخول آمن إلى حساب وشّى بنفس لغة الاستوديو الذكي.
                            </p>
                        </div>
                    </div>

                    <div className="grid max-w-[560px] grid-cols-3 gap-px border border-[#ceae7f]/14 bg-[#ceae7f]/14">
                        {["IDENTITY", "STUDIO", "STORE"].map((label) => (
                            <div key={label} className="bg-[#090705]/88 px-4 py-4">
                                <p className="font-mono text-[10px] text-[#ceae7f]/44">
                                    {label}
                                </p>
                                <div className="mt-3 flex items-center gap-2 text-xs text-[#fff1dc]/68">
                                    <ShieldCheck className="h-3.5 w-3.5 text-[#ceae7f]" />
                                    <span>READY</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="w-full max-w-[440px] justify-self-center">
                    <div className="mb-6 flex items-center justify-center lg:hidden">
                        <Link href="/" aria-label="وشّى — الصفحة الرئيسية">
                            <Logo
                                size="lg"
                                asLink={false}
                                src="/header-logo-identity.png"
                                toneColor="rgb(206, 174, 127)"
                            />
                        </Link>
                    </div>

                    <div className="mb-5 flex items-center justify-between gap-4">
                        <div>
                            <p className="font-mono text-[10px] text-[#ceae7f]/52">
                                SECURE ACCESS
                            </p>
                            <h2 className="mt-2 text-2xl font-bold text-[#fff1dc]">{title}</h2>
                        </div>
                        <Link
                            href="/"
                            className="hidden rounded-full border border-[#ceae7f]/18 bg-[#ceae7f]/[0.07] p-3 text-[#ceae7f] transition-colors duration-300 hover:border-[#ceae7f]/35 hover:bg-[#ceae7f]/[0.1] sm:inline-flex"
                            aria-label="العودة للصفحة الرئيسية"
                        >
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <div className="auth-clerk-shell">{children}</div>

                    <p className="mt-6 text-center text-sm text-[#e7ceb0]/58">
                        {switchPrompt}{" "}
                        <Link
                            href={switchHref}
                            className="inline-flex items-center gap-1.5 font-semibold text-[#ceae7f] transition-colors duration-300 hover:text-[#f1d3a4]"
                        >
                            {switchLabel}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </p>
                </section>
            </main>
        </div>
    );
}

function AuthHudCorners() {
    const base = "pointer-events-none absolute z-10 h-5 w-5 border-[#ceae7f]/28";

    return (
        <>
            <span className={`${base} left-5 top-5 border-l border-t sm:left-8 sm:top-8`} />
            <span className={`${base} right-5 top-5 border-r border-t sm:right-8 sm:top-8`} />
            <span className={`${base} bottom-5 left-5 border-b border-l sm:bottom-8 sm:left-8`} />
            <span className={`${base} bottom-5 right-5 border-b border-r sm:bottom-8 sm:right-8`} />
        </>
    );
}
