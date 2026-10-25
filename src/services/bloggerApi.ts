export interface BloggerPostPayload {
  title: string;
  content: string;
  labels?: string[];
}

export class BloggerService {
  /**
   * Publishes formatted HTML review to Google Blogger via API v3
   */
  static async publishPost(
    blogId: string,
    accessToken: string,
    payload: BloggerPostPayload
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!blogId || !accessToken) {
      return { success: false, error: 'Missing Blogger Blog ID or Access Token' };
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
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
        return { success: false, error: `Blogger API Error: ${errorText}` };
      }

      const data = await response.json();
      return { success: true, url: data.url };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error connecting to Blogger' };
    }
  }
}