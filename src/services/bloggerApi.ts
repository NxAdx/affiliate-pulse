export interface BloggerPostPayload {
  title: string;
  content: string;
  labels?: string[];
}

export class BloggerService {
  /**
   * Helper to get direct web link to Blogger Dashboard / Create Post editor
   */
  static getWebEditorUrl(blogId?: string): string {
    if (blogId && blogId.trim()) {
      return `https://www.blogger.com/blog/posts/${blogId.trim()}`;
    }
    return 'https://www.blogger.com/go/createpost';
  }

  /**
   * Tests Google Apps Script Webhook connection
   */
  static async testWebhook(
    webhookUrl: string,
    blogId?: string
  ): Promise<{ success: boolean; blogName?: string; blogUrl?: string; error?: string }> {
    if (!webhookUrl || !webhookUrl.trim()) {
      return { success: false, error: 'Please enter your Google Apps Script Webhook URL' };
    }

    const cleanUrl = webhookUrl.trim();
    if (!cleanUrl.startsWith('https://script.google.com/macros/s/')) {
      return {
        success: false,
        error: 'Invalid Webhook URL. It must begin with https://script.google.com/macros/s/.../exec',
      };
    }

    try {
      const response = await fetch(cleanUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test: true,
          blogId: blogId?.trim() || '',
        }),
        redirect: 'follow',
      });

      const rawText = await response.text();

      // Check for Google Accounts sign-in challenge (caused when "Who has access" is not set to "Anyone")
      if (
        response.status === 401 ||
        rawText.includes('Sign in - Google Accounts') ||
        rawText.includes('accounts.google.com')
      ) {
        return {
          success: false,
          error:
            '⚠️ Google Sign-In Required: In script.google.com -> Deploy -> Manage Deployments -> Edit -> set "Who has access" to "Anyone" (not "Only myself") and deploy as "New version".',
        };
      }

      try {
        const json = JSON.parse(rawText);
        if (json.success === false) {
          return {
            success: false,
            error: json.error || 'Apps Script returned an error',
          };
        }
        return {
          success: true,
          blogName: json.blogName || 'Google Apps Script Webhook Active',
          blogUrl: json.blogUrl || cleanUrl,
        };
      } catch {
        // If it returned 200/302 HTML or plain text without sign-in block
        if (response.ok) {
          return {
            success: true,
            blogName: 'Google Apps Script Webhook Connected',
            blogUrl: cleanUrl,
          };
        }
        return {
          success: false,
          error: `Webhook returned status ${response.status}: ${rawText.substring(0, 150)}`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error reaching Google Apps Script Webhook',
      };
    }
  }

  /**
   * Publishes formatted HTML review to Google Blogger via Google Apps Script Webhook
   * (Permanent 100% direct publishing - zero token expiry!)
   */
  static async publishViaWebhook(
    webhookUrl: string,
    blogId: string,
    payload: BloggerPostPayload
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!webhookUrl || !webhookUrl.trim()) {
      return { success: false, error: 'Missing Google Apps Script Webhook URL' };
    }

    try {
      const response = await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blogId: blogId?.trim() || '',
          title: payload.title,
          content: payload.content,
          labels: payload.labels || ['Product Review', 'Deals', 'Tech'],
        }),
        redirect: 'follow',
      });

      const rawText = await response.text();

      // Check for Google Accounts sign-in challenge
      if (
        response.status === 401 ||
        rawText.includes('Sign in - Google Accounts') ||
        rawText.includes('accounts.google.com')
      ) {
        return {
          success: false,
          error:
            '⚠️ Google Sign-In Required: In script.google.com -> Deploy -> Manage Deployments -> Edit -> set "Who has access" to "Anyone" and deploy as "New version".',
        };
      }

      try {
        const json = JSON.parse(rawText);
        if (json.success === false) {
          return {
            success: false,
            error: json.error || 'Apps script reported an error publishing to Blogger',
          };
        }
        return {
          success: true,
          url: json.url || (blogId ? `https://www.blogger.com/blog/posts/${blogId.trim()}` : undefined),
        };
      } catch {
        if (response.ok) {
          return {
            success: true,
            url: blogId ? `https://www.blogger.com/blog/posts/${blogId.trim()}` : undefined,
          };
        }
        return {
          success: false,
          error: `Publish failed (${response.status}): ${rawText.substring(0, 200)}`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error reaching Blogger Webhook',
      };
    }
  }

  /**
   * Tests Blogger connection (supports Webhook URL or OAuth Access Token)
   */
  static async testConnection(
    blogId: string,
    accessToken?: string,
    webhookUrl?: string
  ): Promise<{ success: boolean; blogName?: string; blogUrl?: string; error?: string }> {
    // If Webhook URL is configured, test the Webhook
    if (webhookUrl && webhookUrl.trim()) {
      return this.testWebhook(webhookUrl, blogId);
    }

    // Otherwise fallback to OAuth testing
    if (!blogId || !blogId.trim()) {
      return { success: false, error: 'Please enter your numeric Blogger Blog ID' };
    }
    if (!accessToken || !accessToken.trim()) {
      return { success: false, error: 'Please enter your Blogger OAuth Access Token or Webhook URL' };
    }

    const token = accessToken.trim();
    if (token.startsWith('AIza')) {
      return {
        success: false,
        error:
          '⚠️ You entered a Google API Key instead of an OAuth 2.0 Access Token. Blogger posting requires an OAuth Bearer token (starts with "ya29..."). Use the Webhook URL above for permanent publishing!',
      };
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/blogger/v3/blogs/${blogId.trim()}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errJson = JSON.parse(errorText);
          if (errJson?.error?.code === 401) {
            return {
              success: false,
              error:
                '❌ OAuth Token Expired or Invalid (401). Use the Google Apps Script Webhook above for permanent zero-expiry publishing.',
            };
          }
          if (errJson?.error?.code === 404) {
            return {
              success: false,
              error: '❌ Blog Not Found (404). Check your numeric Blog ID in your Blogger URL.',
            };
          }
          return { success: false, error: errJson?.error?.message || errorText };
        } catch {
          return { success: false, error: errorText };
        }
      }

      const data = await response.json();
      return {
        success: true,
        blogName: data.name,
        blogUrl: data.url,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error reaching Google Blogger' };
    }
  }

  /**
   * Publishes formatted HTML review to Google Blogger
   * Automatically uses Google Apps Script Webhook if configured, otherwise falls back to OAuth v3
   */
  static async publishPost(
    blogId: string,
    accessToken: string,
    payload: BloggerPostPayload,
    webhookUrl?: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    // 1. If Webhook URL is configured, use it directly (Permanent & Zero Expiry!)
    if (webhookUrl && webhookUrl.trim()) {
      return this.publishViaWebhook(webhookUrl, blogId, payload);
    }

    // 2. Otherwise fallback to OAuth v3 API
    if (!blogId || !accessToken) {
      return {
        success: false,
        error:
          'Missing Blogger Webhook URL or OAuth Access Token. Tap "Copy HTML" to publish manually, or configure Webhook URL in Settings.',
      };
    }

    const token = accessToken.trim();
    if (token.startsWith('AIza')) {
      return {
        success: false,
        error:
          '⚠️ You entered a Google API Key instead of an OAuth token. Blogger API rejects API keys for writing posts. Configure the Google Apps Script Webhook in Settings for 100% direct publishing.',
      };
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/blogger/v3/blogs/${blogId.trim()}/posts/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            kind: 'blogger#post',
            title: payload.title,
            content: payload.content,
            labels: payload.labels || ['Product Review', 'Deals', 'Tech'],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let message = errorText;
        try {
          const errJson = JSON.parse(errorText);
          if (errJson?.error?.code === 401) {
            message =
              'Google OAuth Access Token expired (401). Use the Google Apps Script Webhook in Settings for permanent zero-expiry publishing.';
          } else if (errJson?.error?.message) {
            message = errJson.error.message;
          }
        } catch {
          // Keep errorText
        }
        return { success: false, error: message };
      }

      const data = await response.json();
      return { success: true, url: data.url };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error connecting to Google Blogger API',
      };
    }
  }
}
