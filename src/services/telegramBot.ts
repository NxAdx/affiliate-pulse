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

  /**
   * Tests connection with Telegram Bot API and optionally checks channel admin rights
   */
  static async testConnection(
    botToken: string,
    channelId?: string
  ): Promise<{ success: boolean; botName?: string; message: string }> {
    if (!botToken || !botToken.trim()) {
      return { success: false, message: 'Please enter your Telegram Bot Token.' };
    }

    try {
      // 1. Validate Bot Token using getMe
      const meRes = await fetch(`https://api.telegram.org/bot${botToken.trim()}/getMe`);
      const meData = await meRes.json();

      if (!meData.ok) {
        if (meData.error_code === 404 || meData.error_code === 401) {
          return { success: false, message: 'Invalid Bot Token. Check token from @BotFather.' };
        }
        return { success: false, message: meData.description || 'Bot token validation failed.' };
      }

      const botUsername = meData.result?.username ? `@${meData.result.username}` : 'Bot';

      // 2. If Channel ID provided, verify bot can access the channel
      if (channelId && channelId.trim()) {
        const cleanChannelId = channelId.trim().startsWith('@') || channelId.trim().startsWith('-')
          ? channelId.trim()
          : `@${channelId.trim()}`;

        const chatRes = await fetch(
          `https://api.telegram.org/bot${botToken.trim()}/getChat?chat_id=${cleanChannelId}`
        );
        const chatData = await chatRes.json();

        if (!chatData.ok) {
          if (chatData.error_code === 400 || chatData.error_code === 403) {
            return {
              success: false,
              botName: botUsername,
              message: `${botUsername} is not an Admin in ${cleanChannelId}. Add ${botUsername} as an Administrator with "Post Messages" permission.`,
            };
          }
          return {
            success: false,
            botName: botUsername,
            message: `Channel error: ${chatData.description}`,
          };
        }

        const channelTitle = chatData.result?.title || cleanChannelId;
        return {
          success: true,
          botName: botUsername,
          message: `Connected: ${botUsername} is ready to post to "${channelTitle}"!`,
        };
      }

      return {
        success: true,
        botName: botUsername,
        message: `Bot ${botUsername} is active! Enter a Channel ID to test channel permissions.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Connection error: ${err?.message || 'Failed to reach Telegram servers.'}`,
      };
    }
  }
}