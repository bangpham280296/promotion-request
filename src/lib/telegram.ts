const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

/**
 * Send a text message to a Telegram chat.
 * @param chatId  The target chat ID (number or string)
 * @param message The message text (supports HTML formatting)
 */
export async function sendTelegramMessage(
  chatId: string | number,
  message: string
): Promise<void> {
  const url = `${TELEGRAM_API}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
  }
}
