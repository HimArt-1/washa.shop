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
export async function sendAdminNotification(message: string) {
    try {
        const promises: Promise<Response>[] = [];

        // 1. Telegram
        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        const telegramChatId = process.env.TELEGRAM_CHAT_ID;
        if (telegramToken && telegramChatId) {
            const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
            promises.push(
                fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: telegramChatId,
                        text: message,
                        parse_mode: "HTML",
                    }),
                })
            );
        }

        // 2. Discord
        const discordUrl = process.env.DISCORD_WEBHOOK_URL;
        if (discordUrl) {
            promises.push(
                fetch(discordUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        content: message.replace(/<\/?b>/g, "**"),
                    }),
                })
            );
        }

        // Wait for all enabled notifications to send
        if (promises.length > 0) {
            const results = await Promise.allSettled(promises);
            for (const result of results) {
                if (result.status === "rejected") {
                    console.error("Admin notification request failed:", result.reason);
                    continue;
                }

                if (!result.value.ok) {
                    console.error("Admin notification channel returned error:", result.value.status, result.value.statusText);
                }
            }
        }
    } catch (error) {
        console.error("Failed to send admin notification:", error);
    }
}
