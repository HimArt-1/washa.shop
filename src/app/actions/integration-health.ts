"use server";

import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUserOrDevAdmin, resolveAdminAccess } from "@/lib/admin-access";

export type IntegrationHealthStatus = "ready" | "warning" | "missing";

export type IntegrationHealthCheck = {
    label: string;
    ok: boolean;
    required: boolean;
    detail: string;
};

export type IntegrationHealthItem = {
    id: string;
    name: string;
    category: string;
    status: IntegrationHealthStatus;
    summary: string;
    checks: IntegrationHealthCheck[];
    endpoints?: { label: string; url: string }[];
    action: string;
};

export type IntegrationHealthReport = {
    generatedAt: string;
    appUrl: string;
    environment: string;
    totals: Record<IntegrationHealthStatus, number>;
    items: IntegrationHealthItem[];
};

function cleanEnvValue(name: string) {
    const value = process.env[name]?.trim();
    if (!value) return "";
    if (value.startsWith("#")) return "";
    if (value.includes("xxxx") || value.includes("yourdomain.com")) return "";
    if (value.includes("←")) return "";
    return value;
}

function hasEnv(name: string) {
    return cleanEnvValue(name).length > 0;
}

function getAppUrl() {
    const raw = cleanEnvValue("NEXT_PUBLIC_APP_URL")
        || cleanEnvValue("NEXT_PUBLIC_BASE_URL")
        || "https://washa.shop";
    const trimmed = raw.replace(/\/+$/, "");
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function makeEndpoint(path: string) {
    return `${getAppUrl()}${path}`;
}

function check(label: string, envName: string, required = true, configuredLabel = "مضبوط") {
    const ok = hasEnv(envName);
    return {
        label,
        ok,
        required,
        detail: ok ? configuredLabel : `${envName} غير مضبوط`,
    };
}

function deriveStatus(checks: IntegrationHealthCheck[]): IntegrationHealthStatus {
    if (checks.some((item) => item.required && !item.ok)) return "missing";
    if (checks.some((item) => !item.ok)) return "warning";
    return "ready";
}

function item(params: Omit<IntegrationHealthItem, "status">): IntegrationHealthItem {
    return {
        ...params,
        status: deriveStatus(params.checks),
    };
}

async function requireIntegrationAccess() {
    const user = await getCurrentUserOrDevAdmin();
    if (!user) throw new Error("Unauthorized");

    const access = await resolveAdminAccess(user);
    if (!access.profile || !access.isAdmin) throw new Error("Forbidden");

    return access;
}

export async function getIntegrationHealthReport(): Promise<IntegrationHealthReport> {
    noStore();

    const { supabase } = await requireIntegrationAccess();
    const appUrl = getAppUrl();

    let supabaseReachable = false;
    let supabaseLatencyDetail = "تعذر اختبار الاتصال";
    try {
        const start = Date.now();
        const { error } = await supabase.from("profiles").select("id").limit(1);
        supabaseReachable = !error;
        supabaseLatencyDetail = error ? error.message : `متصل خلال ${Date.now() - start}ms`;
    } catch (error) {
        supabaseLatencyDetail = error instanceof Error ? error.message : "تعذر اختبار الاتصال";
    }

    const aiProvider = (
        cleanEnvValue("WASHA_DTF_IMAGE_PROVIDER")
        || cleanEnvValue("IMAGE_PROVIDER")
        || "genai"
    ).toLowerCase();
    const aiProviderKeyReady = aiProvider === "openai"
        ? hasEnv("OPENAI_API_KEY")
        : aiProvider === "replicate"
            ? hasEnv("REPLICATE_API_TOKEN")
            : ["genai", "gemini", "nanobanana"].includes(aiProvider)
                ? hasEnv("GEMINI_API_KEY") || hasEnv("GOOGLE_GENERATIVE_AI_API_KEY")
                : false;

    const items: IntegrationHealthItem[] = [
        item({
            id: "supabase",
            name: "Supabase",
            category: "قاعدة البيانات",
            summary: supabaseReachable ? "الاتصال بقاعدة البيانات يعمل." : "قاعدة البيانات تحتاج مراجعة فورية.",
            checks: [
                check("رابط المشروع", "NEXT_PUBLIC_SUPABASE_URL"),
                check("المفتاح العام", "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
                check("مفتاح Service Role", "SUPABASE_SERVICE_ROLE_KEY"),
                {
                    label: "اختبار القراءة",
                    ok: supabaseReachable,
                    required: true,
                    detail: supabaseLatencyDetail,
                },
            ],
            action: supabaseReachable
                ? "راقب زمن الاستجابة فقط."
                : "راجع مفاتيح Supabase واتصال قاعدة البيانات قبل تشغيل الطلبات.",
        }),
        item({
            id: "clerk",
            name: "Clerk",
            category: "الهوية والصلاحيات",
            summary: "تسجيل الدخول ومزامنة المستخدمين تعتمد على هذه القيم.",
            checks: [
                check("Publishable Key", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
                check("Secret Key", "CLERK_SECRET_KEY"),
                check("Webhook Signing Secret", "CLERK_WEBHOOK_SIGNING_SECRET", false),
            ],
            endpoints: [{ label: "Webhook المستخدمين", url: makeEndpoint("/api/webhooks/clerk") }],
            action: hasEnv("CLERK_WEBHOOK_SIGNING_SECRET")
                ? "تأكد أن Clerk يرسل أحداث المستخدمين إلى الرابط المعروض."
                : "اضبط توقيع Webhook حتى لا تتوقف مزامنة الحسابات.",
        }),
        item({
            id: "stripe",
            name: "Stripe",
            category: "الدفع",
            summary: "الدفع بالبطاقات عبر Stripe يحتاج المفتاحين وتوقيع الويبهوك.",
            checks: [
                check("Publishable Key", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
                check("Secret Key", "STRIPE_SECRET_KEY"),
                check("Webhook Secret", "STRIPE_WEBHOOK_SECRET", false),
            ],
            endpoints: [{ label: "Webhook الدفع", url: makeEndpoint("/api/webhooks/stripe") }],
            action: hasEnv("STRIPE_WEBHOOK_SECRET")
                ? "نفّذ اختبار دفع للتأكد من تحديث حالة الطلب."
                : "أضف Webhook Secret من لوحة Stripe قبل الاعتماد الكامل على الدفع.",
        }),
        item({
            id: "paylink",
            name: "Paylink",
            category: "الدفع",
            summary: "فواتير Paylink للعميل والمستودع تعتمد على API ID وSecret.",
            checks: [
                check("API ID", "PAYLINK_API_ID"),
                check("Secret Key", "PAYLINK_SECRET_KEY"),
                {
                    label: "رابط التطبيق العام",
                    ok: Boolean(appUrl),
                    required: true,
                    detail: appUrl,
                },
            ],
            endpoints: [
                { label: "Webhook Paylink", url: makeEndpoint("/api/webhooks/paylink") },
                { label: "عودة دفع المستودع", url: makeEndpoint("/dashboard/orders/command-center") },
            ],
            action: "اربط Webhook Paylink بالرابط المعروض، ثم اختبر فاتورة طلب وفاتورة مستودع.",
        }),
        item({
            id: "torod",
            name: "Torod",
            category: "الشحن",
            summary: "حجز الشحنات وتتبعها يتطلب اعتماد طرود وبيانات المستودع.",
            checks: [
                check("Client ID", "TOROD_CLIENT_ID"),
                check("Client Secret", "TOROD_CLIENT_SECRET"),
                check("API URL", "TOROD_API_URL"),
                check("Warehouse", "TOROD_WAREHOUSE", false),
                check("Courier Partner", "TOROD_COURIER_PARTNER_ID", false),
                check("Webhook Secret", "TOROD_WEBHOOK_SECRET", false),
            ],
            endpoints: [{ label: "Webhook الشحن", url: makeEndpoint("/api/webhooks/torod") }],
            action: "اضبط المستودع وشركة الشحن الافتراضية ثم جرّب حجز شحنة من مركز الطلبات.",
        }),
        item({
            id: "washa-ai",
            name: "WASHA AI",
            category: "التصميم والذكاء",
            summary: `المزوّد الحالي: ${aiProvider}`,
            checks: [
                {
                    label: "مزوّد الصور",
                    ok: ["openai", "replicate", "genai", "gemini", "nanobanana"].includes(aiProvider),
                    required: true,
                    detail: aiProvider,
                },
                {
                    label: "مفتاح المزوّد الحالي",
                    ok: aiProviderKeyReady,
                    required: true,
                    detail: aiProviderKeyReady ? "مضبوط" : "مفتاح المزوّد غير مكتمل",
                },
                check("OpenAI", "OPENAI_API_KEY", false),
                check("Gemini", "GEMINI_API_KEY", false),
                check("Replicate", "REPLICATE_API_TOKEN", false),
            ],
            action: aiProviderKeyReady
                ? "اختبر توليد تصميم من صفحة الاستوديو."
                : "اضبط مفتاح المزوّد المحدد أو غيّر WASHA_DTF_IMAGE_PROVIDER.",
        }),
        item({
            id: "messages",
            name: "البريد والتنبيهات",
            category: "التواصل",
            summary: "رسائل البريد والبوش مسؤولة عن إشعارات الطلبات والدعم.",
            checks: [
                check("Resend API", "RESEND_API_KEY", false),
                check("مرسل البريد", "EMAIL_FROM", false, cleanEnvValue("EMAIL_FROM") || "الافتراضي: info@washa.shop"),
                check("VAPID Public", "VAPID_PUBLIC_KEY", false),
                check("VAPID Private", "VAPID_PRIVATE_KEY", false),
                check("VAPID Public للواجهة", "NEXT_PUBLIC_VAPID_PUBLIC_KEY", false),
            ],
            action: "فعّل Resend وVAPID قبل تشغيل تنبيهات الإنتاج على نطاق واسع.",
        }),
    ];

    const totals = items.reduce<Record<IntegrationHealthStatus, number>>(
        (acc, integration) => {
            acc[integration.status] += 1;
            return acc;
        },
        { ready: 0, warning: 0, missing: 0 }
    );

    return {
        generatedAt: new Date().toISOString(),
        appUrl,
        environment: process.env.NODE_ENV || "development",
        totals,
        items,
    };
}
