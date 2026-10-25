export class TelegramService {
  /**
   * Broadcasts urgent deal alert to a Telegram channel
   */
  static async broadcastDeal(
    botToken: string,
    channelId: string,
    message: string,
    imageUrl?: string
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    if (!botToken || !channelId) {
      return { success: false, error: 'Missing Telegram Bot Token or Channel ID' };
    }

    const cleanChannelId = channelId.startsWith('@') ? channelId : `@${channelId}`;

    try {
      if (imageUrl) {
        // Send with Photo banner
        const endpoint = `https://api.telegram.org/bot${botToken}/sendPhoto`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cleanChannelId,
            photo: imageUrl,
            caption: message,
            parse_mode: 'Markdown',
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          return { success: false, error: data.description || 'Failed to send photo alert' };
        }
        return { success: true, messageId: data.result.message_id };
      } else {
        // Text-only fallback
        const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cleanChannelId,
            text: message,
            parse_mode: 'Markdown',
            disable_web_page_preview: false,
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          return { success: false, error: data.description || 'Failed to send text alert' };
        }
        return { success: true, messageId: data.result.message_id };
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error broadcasting to Telegram' };
    }
  }
}