export interface BloggerPostPayload {
  title: string;
  content: string;
  labels?: string[];
}

export const DEFAULT_BLOGGER_WEBHOOK =
  'https://script.google.com/macros/s/AKfycbxh1BaXpDleljcWtTW_WSTtO-ks7UfQYQ78TkLVnYbpdgW15EiB5RycAIhgruAiRZPQ/exec';

function cleanBloggerError(rawError: string): string {
  if (!rawError) return 'Unknown Blogger error';
  if (rawError.includes('SERVICE_DISABLED') || rawError.includes('Blogger API has not been used')) {
    return 'Blogger API v3 is disabled in Google Cloud. Click the link in Google Cloud Console to Enable it.';
  }
  if (rawError.includes('Sign in - Google Accounts') || rawError.includes('accounts.google.com')) {
    return 'Google Sign-In Required: In Apps Script -> Deploy -> Manage Deployments -> set "Who has access" to "Anyone".';
  }
  return rawError;
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
   * Tests connection to the Google Apps Script Webhook
   */
  static async testConnection(
    blogId?: string,
    webhookUrl?: string
  ): Promise<{ success: boolean; blogName?: string; blogUrl?: string; error?: string }> {
    const url = webhookUrl?.trim() || DEFAULT_BLOGGER_WEBHOOK;

    if (!url.startsWith('https://script.google.com/macros/s/')) {
      return {
        success: false,
        error: 'Invalid Webhook URL. It must begin with https://script.google.com/macros/s/.../exec',
      };
    }

    try {
      const response = await fetch(url, {
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
            error: cleanBloggerError(json.error || 'Webhook returned an error'),
          };
        }
        return {
          success: true,
          blogName: json.message || 'Google Apps Script Webhook Active',
          blogUrl: url,
        };
      } catch {
        if (response.ok) {
          return {
            success: true,
            blogName: 'Google Apps Script Webhook Connected',
            blogUrl: url,
          };
        }
        return {
          success: false,
          error: `Webhook returned status ${response.status}`,
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
   * Publishes formatted HTML review to Google Blogger via Webhook
   * Permanent 1-tap direct publishing with zero token expiration.
   */
  static async publishPost(
    blogId: string,
    payload: BloggerPostPayload,
    webhookUrl?: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    const url = webhookUrl?.trim() || DEFAULT_BLOGGER_WEBHOOK;

    if (!url) {
      return { success: false, error: 'Missing Blogger Webhook URL. Please configure it in Settings.' };
    }

    try {
      const response = await fetch(url, {
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

      if (
        response.status === 401 ||
        rawText.includes('Sign in - Google Accounts') ||
        rawText.includes('accounts.google.com')
      ) {
        return {
          success: false,
          error:
            'Google Sign-In Required: Ensure "Who has access" is set to "Anyone" in your Apps Script deployment.',
        };
      }

      try {
        const json = JSON.parse(rawText);
        if (json.success === false) {
          return {
            success: false,
            error: cleanBloggerError(json.error || 'Failed to publish post to Blogger'),
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
          error: `Publish failed (${response.status}): ${rawText.substring(0, 150)}`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error connecting to Blogger Webhook',
      };
    }
  }
}
