

/**
 * Sends a notification message to the configured admin channels (Telegram / Discord).
 * Silently fails if not configured or if the API request fails, to avoid breaking user flows.
 */
export async function sendAdminNotification(message: string) {
    try {
        const promises: Promise<any>[] = [];

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
                        content: message,
                    }),
                })
            );
        }

        // Wait for all enabled notifications to send
        if (promises.length > 0) {
            await Promise.allSettled(promises);
        }
    } catch (error) {
        console.error("Failed to send admin notification:", error);
    }
}
