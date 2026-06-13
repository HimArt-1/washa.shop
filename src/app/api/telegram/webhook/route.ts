import { NextRequest, NextResponse } from "next/server";
import { reportAdminOperationalAlert } from "@/lib/admin-operational-alerts";
import { getSupabaseAdminClient } from "@/lib/supabase";
import {
    getTelegramBotConfig,
    getTelegramBotDiagnostics,
    sendTelegramMessage,
} from "@/lib/telegram-bot";
import {
    getTelegramCommandList,
    getTelegramUpdateEnvelope,
    processTelegramUpdate,
    type TelegramUpdate,
} from "@/lib/telegram-command-center";

export const dynamic = "force-dynamic";

function isSecretValid(req: NextRequest) {
    const { webhookSecret } = getTelegramBotConfig();
    if (!webhookSecret) return true;
    return req.headers.get("x-telegram-bot-api-secret-token") === webhookSecret;
}

async function logRejectedUpdate(params: {
    reason: string;
    update: TelegramUpdate | null;
    severity?: "info" | "warning";
}) {
    try {
        const envelope = params.update ? getTelegramUpdateEnvelope(params.update) : null;
        const supabase = getSupabaseAdminClient() as any;
        await supabase.from("system_logs").insert({
            type: params.severity === "warning" ? "security" : "info",
            source: "telegram.webhook",
            message: `Telegram webhook rejected: ${params.reason}`,
            stack: null,
            user_id: null,
            metadata: {
                reason: params.reason,
                chat_id: envelope?.chatId ?? null,
                chat_type: envelope?.chatType ?? null,
                from_id: envelope?.fromId ?? null,
                from_name: envelope?.fromName ?? null,
                update_id: params.update?.update_id ?? null,
            },
        });
    } catch {
        // Rejected Telegram updates should not create retry loops because logging failed.
    }
}

async function rejectInsideAllowedChat(update: TelegramUpdate, message: string) {
    const envelope = getTelegramUpdateEnvelope(update);
    if (!envelope.chatId) return;

    await sendTelegramMessage({
        chatId: envelope.chatId,
        text: message,
        disableWebPagePreview: true,
    });
}

function authorizeTelegramUpdate(update: TelegramUpdate) {
    const config = getTelegramBotConfig();
    const envelope = getTelegramUpdateEnvelope(update);

    if (!config.token || !config.chatId) {
        return { ok: false as const, reason: "telegram_not_configured", envelope };
    }

    if (!envelope.chatId || envelope.chatId !== config.chatId) {
        return { ok: false as const, reason: "chat_not_allowed", envelope };
    }

    if (config.adminUserIds.length > 0 && (!envelope.fromId || !config.adminUserIds.includes(envelope.fromId))) {
        return { ok: false as const, reason: "user_not_allowed", envelope };
    }

    return { ok: true as const, envelope };
}

export async function GET() {
    const commands = getTelegramCommandList();
    return NextResponse.json({
        ok: true,
        service: "washa-telegram-command-center",
        diagnostics: getTelegramBotDiagnostics(commands.length),
        commands: commands.map((item) => item.command),
    });
}

export async function POST(req: NextRequest) {
    if (!isSecretValid(req)) {
        await reportAdminOperationalAlert({
            dispatchKey: "telegram_webhook:invalid_secret",
            bucketMs: 30 * 60 * 1000,
            category: "security",
            severity: "warning",
            title: "رفض Telegram webhook بسبب سر غير صحيح",
            message: "وصل طلب إلى Telegram webhook بترويسة سر غير مطابقة. راجع إعدادات webhook أو مصدر الطلب.",
            source: "telegram.webhook.security",
            link: "/dashboard/integrations",
        });
        return NextResponse.json({ ok: false, error: "Invalid webhook secret" }, { status: 401 });
    }

    let update: TelegramUpdate | null = null;

    try {
        update = await req.json();
    } catch {
        await logRejectedUpdate({ reason: "invalid_json", update: null, severity: "warning" });
        return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    if (!update) {
        await logRejectedUpdate({ reason: "empty_update", update: null, severity: "warning" });
        return NextResponse.json({ ok: false, error: "Empty update" }, { status: 400 });
    }

    const auth = authorizeTelegramUpdate(update);
    if (!auth.ok) {
        await logRejectedUpdate({ reason: auth.reason, update, severity: "warning" });

        if (auth.reason === "user_not_allowed") {
            await rejectInsideAllowedChat(update, "هذا الأمر متاح فقط لمشرفي وشّى المصرّح لهم.");
        }

        return NextResponse.json({ ok: true, ignored: true, reason: auth.reason });
    }

    try {
        const result = await processTelegramUpdate(update);
        return NextResponse.json({ ok: true, ...result });
    } catch (error) {
        await reportAdminOperationalAlert({
            dispatchKey: `telegram_webhook:command_failed:${update.update_id ?? "unknown"}`,
            bucketMs: 15 * 60 * 1000,
            category: "system",
            severity: "warning",
            title: "فشل تنفيذ أمر Telegram",
            message: "تعذر تنفيذ أمر وارد إلى بوت وشّى التشغيلي. راجع سجل النظام لمعرفة التفاصيل.",
            source: "telegram.webhook.command",
            link: "/dashboard/integrations",
            metadata: {
                update_id: update.update_id ?? null,
                error: error instanceof Error ? error.message : String(error),
            },
            stack: error instanceof Error ? error.stack : null,
        });

        return NextResponse.json({ ok: false, error: "Command failed" }, { status: 200 });
    }
}
