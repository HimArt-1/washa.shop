export type AdminNotificationChannel = "telegram" | "discord";

export type AdminNotificationSendResult = {
    channel: AdminNotificationChannel;
    ok: boolean;
    status?: number;
    statusText?: string;
    error?: string;
};

export function requireAdminNotificationDelivery(results: AdminNotificationSendResult[]) {
    if (results.length === 0 || results.some((result) => result.ok)) return;
    throw new Error("All configured admin notification channels failed");
}

export function escapeAdminNotificationHtml(value: unknown): string {
    return String(value ?? "—")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function getAdminNotificationBotStatus() {
    return {
        telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
        discord: Boolean(process.env.DISCORD_WEBHOOK_URL),
    };
}

export function getConfiguredAdminNotificationChannels(): AdminNotificationChannel[] {
    const status = getAdminNotificationBotStatus();
    return (["telegram", "discord"] as const).filter((channel) => status[channel]);
}

export async function sendAdminNotificationChannel(
    channel: AdminNotificationChannel,
    message: string
): Promise<AdminNotificationSendResult> {
    try {
        if (channel === "telegram") {
            const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
            const telegramChatId = process.env.TELEGRAM_CHAT_ID;
            if (!telegramToken || !telegramChatId) {
                return { channel, ok: false, error: "telegram_not_configured" };
            }
            const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: telegramChatId,
                    text: message,
                    parse_mode: "HTML",
                }),
            });
            return {
                channel,
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
            };
        }

        const discordUrl = process.env.DISCORD_WEBHOOK_URL;
        if (!discordUrl) return { channel, ok: false, error: "discord_not_configured" };
        const response = await fetch(discordUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: message.replace(/<\/?b>/g, "**") }),
        });
        return {
            channel,
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
        };
    } catch (error) {
        console.error(`Admin notification ${channel} request failed:`, error);
        return {
            channel,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Sends a notification message to the configured admin channels (Telegram / Discord).
 * Silently fails if not configured or if the API request fails, to avoid breaking user flows.
 */
export async function sendAdminNotification(message: string): Promise<AdminNotificationSendResult[]> {
    try {
        const channels = getConfiguredAdminNotificationChannels();
        return Promise.all(channels.map((channel) => sendAdminNotificationChannel(channel, message)));
    } catch (error) {
        console.error("Failed to send admin notification:", error);
        return [{
            channel: "telegram",
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        }];
    }
}

export async function sendAdminNotificationReliably(message: string) {
    const results = await sendAdminNotification(message);
    requireAdminNotificationDelivery(results);
    return results;
}
