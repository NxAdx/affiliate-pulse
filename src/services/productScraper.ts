import { ProductMetadata } from '../types';

export class ProductScraper {
  /**
   * Extracts clean HTTP/HTTPS URL from messy conversational text shared by apps
   * E.g. "Check this out on Amazon! boAt Rockerz 450: https://amzn.to/3xyz" -> "https://amzn.to/3xyz"
   */
  static extractUrlFromText(rawText: string): string {
    if (!rawText) return '';
    const trimmed = rawText.trim();
    const urlMatch = trimmed.match(/(https?:\/\/[^\s]+)/i);
    return urlMatch ? urlMatch[1] : trimmed;
  }

  /**
   * Resolves shortened URLs (amzn.to, fkrt.it, bit.ly, etc.) to canonical landing page
   */
  static async resolveRedirect(shortUrl: string): Promise<string> {
    const cleanUrl = this.extractUrlFromText(shortUrl);
    try {
      const response = await fetch(cleanUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
      });
      return response.url || cleanUrl;
    } catch {
      return cleanUrl;
    }
  }

  /**
   * Identifies e-commerce platform from URL
   */
  static detectPlatform(url: string): 'amazon' | 'flipkart' | 'myntra' | 'other' {
    const lower = url.toLowerCase();
    if (lower.includes('amazon') || lower.includes('amzn.to')) return 'amazon';
    if (lower.includes('flipkart') || lower.includes('fkrt.it')) return 'flipkart';
    if (lower.includes('myntra') || lower.includes('myntr.it')) return 'myntra';
    return 'other';
  }

  /**
   * Cleans URL and injects user affiliate tracking tag
   * - Amazon: Extracts 10-char ASIN, strips tracking clutter, returns clean canonical URL
   * - Flipkart: Injects affid and tracking parameter
   * - Other: Wraps with EarnKaro/Cuelinks prefix if available
   */
  static injectAffiliateTag(
    url: string,
    platform: 'amazon' | 'flipkart' | 'myntra' | 'other',
    tags: { amazon?: string; flipkart?: string; earnkaro?: string }
  ): string {
    try {
      if (platform === 'amazon' && tags.amazon) {
        // Amazon ASIN extraction pattern (discovered via REA)
        const asinMatch = url.match(/(?:dp|gp\/product|\/d\/)\/([A-Z0-9]{10})/i);
        if (asinMatch && asinMatch[1]) {
          return `https://www.amazon.in/dp/${asinMatch[1]}/?tag=${encodeURIComponent(tags.amazon.trim())}`;
        }
        const parsed = new URL(url);
        parsed.searchParams.set('tag', tags.amazon.trim());
        return parsed.toString();
      }

      if (platform === 'flipkart' && tags.flipkart) {
        const parsed = new URL(url);
        parsed.searchParams.set('affid', tags.flipkart.trim());
        parsed.searchParams.set('affExtParam1', 'pulse');
        return parsed.toString();
      }

      // If EarnKaro token is provided and it is Myntra/other
      if (tags.earnkaro && (platform === 'myntra' || platform === 'other')) {
        return `https://earnkaro.com/make-profit-link?url=${encodeURIComponent(url)}&token=${encodeURIComponent(tags.earnkaro.trim())}`;
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
    inputRawText: string,
    tags: { amazon?: string; flipkart?: string; earnkaro?: string }
  ): Promise<ProductMetadata> {
    const rawUrl = this.extractUrlFromText(inputRawText);
    const canonicalUrl = await this.resolveRedirect(rawUrl);
    const platform = this.detectPlatform(canonicalUrl);
    const affiliateUrl = this.injectAffiliateTag(canonicalUrl, platform, tags);

    let title = 'Deal Product';
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
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      if (res.ok) {
        const html = await res.text();

        // Extract og:title
        const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i);
        if (ogTitle && ogTitle[1]) {
          title = ogTitle[1].replace(/Amazon\.in\s*:?|Flipkart\.com\s*:?/gi, '').trim();
        }

        // Extract og:image
        const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i);
        if (ogImage && ogImage[1]) imageUrl = ogImage[1].trim();

        // Extract og:description
        const ogDesc = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i);
        if (ogDesc && ogDesc[1]) description = ogDesc[1].trim();

        // Regex for Price detection (Indian e-commerce pattern: ₹XX,XXX or Rs. XX,XXX)
        const priceMatch = html.match(/(?:₹|Rs\.?|INR)\s*([\d,]+)/i);
        if (priceMatch && priceMatch[1]) {
          currentPrice = `₹${priceMatch[1]}`;
        }

        // Regex for Discount % (e.g. 45% off, 60% OFF)
        const discountMatch = html.match(/(\d{1,2}%\s*off)/i);
        if (discountMatch && discountMatch[1]) {
          discountPercent = discountMatch[1].toUpperCase();
        }
      }
    } catch {
      // Fallback values remain intact
    }

    return {
      originalUrl: rawUrl,
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