/**
 * Central Telegram notification helper.
 *
 * Each channel uses a SEPARATE BOT (own token + chat_id):
 *
 *   'appointments' →  TELEGRAM_BOT_TOKEN_APPOINTMENTS + TELEGRAM_CHAT_ID_APPOINTMENTS
 *   'messages'     →  TELEGRAM_BOT_TOKEN_MESSAGES     + TELEGRAM_CHAT_ID_MESSAGES
 *   'default'      →  TELEGRAM_BOT_TOKEN              + TELEGRAM_CHAT_ID
 *
 * Falls back to the original bot (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)
 * if the channel-specific env vars are not set.
 */

export type TelegramChannel = 'appointments' | 'messages' | 'default';

interface ChannelConfig {
    token: string | undefined;
    chatIds: string[];
}

function getChannelConfig(channel: TelegramChannel): ChannelConfig {
    switch (channel) {
        case 'appointments':
            return {
                token: process.env.TELEGRAM_BOT_TOKEN_APPOINTMENTS || process.env.TELEGRAM_BOT_TOKEN,
                chatIds: (
                    (process.env.TELEGRAM_CHAT_ID_APPOINTMENTS || process.env.TELEGRAM_CHAT_ID)
                        ?.split(',') || []
                ).map(id => id.trim()).filter(Boolean),
            };
        case 'messages':
            return {
                token: process.env.TELEGRAM_BOT_TOKEN_MESSAGES || process.env.TELEGRAM_BOT_TOKEN,
                chatIds: (
                    (process.env.TELEGRAM_CHAT_ID_MESSAGES || process.env.TELEGRAM_CHAT_ID)
                        ?.split(',') || []
                ).map(id => id.trim()).filter(Boolean),
            };
        default:
            return {
                token: process.env.TELEGRAM_BOT_TOKEN,
                chatIds: (process.env.TELEGRAM_CHAT_ID?.split(',') || [])
                    .map(id => id.trim()).filter(Boolean),
            };
    }
}

/**
 * Send a Telegram notification to the specified channel.
 *
 * @returns `true` if at least one message was sent successfully
 */
export async function sendTelegramNotification(
    message: string,
    channel: TelegramChannel = 'default'
): Promise<boolean> {
    const { token, chatIds } = getChannelConfig(channel);

    if (!token || chatIds.length === 0) return false;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    let sent = false;

    await Promise.all(chatIds.map(async (chatId) => {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML',
                }),
            });

            if (res.ok) {
                sent = true;
                console.log(`[Telegram:${channel}] Sent to ${chatId}`);
            } else {
                console.error(`[Telegram:${channel}] Error (${chatId}):`, await res.text());
            }
        } catch (e) {
            console.error(`[Telegram:${channel}] Failed (${chatId}):`, e);
        }
    }));

    return sent;
}
