"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type ChildrenProps = {
    children?: ReactNode;
};

type MockUserButtonProps = {
    afterSignOutUrl?: string;
};

type MockAuthButtonProps = {
    children?: ReactNode;
};

type MockAuthWidgetProps = {
    fallbackRedirectUrl?: string;
    afterSignUpUrl?: string;
    signUpUrl?: string;
    signInUrl?: string;
    path?: string;
};

export function ClerkProvider({ children }: ChildrenProps) {
    return <>{children}</>;
}

export function SignedIn() {
    return null;
}

export function SignedOut({ children }: ChildrenProps) {
    return <>{children}</>;
}

export function UserButton(_: MockUserButtonProps) {
    return (
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300">
            <span className="inline-flex h-2 w-2 rounded-full bg-amber-300" />
            وضع محلي
        </div>
    );
}

export function SignInButton({ children }: MockAuthButtonProps) {
    return <Link href="/sign-in">{children ?? "تسجيل الدخول"}</Link>;
}

export function SignUpButton({ children }: MockAuthButtonProps) {
    return <Link href="/sign-up">{children ?? "إنشاء حساب"}</Link>;
}

function LocalAuthPlaceholder({
    title,
    description,
    href,
    cta,
}: {
    title: string;
    description: string;
    href: string;
    cta: string;
}) {
    return (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-center text-theme">
            <p className="text-sm font-bold">{title}</p>
            <p className="mt-2 text-xs leading-6 text-theme-subtle">{description}</p>
            <Link
                href={href}
                className="mt-4 inline-flex items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/15"
            >
                {cta}
            </Link>
        </div>
    );
}

export function SignIn({ fallbackRedirectUrl }: MockAuthWidgetProps) {
    const redirectLabel = fallbackRedirectUrl ? ` بعد التفعيل سيعاد التوجيه إلى ${fallbackRedirectUrl}.` : "";

    return (
        <LocalAuthPlaceholder
            title="Clerk معطّل محليًا"
            description={`التطبيق يعمل الآن في وضع تطوير محلي بدون Clerk حتى لا تظهر أخطاء مفاتيح الإنتاج على localhost.${redirectLabel}`}
            href="/"
            cta="العودة للرئيسية"
        />
    );
}

export function SignUp({ afterSignUpUrl }: MockAuthWidgetProps) {
    const redirectLabel = afterSignUpUrl ? ` بعد التفعيل سيعاد التوجيه إلى ${afterSignUpUrl}.` : "";

    return (
        <LocalAuthPlaceholder
            title="التسجيل معطّل محليًا"
            description={`وضع التطوير المحلي يستخدم bypass بدل Clerk الفعلي. استخدم لوحة الإدارة أو فعّل مفاتيح Clerk تطويرية إذا أردت تجربة التسجيل.${redirectLabel}`}
            href="/dashboard"
            cta="فتح الداشبورد المحلي"
        />
    );
}

export function useUser() {
    return {
        isLoaded: true,
        isSignedIn: false,
        user: null,
    };
}

export function useAuth() {
    return {
        isLoaded: true,
        isSignedIn: false,
        userId: null,
        sessionId: null,
        getToken: async () => null,
    };
}
