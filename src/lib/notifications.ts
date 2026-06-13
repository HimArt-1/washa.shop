export type AdminNotificationChannel = "telegram" | "discord";

export type AdminNotificationSendResult = {
    channel: AdminNotificationChannel;
    ok: boolean;
    status?: number;
    statusText?: string;
    error?: string;
};

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

/**
 * Sends a notification message to the configured admin channels (Telegram / Discord).
 * Silently fails if not configured or if the API request fails, to avoid breaking user flows.
 */
export async function sendAdminNotification(message: string): Promise<AdminNotificationSendResult[]> {
    try {
        const requests: Array<{
            channel: AdminNotificationChannel;
            promise: Promise<Response>;
        }> = [];

        // 1. Telegram
        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        const telegramChatId = process.env.TELEGRAM_CHAT_ID;
        if (telegramToken && telegramChatId) {
            const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
            requests.push({
                channel: "telegram",
                promise: fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: telegramChatId,
                        text: message,
                        parse_mode: "HTML",
                    }),
                }),
            });
        }

        // 2. Discord
        const discordUrl = process.env.DISCORD_WEBHOOK_URL;
        if (discordUrl) {
            requests.push({
                channel: "discord",
                promise: fetch(discordUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        content: message.replace(/<\/?b>/g, "**"),
                    }),
                }),
            });
        }

        // Wait for all enabled notifications to send
        if (requests.length === 0) {
            return [];
        }

        const results = await Promise.allSettled(requests.map((request) => request.promise));
        return results.map((result, index) => {
            const channel = requests[index]?.channel ?? "telegram";

            if (result.status === "rejected") {
                console.error("Admin notification request failed:", result.reason);
                return {
                    channel,
                    ok: false,
                    error: result.reason instanceof Error ? result.reason.message : String(result.reason),
                };
            }

            if (!result.value.ok) {
                console.error("Admin notification channel returned error:", result.value.status, result.value.statusText);
            }

            return {
                channel,
                ok: result.value.ok,
                status: result.value.status,
                statusText: result.value.statusText,
            };
        });
    } catch (error) {
        console.error("Failed to send admin notification:", error);
        return [{
            channel: "telegram",
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        }];
    }
}
