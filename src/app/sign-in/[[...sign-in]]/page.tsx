import { SignIn } from "@clerk/nextjs";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

type Props = { searchParams?: Promise<{ redirect_url?: string }> };

export default async function SignInPage({ searchParams }: Props) {
    const params = (await searchParams) ?? {};
    const redirectUrl = params.redirect_url?.startsWith("/") ? params.redirect_url : "/account";
    const signUpUrl = `/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`;

    return (
        <AuthPageShell
            title="تسجيل الدخول"
            eyebrow="WASHA AUTH"
            switchPrompt="ليس لديك حساب؟"
            switchHref={signUpUrl}
            switchLabel="إنشاء حساب"
        >
            <SignIn
                path="/sign-in"
                fallbackRedirectUrl={redirectUrl}
                signUpUrl={signUpUrl}
            />
        </AuthPageShell>
    );
}
