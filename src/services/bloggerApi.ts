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
   * Tests Blogger connection and validates Blog ID and OAuth Access Token
   */
  static async testConnection(
    blogId: string,
    accessToken: string
  ): Promise<{ success: boolean; blogName?: string; blogUrl?: string; error?: string }> {
    if (!blogId || !blogId.trim()) {
      return { success: false, error: 'Please enter your numeric Blogger Blog ID' };
    }
    if (!accessToken || !accessToken.trim()) {
      return { success: false, error: 'Please enter your Blogger OAuth Access Token' };
    }

    const token = accessToken.trim();
    if (token.startsWith('AIza')) {
      return {
        success: false,
        error:
          '⚠️ You entered a Google API Key instead of an OAuth 2.0 Access Token. Blogger posting requires an OAuth Bearer token (starts with "ya29..."). Tap the OAuth Playground link above to generate one.',
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
                '❌ OAuth Token Expired or Invalid (401). Please click OAuth Playground to generate a fresh token.',
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
   * Publishes formatted HTML review to Google Blogger via API v3
   */
  static async publishPost(
    blogId: string,
    accessToken: string,
    payload: BloggerPostPayload
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!blogId || !accessToken) {
      return {
        success: false,
        error:
          'Missing Blogger Blog ID or Access Token. Tap "Copy HTML" to publish manually, or configure tokens in Settings.',
      };
    }

    const token = accessToken.trim();
    if (token.startsWith('AIza')) {
      return {
        success: false,
        error:
          '⚠️ You entered a Google API Key instead of an OAuth token. Blogger API rejects API keys for writing posts. Use "Copy HTML" to paste directly, or get an OAuth token via OAuth Playground.',
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
              'Google OAuth Access Token expired or invalid (401). Please copy the HTML article and paste it directly into your Blogger dashboard, or grab a new token from OAuth Playground.';
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