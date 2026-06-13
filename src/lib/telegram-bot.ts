export type TelegramBotCommand = {
    command: string;
    description: string;
};

export type TelegramInlineKeyboardButton = {
    text: string;
    url?: string;
    callback_data?: string;
};

export type TelegramReplyMarkup = {
    inline_keyboard: TelegramInlineKeyboardButton[][];
};

export type TelegramApiCallResult = {
    ok: boolean;
    status?: number;
    statusText?: string;
    error?: string;
    description?: string;
};

export type TelegramBotDiagnostics = {
    tokenConfigured: boolean;
    chatConfigured: boolean;
    webhookSecretConfigured: boolean;
    adminUsersConfigured: boolean;
    adminUserCount: number;
    appUrl: string;
    webhookUrl: string;
    appUrlIsPublicHttps: boolean;
    commandCount: number;
    readyForCommands: boolean;
    warnings: string[];
};

const LOCAL_HOST_PATTERN = /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?/i;

function cleanEnvValue(name: string) {
    const value = process.env[name]?.trim();
    if (!value) return "";
    if (value.startsWith("#")) return "";
    if (value.includes("xxxx") || value.includes("yourdomain.com")) return "";
    if (value.includes("←")) return "";
    return value;
}

function normalizeAppUrl(value: string) {
    const trimmed = value.trim().replace(/\/+$/, "");
    if (!trimmed) return "https://washa.shop";
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function getTelegramAppUrl() {
    const vercelUrl = cleanEnvValue("VERCEL_URL");
    return normalizeAppUrl(
        cleanEnvValue("NEXT_PUBLIC_APP_URL")
        || cleanEnvValue("NEXT_PUBLIC_BASE_URL")
        || (vercelUrl ? `https://${vercelUrl}` : "")
        || "https://washa.shop"
    );
}

export function getTelegramWebhookUrl() {
    return `${getTelegramAppUrl()}/api/telegram/webhook`;
}

export function getTelegramAdminUserIds() {
    const raw = cleanEnvValue("TELEGRAM_ADMIN_USER_IDS") || cleanEnvValue("TELEGRAM_ALLOWED_USER_IDS");
    if (!raw) return [];

    return Array.from(new Set(
        raw
            .split(/[,\s]+/)
            .map((value) => value.trim())
            .filter(Boolean)
    ));
}

export function getTelegramBotConfig() {
    const token = cleanEnvValue("TELEGRAM_BOT_TOKEN");
    const chatId = cleanEnvValue("TELEGRAM_CHAT_ID");
    const webhookSecret = cleanEnvValue("TELEGRAM_WEBHOOK_SECRET");
    const adminUserIds = getTelegramAdminUserIds();
    const appUrl = getTelegramAppUrl();
    const webhookUrl = getTelegramWebhookUrl();
    const appUrlIsPublicHttps = appUrl.startsWith("https://") && !LOCAL_HOST_PATTERN.test(appUrl);

    return {
        token,
        chatId,
        webhookSecret,
        adminUserIds,
        appUrl,
        webhookUrl,
        appUrlIsPublicHttps,
        configured: Boolean(token && chatId),
    };
}

export function getTelegramBotDiagnostics(commandCount = 0): TelegramBotDiagnostics {
    const config = getTelegramBotConfig();
    const warnings: string[] = [];

    if (!config.token) warnings.push("TELEGRAM_BOT_TOKEN غير مضبوط.");
    if (!config.chatId) warnings.push("TELEGRAM_CHAT_ID غير مضبوط.");
    if (!config.webhookSecret) warnings.push("TELEGRAM_WEBHOOK_SECRET غير مضبوط لحماية webhook.");
    if (config.adminUserIds.length === 0) warnings.push("TELEGRAM_ADMIN_USER_IDS غير مضبوط لتقييد أوامر البوت على مشرفين محددين.");
    if (!config.appUrlIsPublicHttps) warnings.push("رابط التطبيق يجب أن يكون HTTPS عام حتى يستقبل Telegram webhook.");

    return {
        tokenConfigured: Boolean(config.token),
        chatConfigured: Boolean(config.chatId),
        webhookSecretConfigured: Boolean(config.webhookSecret),
        adminUsersConfigured: config.adminUserIds.length > 0,
        adminUserCount: config.adminUserIds.length,
        appUrl: config.appUrl,
        webhookUrl: config.webhookUrl,
        appUrlIsPublicHttps: config.appUrlIsPublicHttps,
        commandCount,
        readyForCommands: Boolean(
            config.token
            && config.chatId
            && config.webhookSecret
            && config.appUrlIsPublicHttps
            && config.adminUserIds.length > 0
        ),
        warnings,
    };
}

async function callTelegramApi(
    method: string,
    body: Record<string, unknown>
): Promise<TelegramApiCallResult> {
    const { token } = getTelegramBotConfig();
    if (!token) {
        return { ok: false, error: "TELEGRAM_BOT_TOKEN is not configured" };
    }

    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        let payload: any = null;

        try {
            payload = await response.json();
        } catch {
            payload = null;
        }

        if (!response.ok || payload?.ok === false) {
            return {
                ok: false,
                status: response.status,
                statusText: response.statusText,
                description: payload?.description ? String(payload.description) : undefined,
                error: payload?.description ? String(payload.description) : response.statusText,
            };
        }

        return {
            ok: true,
            status: response.status,
            statusText: response.statusText,
            description: payload?.description ? String(payload.description) : undefined,
        };
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

export async function sendTelegramMessage(params: {
    chatId?: string | number;
    text: string;
    parseMode?: "HTML" | "MarkdownV2";
    replyMarkup?: TelegramReplyMarkup;
    disableWebPagePreview?: boolean;
}) {
    const config = getTelegramBotConfig();
    const chatId = params.chatId != null ? String(params.chatId) : config.chatId;

    if (!chatId) {
        return { ok: false, error: "TELEGRAM_CHAT_ID is not configured" };
    }

    return callTelegramApi("sendMessage", {
        chat_id: chatId,
        text: params.text.slice(0, 4096),
        parse_mode: params.parseMode ?? "HTML",
        disable_web_page_preview: params.disableWebPagePreview ?? true,
        ...(params.replyMarkup ? { reply_markup: params.replyMarkup } : {}),
    });
}

export async function syncTelegramBotCommands(commands: TelegramBotCommand[]) {
    return callTelegramApi("setMyCommands", {
        commands: commands.slice(0, 100).map((item) => ({
            command: item.command,
            description: item.description.slice(0, 256),
        })),
    });
}

export async function setTelegramWebhook() {
    const config = getTelegramBotConfig();
    if (!config.appUrlIsPublicHttps) {
        return {
            ok: false,
            error: "Telegram webhook requires a public HTTPS app URL",
        };
    }
    if (!config.webhookSecret) {
        return {
            ok: false,
            error: "TELEGRAM_WEBHOOK_SECRET is required before enabling the webhook",
        };
    }

    return callTelegramApi("setWebhook", {
        url: config.webhookUrl,
        secret_token: config.webhookSecret,
        allowed_updates: ["message", "edited_message", "callback_query"],
        drop_pending_updates: false,
    });
}
