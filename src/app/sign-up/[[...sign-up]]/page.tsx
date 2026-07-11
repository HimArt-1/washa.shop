import { SignUp } from "@clerk/nextjs";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

type Props = { searchParams?: Promise<{ redirect_url?: string }> };

export default async function SignUpPage({ searchParams }: Props) {
    const params = (await searchParams) ?? {};
    const redirectUrl = params.redirect_url?.startsWith("/") ? params.redirect_url : "/account";
    const signInUrl = `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`;

    return (
        <AuthPageShell
            title="إنشاء حساب"
            eyebrow="WASHA AUTH"
            switchPrompt="لديك حساب؟"
            switchHref={signInUrl}
            switchLabel="تسجيل الدخول"
        >
            <SignUp
                signInUrl={signInUrl}
                afterSignUpUrl={redirectUrl}
                fallbackRedirectUrl={redirectUrl}
            />
        </AuthPageShell>
    );
}
