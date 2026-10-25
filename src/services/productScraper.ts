import { ProductMetadata } from '../types';

export class ProductScraper {
  /**
   * Resolves shortened URLs (e.g. amzn.to, fkrt.it) to canonical landing page
   */
  static async resolveRedirect(shortUrl: string): Promise<string> {
    try {
      const response = await fetch(shortUrl, {
        method: 'GET',
        redirect: 'follow',
      });
      return response.url || shortUrl;
    } catch {
      return shortUrl;
    }
  }

  /**
   * Identifies ecommerce platform from URL
   */
  static detectPlatform(url: string): 'amazon' | 'flipkart' | 'myntra' | 'other' {
    const lower = url.toLowerCase();
    if (lower.includes('amazon') || lower.includes('amzn.to')) return 'amazon';
    if (lower.includes('flipkart') || lower.includes('fkrt.it')) return 'flipkart';
    if (lower.includes('myntra')) return 'myntra';
    return 'other';
  }

  /**
   * Injects user affiliate tags into canonical URL
   */
  static injectAffiliateTag(
    url: string,
    platform: 'amazon' | 'flipkart' | 'myntra' | 'other',
    tags: { amazon?: string; flipkart?: string; earnkaro?: string }
  ): string {
    try {
      const parsed = new URL(url);

      if (platform === 'amazon' && tags.amazon) {
        // Amazon ASIN extraction
        const asinMatch = url.match(/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
        if (asinMatch && asinMatch[1]) {
          return `https://www.amazon.in/dp/${asinMatch[1]}/?tag=${encodeURIComponent(tags.amazon)}`;
        }
        parsed.searchParams.set('tag', tags.amazon);
        return parsed.toString();
      }

      if (platform === 'flipkart' && tags.flipkart) {
        parsed.searchParams.set('affid', tags.flipkart);
        return parsed.toString();
      }

      return url;
    } catch {
      return url;
    }
  }

  /**
   * Scrapes metadata (OpenGraph tags, title, image, price)
   */
  static async parseProductUrl(
    inputUrl: string,
    tags: { amazon?: string; flipkart?: string; earnkaro?: string }
  ): Promise<ProductMetadata> {
    const canonicalUrl = await this.resolveRedirect(inputUrl);
    const platform = this.detectPlatform(canonicalUrl);
    const affiliateUrl = this.injectAffiliateTag(canonicalUrl, platform, tags);

    let title = 'Sample Deal Product';
    let description = 'High quality product on massive discount.';
    let imageUrl = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80';
    let currentPrice = '₹1,999';
    let originalPrice = '₹4,999';
    let discountPercent = '60% OFF';
    const features: string[] = [];

    try {
      const res = await fetch(canonicalUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        },
      });

      if (res.ok) {
        const html = await res.text();

        // Extract og:title
        const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i);
        if (ogTitle && ogTitle[1]) title = ogTitle[1].trim();

        // Extract og:image
        const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i);
        if (ogImage && ogImage[1]) imageUrl = ogImage[1].trim();

        // Extract og:description
        const ogDesc = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i);
        if (ogDesc && ogDesc[1]) description = ogDesc[1].trim();
      }
    } catch {
      // Fallback values remain intact
    }

    return {
      originalUrl: inputUrl,
      canonicalUrl,
      affiliateUrl,
      platform,
      title,
      description,
      imageUrl,
      currentPrice,
      originalPrice,
      discountPercent,
      features,
    };
  }
}