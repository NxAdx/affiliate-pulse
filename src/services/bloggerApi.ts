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

    try {
      const response = await fetch(
        `https://www.googleapis.com/blogger/v3/blogs/${blogId.trim()}/posts/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken.trim()}`,
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