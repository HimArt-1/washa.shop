"use server";

import { revalidatePath } from "next/cache";
import { unstable_noStore as noStore } from "next/cache";
import { reportAdminOperationalAlert } from "@/lib/admin-operational-alerts";
import { getCurrentUserOrDevAdmin, resolveAdminAccess } from "@/lib/admin-access";
import {
    getAdminNotificationBotStatus,
    type AdminNotificationSendResult,
} from "@/lib/notifications";
import {
    getTelegramBotConfig,
    getTelegramBotDiagnostics,
    setTelegramWebhook,
    syncTelegramBotCommands,
    type TelegramApiCallResult,
    type TelegramBotDiagnostics,
} from "@/lib/telegram-bot";
import { getTelegramCommandList } from "@/lib/telegram-command-center";
import { getWashaDtfGenerationReadiness } from "@/lib/washa-dtf-generation-readiness";
import { resolveWashaDtfProviderConfiguration } from "@/lib/washa-dtf-provider-config";
import { getPaymentReadiness } from "@/lib/payment-readiness";

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
    adminAlerts: AdminAlertDiagnostics;
    telegramCommandCenter: TelegramBotDiagnostics;
};

export type AdminAlertDiagnostics = {
    channels: Array<{
        id: "telegram" | "discord";
        label: string;
        configured: boolean;
        detail: string;
    }>;
    lastNotification: {
        title: string;
        category: string;
        severity: string;
        createdAt: string;
    } | null;
    lastWebhookDispatch: {
        eventType: string;
        status: string;
        updatedAt: string;
        sentAt: string | null;
        lastError: string | null;
    } | null;
};

export type AdminAlertTestResult = {
    ok: boolean;
    message: string;
    generatedAt: string;
    configuredChannels: Array<"telegram" | "discord">;
    channelResults: AdminNotificationSendResult[];
    notificationSkipped: boolean;
    webhookSkipped: boolean;
};

export type TelegramBotSetupSyncResult = {
    ok: boolean;
    message: string;
    generatedAt: string;
    commandsCount: number;
    webhookUrl: string;
    commands: TelegramApiCallResult;
    webhook: TelegramApiCallResult & { skipped?: boolean };
    warnings: string[];
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

    return {
        supabase: access.supabase,
        profile: access.profile,
        isAdmin: access.isAdmin,
        bootstrapped: access.bootstrapped,
        user,
    };
}

async function getAdminAlertDiagnostics(supabase: any): Promise<AdminAlertDiagnostics> {
    const botStatus = getAdminNotificationBotStatus();
    const channels: AdminAlertDiagnostics["channels"] = [
        {
            id: "telegram",
            label: "Telegram",
            configured: botStatus.telegram,
            detail: botStatus.telegram ? "مضبوط" : "TELEGRAM_BOT_TOKEN و TELEGRAM_CHAT_ID غير مكتملين",
        },
        {
            id: "discord",
            label: "Discord",
            configured: botStatus.discord,
            detail: botStatus.discord ? "مضبوط" : "DISCORD_WEBHOOK_URL غير مضبوط",
        },
    ];

    const [lastNotificationResult, lastWebhookDispatchResult] = await Promise.allSettled([
        supabase
            .from("admin_notifications")
            .select("title, category, severity, created_at")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        supabase
            .from("event_dispatches")
            .select("event_type, status, updated_at, sent_at, last_error")
            .eq("channel", "webhook_admin")
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
    ]);

    const lastNotificationData =
        lastNotificationResult.status === "fulfilled" && !lastNotificationResult.value.error
            ? lastNotificationResult.value.data
            : null;
    const lastWebhookDispatchData =
        lastWebhookDispatchResult.status === "fulfilled" && !lastWebhookDispatchResult.value.error
            ? lastWebhookDispatchResult.value.data
            : null;

    return {
        channels,
        lastNotification: lastNotificationData
            ? {
                title: String(lastNotificationData.title || "تنبيه"),
                category: String(lastNotificationData.category || "system"),
                severity: String(lastNotificationData.severity || "info"),
                createdAt: String(lastNotificationData.created_at),
            }
            : null,
        lastWebhookDispatch: lastWebhookDispatchData
            ? {
                eventType: String(lastWebhookDispatchData.event_type || "webhook_admin"),
                status: String(lastWebhookDispatchData.status || "unknown"),
                updatedAt: String(lastWebhookDispatchData.updated_at),
                sentAt: lastWebhookDispatchData.sent_at ? String(lastWebhookDispatchData.sent_at) : null,
                lastError: lastWebhookDispatchData.last_error ? String(lastWebhookDispatchData.last_error) : null,
            }
            : null,
    };
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

    const aiProviderConfiguration = resolveWashaDtfProviderConfiguration();
    const aiProvider = aiProviderConfiguration.provider;
    const aiProviderKeyReady = aiProviderConfiguration.credentialConfigured;
    const aiGenerationReadiness = getWashaDtfGenerationReadiness();
    const paymentReadiness = getPaymentReadiness();
    const telegramCommands = getTelegramCommandList();
    const telegramCommandCenter = getTelegramBotDiagnostics(telegramCommands.length);
    const telegramBotReady = hasEnv("TELEGRAM_BOT_TOKEN") && hasEnv("TELEGRAM_CHAT_ID");
    const discordBotReady = hasEnv("DISCORD_WEBHOOK_URL");
    const adminBotChannels = [
        telegramBotReady ? "Telegram" : null,
        discordBotReady ? "Discord" : null,
    ].filter(Boolean).join(" + ");

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
            summary: aiGenerationReadiness.enabled
                ? `المزوّد الحالي جاهز إعدادياً: ${aiProvider}:${aiProviderConfiguration.model}`
                : aiGenerationReadiness.message,
            checks: [
                {
                    label: "بوابة التوليد الإنتاجية",
                    ok: aiGenerationReadiness.enabled,
                    required: true,
                    detail: aiGenerationReadiness.code,
                },
                {
                    label: "مزوّد الصور",
                    ok: aiProvider !== "unsupported",
                    required: true,
                    detail: `${aiProvider}:${aiProviderConfiguration.model}`,
                },
                {
                    label: "مفتاح المزوّد الحالي",
                    ok: aiProviderKeyReady,
                    required: true,
                    detail: aiProviderKeyReady ? "مضبوط" : "مفتاح المزوّد غير مكتمل",
                },
                {
                    label: "الانتقال الاحتياطي",
                    ok: true,
                    required: false,
                    detail: aiProviderConfiguration.fallbackEnabled ? "مفعّل" : "متوقف",
                },
                check("OpenAI", "OPENAI_API_KEY", false),
                check("Gemini", "GEMINI_API_KEY", false),
                check("Replicate", "REPLICATE_API_TOKEN", false),
            ],
            action: aiGenerationReadiness.enabled
                ? "نفّذ توليداً حقيقياً وتحقق من الحصة قبل اعتماد الجاهزية النهائية."
                : "أكمل إعداد المزوّد ثم اضبط WASHA_DTF_GENERATION_ENABLED=true بعد نجاح اختبار فعلي.",
        }),
        item({
            id: "checkout-payments",
            name: "وسائل الدفع العامة",
            category: "الدفع",
            summary: paymentReadiness.checkoutEnabled
                ? "توجد وسيلة دفع عامة جاهزة إعدادياً."
                : "لا توجد وسيلة دفع عامة مكتملة الإعداد.",
            checks: [
                {
                    label: "التحويل البنكي",
                    ok: paymentReadiness.bankTransfer.enabled,
                    required: false,
                    detail: paymentReadiness.bankTransfer.message,
                },
                {
                    label: "Tap Checkout",
                    ok: paymentReadiness.tap.enabled,
                    required: false,
                    detail: paymentReadiness.tap.message,
                },
                {
                    label: "وسيلة عامة واحدة على الأقل",
                    ok: paymentReadiness.checkoutEnabled,
                    required: true,
                    detail: paymentReadiness.checkoutEnabled ? "متاحة" : "غير متاحة",
                },
            ],
            endpoints: [
                { label: "Tap Webhook", url: makeEndpoint("/api/webhooks/tap") },
                { label: "Tap Return", url: makeEndpoint("/checkout") },
            ],
            action: paymentReadiness.checkoutEnabled
                ? "اختبر الوسيلة المتاحة من إنشاء الطلب حتى تأكيد الدفعة."
                : "أكمل بيانات التحويل البنكي أو فعّل Tap بعد اختبار Sandbox.",
        }),
        item({
            id: "messages",
            name: "البريد والتنبيهات",
            category: "التواصل",
            summary: adminBotChannels
                ? `رسائل البريد والبوش وبوت الأدمن تعمل عبر ${adminBotChannels}.`
                : "رسائل البريد والبوش تعمل، وبوت الأدمن يحتاج تفعيل قناة Telegram أو Discord.",
            checks: [
                check("Resend API", "RESEND_API_KEY", false),
                check("مرسل البريد", "EMAIL_FROM", false, cleanEnvValue("EMAIL_FROM") || "الافتراضي: info@washa.shop"),
                check("VAPID Public", "VAPID_PUBLIC_KEY", false),
                check("VAPID Private", "VAPID_PRIVATE_KEY", false),
                check("VAPID Public للواجهة", "NEXT_PUBLIC_VAPID_PUBLIC_KEY", false),
                {
                    label: "بوت تنبيهات الأدمن",
                    ok: Boolean(adminBotChannels),
                    required: false,
                    detail: adminBotChannels || "اضبط Telegram أو Discord",
                },
            ],
            action: adminBotChannels
                ? "اختبر حدث طلب جديد وتأكد من وصول التنبيه إلى قناة الأدمن."
                : "فعّل Telegram أو Discord مع Resend وVAPID قبل تشغيل تنبيهات الإنتاج على نطاق واسع.",
        }),
        item({
            id: "telegram-command-center",
            name: "بوت أوامر Telegram",
            category: "التشغيل والتنبيهات",
            summary: telegramCommandCenter.readyForCommands
                ? `بوت الأوامر جاهز مع ${telegramCommandCenter.commandCount} أمراً تشغيلياً.`
                : "بوت الأوامر يحتاج ضبط webhook والصلاحيات قبل الاعتماد عليه.",
            checks: [
                {
                    label: "Bot Token",
                    ok: telegramCommandCenter.tokenConfigured,
                    required: true,
                    detail: telegramCommandCenter.tokenConfigured ? "مضبوط" : "TELEGRAM_BOT_TOKEN غير مضبوط",
                },
                {
                    label: "Chat ID",
                    ok: telegramCommandCenter.chatConfigured,
                    required: true,
                    detail: telegramCommandCenter.chatConfigured ? "مضبوط" : "TELEGRAM_CHAT_ID غير مضبوط",
                },
                {
                    label: "Webhook Secret",
                    ok: telegramCommandCenter.webhookSecretConfigured,
                    required: true,
                    detail: telegramCommandCenter.webhookSecretConfigured ? "مضبوط" : "TELEGRAM_WEBHOOK_SECRET غير مضبوط",
                },
                {
                    label: "مشرفو Telegram",
                    ok: telegramCommandCenter.adminUsersConfigured,
                    required: true,
                    detail: telegramCommandCenter.adminUsersConfigured
                        ? `${telegramCommandCenter.adminUserCount} مشرف مصرح`
                        : "TELEGRAM_ADMIN_USER_IDS غير مضبوط",
                },
                {
                    label: "رابط HTTPS عام",
                    ok: telegramCommandCenter.appUrlIsPublicHttps,
                    required: true,
                    detail: telegramCommandCenter.appUrl,
                },
                {
                    label: "الأوامر",
                    ok: telegramCommandCenter.commandCount > 0,
                    required: true,
                    detail: `${telegramCommandCenter.commandCount} أمر`,
                },
            ],
            endpoints: [{ label: "Telegram Webhook", url: telegramCommandCenter.webhookUrl }],
            action: telegramCommandCenter.readyForCommands
                ? "زامن أوامر البوت من لوحة التكاملات ثم اختبر /status داخل مجموعة Telegram."
                : "أكمل متغيرات TELEGRAM_WEBHOOK_SECRET وTELEGRAM_ADMIN_USER_IDS وتأكد من رابط HTTPS عام قبل تفعيل webhook.",
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
        adminAlerts: await getAdminAlertDiagnostics(supabase),
        telegramCommandCenter,
    };
}

export async function syncTelegramBotSetup(): Promise<TelegramBotSetupSyncResult> {
    noStore();

    await requireIntegrationAccess();

    const generatedAt = new Date().toISOString();
    const commands = getTelegramCommandList();
    const config = getTelegramBotConfig();
    const warnings: string[] = [];

    if (!config.token) {
        return {
            ok: false,
            message: "لا يمكن مزامنة بوت Telegram لأن TELEGRAM_BOT_TOKEN غير مضبوط.",
            generatedAt,
            commandsCount: commands.length,
            webhookUrl: config.webhookUrl,
            commands: { ok: false, error: "TELEGRAM_BOT_TOKEN is not configured" },
            webhook: { ok: false, skipped: true, error: "Skipped because bot token is missing" },
            warnings,
        };
    }

    if (!config.chatId) warnings.push("TELEGRAM_CHAT_ID غير مضبوط؛ التنبيهات والأوامر لن تكتمل بدون محادثة مستهدفة.");
    if (!config.webhookSecret) warnings.push("TELEGRAM_WEBHOOK_SECRET غير مضبوط؛ تم تخطي تفعيل webhook.");
    if (config.adminUserIds.length === 0) warnings.push("TELEGRAM_ADMIN_USER_IDS غير مضبوط؛ يفضّل تقييد الأوامر على مشرفين محددين.");
    if (!config.appUrlIsPublicHttps) warnings.push("رابط التطبيق ليس HTTPS عاماً؛ تم تخطي تفعيل webhook.");

    const commandsResult = await syncTelegramBotCommands(commands);
    const webhookResult: TelegramBotSetupSyncResult["webhook"] = config.webhookSecret && config.appUrlIsPublicHttps
        ? await setTelegramWebhook()
        : {
            ok: false,
            skipped: true,
            error: "Webhook skipped until TELEGRAM_WEBHOOK_SECRET and public HTTPS app URL are configured",
        };

    revalidatePath("/dashboard/integrations");

    const ok = commandsResult.ok && (webhookResult.ok || webhookResult.skipped === true);

    return {
        ok,
        message: ok
            ? webhookResult.skipped
                ? "تمت مزامنة قائمة الأوامر، وتم تخطي webhook حتى تكتمل إعداداته."
                : "تمت مزامنة أوامر البوت وتفعيل webhook بنجاح."
            : "تعذرت مزامنة إعدادات بوت Telegram بالكامل.",
        generatedAt,
        commandsCount: commands.length,
        webhookUrl: config.webhookUrl,
        commands: commandsResult,
        webhook: webhookResult,
        warnings,
    };
}

export async function sendAdminAlertTest(): Promise<AdminAlertTestResult> {
    noStore();

    const { user, profile } = await requireIntegrationAccess();
    const generatedAt = new Date().toISOString();
    const botStatus = getAdminNotificationBotStatus();
    const configuredChannels = [
        botStatus.telegram ? "telegram" as const : null,
        botStatus.discord ? "discord" as const : null,
    ].filter((channel): channel is "telegram" | "discord" => Boolean(channel));

    const alertResult = await reportAdminOperationalAlert({
        dispatchKey: `integrations:admin_alert_test:${user.id}:${Date.now()}`,
        type: "system_alert",
        category: "system",
        severity: "info",
        title: "اختبار تنبيهات الأدمن",
        message: "تم تنفيذ اختبار تنبيهات الأدمن من مركز حالة التكاملات.",
        source: "integrations.admin_alert_test",
        link: "/dashboard/integrations",
        resourceType: "integration",
        resourceId: "admin-alerts",
        metadata: {
            test: true,
            requested_by: user.id,
            requested_by_profile_id: profile.id,
            configured_channels: configuredChannels,
            generated_at: generatedAt,
        },
    });

    revalidatePath("/dashboard/integrations");
    revalidatePath("/dashboard/notifications");

    const channelResults = alertResult?.webhookChannels ?? [];
    const failedChannels = channelResults.filter((channel) => !channel.ok);
    const notificationSkipped = alertResult?.notification?.skipped === true;
    const webhookSkipped = Boolean(
        alertResult?.webhook?.length
        && alertResult.webhook.every((dispatch) => dispatch.skipped === true)
    );

    if (configuredChannels.length === 0) {
        return {
            ok: false,
            message: "تم إنشاء تنبيه داخلي، لكن لا توجد قناة Telegram أو Discord مفعلة.",
            generatedAt,
            configuredChannels,
            channelResults,
            notificationSkipped,
            webhookSkipped,
        };
    }

    if (channelResults.length === 0) {
        return {
            ok: false,
            message: "تم تسجيل التنبيه، لكن لم ترجع قناة خارجية نتيجة إرسال.",
            generatedAt,
            configuredChannels,
            channelResults,
            notificationSkipped,
            webhookSkipped,
        };
    }

    if (failedChannels.length > 0) {
        return {
            ok: false,
            message: "وصل الاختبار إلى مسار التنبيهات، لكن قناة أو أكثر فشلت في الإرسال.",
            generatedAt,
            configuredChannels,
            channelResults,
            notificationSkipped,
            webhookSkipped,
        };
    }

    return {
        ok: true,
        message: "تم إرسال اختبار تنبيهات الأدمن بنجاح.",
        generatedAt,
        configuredChannels,
        channelResults,
        notificationSkipped,
        webhookSkipped,
    };
}
