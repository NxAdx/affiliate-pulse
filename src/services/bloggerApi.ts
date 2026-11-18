export interface BloggerPostPayload {
  title: string;
  content: string;
  labels?: string[];
}

export const DEFAULT_BLOGGER_WEBHOOK =
  'https://script.google.com/macros/s/AKfycbxh1BaXpDleljcWtTW_WSTtO-ks7UfQYQ78TkLVnYbpdgW15EiB5RycAIhgruAiRZPQ/exec';

export const DEFAULT_BLOGGER_BLOG_ID = '4105733030604942075';

function cleanBloggerError(rawError: string): string {
  if (!rawError) return 'Unknown Blogger error';
  if (rawError.includes('SERVICE_DISABLED') || rawError.includes('Blogger API has not been used')) {
    return 'Blogger API v3 is disabled in Google Cloud. In Apps Script -> Services (+) -> Enable Blogger API v3.';
  }
  if (
    rawError.includes('Sign in - Google Accounts') ||
    rawError.includes('accounts.google.com') ||
    rawError.includes('You need access') ||
    rawError.includes('You need permission') ||
    rawError.includes('docs.google.com/accounts') ||
    rawError.includes('request-access-icon') ||
    rawError.includes('403')
  ) {
    return '⚠️ Google Apps Script 403 Forbidden: In script.google.com -> Deploy -> Manage Deployments -> Edit -> set "Who has access" to "Anyone" and deploy as "New version".';
  }
  return rawError;
}

export class BloggerService {
  /**
   * Helper to get direct web link to Blogger Dashboard / Create Post editor
   */
  static getWebEditorUrl(blogId?: string): string {
    const id = blogId?.trim() || DEFAULT_BLOGGER_BLOG_ID;
    if (id) {
      return `https://www.blogger.com/blog/posts/${id}`;
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
    const targetBlogId = blogId?.trim() || DEFAULT_BLOGGER_BLOG_ID;

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
          blogId: targetBlogId,
        }),
        redirect: 'follow',
      });

      const rawText = await response.text();

      // Check for Google Accounts sign-in challenge or 403 access restriction
      if (
        response.status === 401 ||
        response.status === 403 ||
        rawText.includes('Sign in - Google Accounts') ||
        rawText.includes('accounts.google.com') ||
        rawText.includes('You need access') ||
        rawText.includes('You need permission') ||
        rawText.includes('docs.google.com/accounts') ||
        rawText.includes('request-access-icon')
      ) {
        return {
          success: false,
          error:
            '⚠️ Webhook Access Denied (403): In script.google.com -> Deploy -> Manage Deployments -> Edit -> set "Who has access" to "Anyone" and deploy as "New version".',
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
          blogName: json.message || 'Google Apps Script Webhook Active & Verified',
          blogUrl: url,
        };
      } catch {
        return {
          success: false,
          error: `Webhook returned invalid non-JSON response (${response.status}): ${rawText.substring(0, 100).trim()}...`,
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
    const targetBlogId = blogId?.trim() || DEFAULT_BLOGGER_BLOG_ID;

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
          blogId: targetBlogId,
          title: payload.title,
          content: payload.content,
          labels: payload.labels || ['Product Review', 'Deals', 'Tech'],
        }),
        redirect: 'follow',
      });

      const rawText = await response.text();

      if (
        response.status === 401 ||
        response.status === 403 ||
        rawText.includes('Sign in - Google Accounts') ||
        rawText.includes('accounts.google.com') ||
        rawText.includes('You need access') ||
        rawText.includes('You need permission') ||
        rawText.includes('docs.google.com/accounts') ||
        rawText.includes('request-access-icon')
      ) {
        return {
          success: false,
          error:
            '⚠️ Webhook Access Denied (403): In script.google.com -> Deploy -> Manage Deployments -> Edit -> set "Who has access" to "Anyone" and deploy as "New version".',
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
          url: json.url || (targetBlogId ? `https://www.blogger.com/blog/posts/${targetBlogId}` : undefined),
        };
      } catch {
        return {
          success: false,
          error: `Webhook returned invalid HTML (${response.status}). Expected JSON confirmation. Ensure Webhook is deployed with access "Anyone".`,
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
