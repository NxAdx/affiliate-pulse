export class TelegramService {
  /**
   * Normalizes channel handles or numeric IDs:
   * - Strips "https://t.me/" or "t.me/"
   * - Converts numeric IDs (e.g. 1234567890 -> -1001234567890)
   * - Ensures usernames have a leading "@"
   */
  static normalizeChannelId(channelId: string): string {
    let clean = (channelId || '').trim();

    // Strip web links like https://t.me/mychannel or t.me/mychannel
    clean = clean.replace(/^(?:https?:\/\/)?(?:www\.)?t\.me\//i, '');
    clean = clean.replace(/^\/+/, '');

    // If pure digits (e.g. 2384918231), prepend -100 for Telegram channel supergroup ID
    if (/^\d+$/.test(clean)) {
      return `-100${clean}`;
    }

    // If already negative numeric (e.g. -1002384918231), keep as is
    if (/^-\d+$/.test(clean)) {
      return clean;
    }

    // For public usernames, guarantee leading @
    return clean.startsWith('@') ? clean : `@${clean}`;
  }

  /**
   * Formats Telegram API error descriptions into clear, actionable human guidance
   */
  static formatTelegramError(rawError: string, channelId: string, botUsername?: string): string {
    const lower = (rawError || '').toLowerCase();
    const bot = botUsername || 'Bot';

    if (lower.includes('chat not found')) {
      return `Channel "${channelId}" not found. Verify your channel username, or if private, add ${bot} to the channel first.`;
    }
    if (
      lower.includes('not an admin') ||
      lower.includes('administrator rights') ||
      lower.includes('have no rights to send a message') ||
      lower.includes('not enough rights') ||
      lower.includes('rights in the channel') ||
      lower.includes('restricted')
    ) {
      return `${bot} is NOT an Admin! Go to Channel Settings → Administrators → Add ${bot} with "Post Messages" permission.`;
    }
    if (
      lower.includes('unauthorized') ||
      lower.includes('invalid token') ||
      (lower.includes('not found') && lower.includes('bot'))
    ) {
      return `Invalid Bot Token! Please copy the exact HTTP API token from @BotFather in Settings.`;
    }
    if (lower.includes("can't parse entities")) {
      return `Markdown format error in deal text. (Retried with plain text)`;
    }
    return rawError;
  }

  /**
   * Safe fetch helper for Telegram Bot API
   */
  private static async callApi(
    botToken: string,
    method: string,
    payload: Record<string, any>
  ): Promise<{ ok: boolean; result?: any; error_code?: number; description?: string }> {
    const token = botToken.trim();
    const endpoint = `https://api.telegram.org/bot${token}/${method}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  /**
   * Broadcasts urgent deal alert to a Telegram channel with resilient fallbacks:
   * 1. If photo caption has Markdown entity errors -> retries photo as plain text
   * 2. If photo URL download fails (CDN/blocking) -> falls back to text-only sendMessage
   * 3. If text has Markdown entity errors -> retries text without parse_mode
   */
  static async broadcastDeal(
    botToken: string,
    channelId: string,
    message: string,
    imageUrl?: string
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    const token = (botToken || '').trim();
    const rawChannel = (channelId || '').trim();

    if (!token) {
      return { success: false, error: 'Telegram Bot Token is missing. Enter it in Settings.' };
    }
    if (!rawChannel) {
      return { success: false, error: 'Telegram Channel ID is missing. Enter it in Settings.' };
    }

    const cleanChannelId = this.normalizeChannelId(rawChannel);

    try {
      // 1. Attempt photo broadcast if imageUrl is provided
      if (imageUrl && imageUrl.trim()) {
        const cleanImageUrl = imageUrl.trim();
        // Telegram sendPhoto caption has a hard limit of 1024 characters
        const caption =
          message.length > 1020 ? message.substring(0, 1017) + '...' : message;

        // 1A. Try sendPhoto with Markdown formatting
        let photoRes = await this.callApi(token, 'sendPhoto', {
          chat_id: cleanChannelId,
          photo: cleanImageUrl,
          caption,
          parse_mode: 'Markdown',
        });

        // 1B. If Markdown parsing error ("can't parse entities"), retry photo as plain text
        if (!photoRes.ok && photoRes.description?.toLowerCase().includes("can't parse entities")) {
          photoRes = await this.callApi(token, 'sendPhoto', {
            chat_id: cleanChannelId,
            photo: cleanImageUrl,
            caption,
          });
        }

        if (photoRes.ok) {
          return { success: true, messageId: photoRes.result?.message_id };
        }

        // If photo failed due to missing Admin rights or invalid channel, fail immediately with clear instructions
        const photoDesc = photoRes.description || '';
        const lowerDesc = photoDesc.toLowerCase();
        if (
          lowerDesc.includes('not an admin') ||
          lowerDesc.includes('chat not found') ||
          lowerDesc.includes('rights') ||
          lowerDesc.includes('unauthorized')
        ) {
          return {
            success: false,
            error: this.formatTelegramError(photoDesc, cleanChannelId),
          };
        }

        // If photo failed due to image CDN / download / unsupported format, proceed to text fallback below!
      }

      // 2. Text-only broadcast (or fallback if photo download failed)
      // 2A. Try sendMessage with Markdown
      let textRes = await this.callApi(token, 'sendMessage', {
        chat_id: cleanChannelId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      });

      // 2B. If Markdown parsing error, retry sendMessage as plain text
      if (!textRes.ok && textRes.description?.toLowerCase().includes("can't parse entities")) {
        textRes = await this.callApi(token, 'sendMessage', {
          chat_id: cleanChannelId,
          text: message,
          disable_web_page_preview: false,
        });
      }

      if (textRes.ok) {
        return { success: true, messageId: textRes.result?.message_id };
      }

      return {
        success: false,
        error: this.formatTelegramError(
          textRes.description || 'Failed to broadcast message',
          cleanChannelId
        ),
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Network error: ${err?.message || 'Failed to reach Telegram servers.'}`,
      };
    }
  }

  /**
   * Tests connection with Telegram Bot API and checks channel admin rights
   */
  static async testConnection(
    botToken: string,
    channelId?: string
  ): Promise<{ success: boolean; botName?: string; message: string }> {
    const token = (botToken || '').trim();
    if (!token) {
      return { success: false, message: 'Please enter your Telegram Bot Token.' };
    }

    try {
      // 1. Validate Bot Token using getMe
      const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const meData = await meRes.json();

      if (!meData.ok) {
        if (meData.error_code === 404 || meData.error_code === 401) {
          return { success: false, message: 'Invalid Bot Token. Check token copied from @BotFather.' };
        }
        return { success: false, message: meData.description || 'Bot token validation failed.' };
      }

      const botUsername = meData.result?.username ? `@${meData.result.username}` : 'Bot';

      // 2. If Channel ID provided, verify bot can access the channel
      if (channelId && channelId.trim()) {
        const cleanChannelId = this.normalizeChannelId(channelId);

        const chatRes = await fetch(
          `https://api.telegram.org/bot${token}/getChat?chat_id=${cleanChannelId}`
        );
        const chatData = await chatRes.json();

        if (!chatData.ok) {
          const desc = chatData.description || '';
          const lower = desc.toLowerCase();

          if (lower.includes('chat not found')) {
            return {
              success: false,
              botName: botUsername,
              message: `Channel "${cleanChannelId}" not found. Verify channel handle, or if private, add ${botUsername} to the channel first.`,
            };
          }

          if (
            lower.includes('not an admin') ||
            lower.includes('rights') ||
            chatData.error_code === 400 ||
            chatData.error_code === 403
          ) {
            return {
              success: false,
              botName: botUsername,
              message: `${botUsername} is NOT an Admin in ${cleanChannelId}. Go to Channel Settings → Administrators → Add ${botUsername} with "Post Messages" permission.`,
            };
          }

          return {
            success: false,
            botName: botUsername,
            message: `Channel error: ${desc}`,
          };
        }

        const channelTitle = chatData.result?.title || cleanChannelId;
        return {
          success: true,
          botName: botUsername,
          message: `Connected! ${botUsername} is ready to post to "${channelTitle}"!`,
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