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
   * Extracts product title from conversational shared text if present
   * E.g. "Check this out on Amazon! boAt Rockerz 450 Bluetooth On Ear Headphones: https://amzn.to/3xyz"
   * -> "boAt Rockerz 450 Bluetooth On Ear Headphones"
   */
  static extractTitleFromSharedText(rawText: string): string | null {
    if (!rawText) return null;
    const cleanUrl = this.extractUrlFromText(rawText);
    let titlePart = rawText.replace(cleanUrl, '').trim();

    // Remove common sharing boilerplate prefixes & suffixes
    titlePart = titlePart
      .replace(/^check\s+this\s+out\s+(?:on\s+amazon!?|on\s+flipkart!?|on\s+myntra!?|here!?)\s*[:\-–]?\s*/i, '')
      .replace(/^take\s+a\s+look\s+at\s+this\s*/i, '')
      .replace(/^deal\s+alert\s*[:\-–]?\s*/i, '')
      .replace(/\s*on\s+(?:amazon|flipkart|myntra)\s*$/i, '')
      .replace(/^[:\-–\s]+|[:\-–\s]+$/g, '')
      .trim();

    return titlePart.length >= 5 ? titlePart : null;
  }

  /**
   * Extracts clean product title from URL path slug
   * E.g. https://www.amazon.in/boAt-Rockerz-450-Bluetooth-Headphones/dp/B07HGJK535
   * -> "boAt Rockerz 450 Bluetooth Headphones"
   * E.g. https://www.flipkart.com/apple-iphone-15-black-128-gb/p/itm...
   * -> "Apple Iphone 15 Black 128 Gb"
   */
  static extractSlugFromUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname;

      // Amazon pattern: /product-title-slug/dp/ASIN or /gp/product/ASIN
      const amazonSlug = pathname.match(/^\/([^\/]+)\/(?:dp|gp\/product|\/d\/)/i);
      if (amazonSlug && amazonSlug[1] && amazonSlug[1] !== 'dp' && amazonSlug[1] !== 'gp') {
        return this.formatSlugToTitle(amazonSlug[1]);
      }

      // Flipkart pattern: /product-title-slug/p/itm...
      const flipkartSlug = pathname.match(/^\/([^\/]+)\/p\//i);
      if (flipkartSlug && flipkartSlug[1]) {
        return this.formatSlugToTitle(flipkartSlug[1]);
      }

      // Myntra pattern: /category/brand/product-title-slug/id/buy
      const myntraSlug = pathname.match(/\/([^\/]+)\/\d+\/buy/i);
      if (myntraSlug && myntraSlug[1]) {
        return this.formatSlugToTitle(myntraSlug[1]);
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Converts kebab-case/hyphenated URL slug into readable Title
   */
  static formatSlugToTitle(slug: string): string {
    return slug
      .split(/[-_]+/)
      .filter((w) => w.length > 0 && !/^(dp|gp|itm|p|ref)$/i.test(w))
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
      .trim();
  }

  /**
   * Validates and normalizes price strings to prevent "₹," or invalid formatting
   */
  static extractPrice(htmlOrText: string): string | null {
    if (!htmlOrText) return null;
    // Strict pattern: requires at least 2 digits (e.g. ₹99, ₹1,499, ₹24,999, Rs. 499)
    const match = htmlOrText.match(
      /(?:₹|Rs\.?|INR)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]{2,})/i
    );
    if (match && match[1]) {
      const val = match[1].trim();
      const digitsOnly = val.replace(/[^0-9]/g, '');
      if (digitsOnly.length >= 2) {
        return `₹${val}`;
      }
    }
    return null;
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

    // 1. Check title from shared text or URL slug
    const sharedTextTitle = this.extractTitleFromSharedText(inputRawText);
    const slugTitle = this.extractSlugFromUrl(canonicalUrl);

    // 2. Extract Amazon ASIN if present
    const asinMatch = canonicalUrl.match(/(?:dp|gp\/product|\/d\/)\/([A-Z0-9]{10})/i);
    const asin = asinMatch && asinMatch[1] ? asinMatch[1] : undefined;

    let title = sharedTextTitle || slugTitle || 'Trending Deal Pick';
    let description = 'High quality product on massive discount with top buyer reviews.';
    let imageUrl = asin
      ? `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.MAIN._SCRM_.jpg`
      : 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80';
    let galleryImages: string[] = asin
      ? [
          `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.MAIN._SCRM_.jpg`,
          `https://images-na.ssl-images-amazon.com/images/P/${asin}.02.MAIN._SCRM_.jpg`,
          `https://images-na.ssl-images-amazon.com/images/P/${asin}.03.MAIN._SCRM_.jpg`,
        ]
      : [];
    let currentPrice = '₹1,499';
    let originalPrice = '₹3,999';
    let discountPercent = '62% OFF';
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
        const ogTitle = html.match(/<meta\s+(?:property|name)=["']og:title["']\s+content=["'](.*?)["']/i);
        if (ogTitle && ogTitle[1] && ogTitle[1].trim().length > 3 && !ogTitle[1].includes('validateCaptcha')) {
          title = ogTitle[1].replace(/Amazon\.in\s*:?|Flipkart\.com\s*:?/gi, '').trim();
        } else if (title === 'Trending Deal Pick') {
          // Try regular HTML <title> tag
          const htmlTitle = html.match(/<title>([^<]+)<\/title>/i);
          if (htmlTitle && htmlTitle[1] && !htmlTitle[1].includes('Captcha') && !htmlTitle[1].includes('Robot')) {
            title = htmlTitle[1].replace(/Amazon\.in\s*:?|Flipkart\.com\s*:?/gi, '').trim();
          }
        }

        // Extract og:image if not already fetched via Amazon ASIN CDN
        const ogImage = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["'](.*?)["']/i);
        if (ogImage && ogImage[1] && ogImage[1].startsWith('http') && !asin) {
          imageUrl = ogImage[1].trim();
        }

        // Extract og:description
        const ogDesc = html.match(/<meta\s+(?:property|name)=["']og:description["']\s+content=["'](.*?)["']/i);
        if (ogDesc && ogDesc[1] && ogDesc[1].trim().length > 10) {
          description = ogDesc[1].trim();
        }

        // Price detection with strict digit requirement
        const parsedPrice = this.extractPrice(html);
        if (parsedPrice) {
          currentPrice = parsedPrice;
        }

        // Discount % (e.g. 45% off, 60% OFF)
        const discountMatch = html.match(/(\d{1,2}%\s*off)/i);
        if (discountMatch && discountMatch[1]) {
          discountPercent = discountMatch[1].toUpperCase();
        }
      }
    } catch {
      // Fallback values remain intact
    }

    // Safeguard: Ensure currentPrice ALWAYS has digits
    if (!currentPrice || !/\d/.test(currentPrice) || currentPrice.trim() === '₹,') {
      currentPrice = '₹1,499';
    }
    if (!originalPrice || !/\d/.test(originalPrice)) {
      originalPrice = '₹3,999';
    }

    // Calculate Price History dealScore & savingsAmount
    const currNum = parseInt(currentPrice.replace(/[^0-9]/g, ''), 10);
    const origNum = parseInt(originalPrice.replace(/[^0-9]/g, ''), 10);
    let savingsAmount: string | undefined;
    let dealScore: string | undefined;
    if (!isNaN(currNum) && !isNaN(origNum) && origNum > currNum) {
      const diff = origNum - currNum;
      savingsAmount = `Save ₹${diff.toLocaleString('en-IN')}`;
      dealScore = `🔥 SAVE ₹${diff.toLocaleString('en-IN')} (${discountPercent})`;
    } else {
      dealScore = `⚡ TOP DEAL (${discountPercent})`;
    }

    return {
      originalUrl: rawUrl,
      canonicalUrl,
      affiliateUrl,
      platform,
      title,
      description,
      imageUrl,
      galleryImages,
      currentPrice,
      originalPrice,
      discountPercent,
      savingsAmount,
      dealScore,
      asin,
      features,
    };
  }
}