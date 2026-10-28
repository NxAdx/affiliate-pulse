import { ProductMetadata, DealCategory } from '../types';

export interface HuntedDeal {
  asin: string;
  title: string;
  category: DealCategory;
  price: string;
  mrp?: string;
  discount: string;
  imageUrl: string;
  affiliateUrl: string;
}

export class DealHunterService {
  /**
   * Search queries and discount filters prioritized:
   * 1. Fashion first (≥50% OFF)
   * 2. Tech & Electronics second (≥40% OFF)
   * 3. Other / General essentials third (≥40% OFF)
   */
  private static CATEGORY_CONFIGS = [
    {
      category: 'fashion' as DealCategory,
      name: "Men's Fashion & Footwear",
      minDiscount: 50,
      queries: [
        'https://www.amazon.in/s?k=mens+sneakers+clothing&rh=p_8%3A50-',
        'https://www.amazon.in/s?k=mens+watches+jackets&rh=p_8%3A50-',
        'https://www.amazon.in/s?k=mens+tshirts+jeans&rh=p_8%3A50-',
      ],
    },
    {
      category: 'electronics' as DealCategory,
      name: 'Tech & Electronics',
      minDiscount: 40,
      queries: [
        'https://www.amazon.in/s?k=tws+earbuds+smartwatch&rh=p_8%3A40-',
        'https://www.amazon.in/s?k=wireless+headphones+speakers&rh=p_8%3A40-',
        'https://www.amazon.in/s?k=power+bank+fast+charger&rh=p_8%3A40-',
      ],
    },
    {
      category: 'general' as DealCategory,
      name: 'Home & Daily Essentials',
      minDiscount: 40,
      queries: [
        'https://www.amazon.in/s?k=home+gadgets+essentials&rh=p_8%3A40-',
        'https://www.amazon.in/s?k=kitchen+appliances+tools&rh=p_8%3A40-',
      ],
    },
  ];

  /**
   * Fetches HTML with realistic browser headers
   */
  private static async fetchHtml(url: string): Promise<string> {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept-Language': 'en-IN,en;q=0.9',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    return res.text();
  }

  private static decodeHtml(str: string): string {
    return (str || '')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
  }

  /**
   * Parses Amazon product page for clean metadata
   */
  static parseProductPage(
    html: string,
    asin: string,
    category: DealCategory,
    associateTag: string = 'dealhunter-21'
  ): HuntedDeal | null {
    // Title
    let title = '';
    const titleMatch =
      html.match(/id="productTitle"[^>]*>([^<]+)<\/span>/i) ||
      html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
    if (titleMatch) title = this.decodeHtml(titleMatch[1].trim());
    if (!title || title.length < 5) return null;

    // High-Res Image with all CDN fallbacks
    let imageUrl = '';
    const imgMatch =
      html.match(/data-a-dynamic-image="\{&quot;([^&"]+)/i) ||
      html.match(/data-a-dynamic-image="\{"([^"]+)/i) ||
      html.match(/"large":"(https:\/\/[^"]+media-amazon\.com[^"]+)"/i) ||
      html.match(/id="landingImage"[^>]*src="([^"]+)"/i) ||
      html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    if (imgMatch) imageUrl = imgMatch[1].trim();

    // Price
    let price = '';
    const priceMatch = html.match(/class="a-price-whole">([0-9,]+)/i);
    if (priceMatch) price = '₹' + priceMatch[1].replace(/,/g, '');
    if (!price) return null;

    // MRP
    let mrp = '';
    const mrpMatch = html.match(
      /class="a-price a-text-price"[^>]*>[\s\S]*?<span class="a-offscreen">₹?([0-9,]+)<\/span>/i
    );
    if (mrpMatch) mrp = '₹' + mrpMatch[1].replace(/,/g, '');

    // Discount
    let discount = '';
    const discMatch = html.match(/class="[^"]*savingsPercentage[^"]*">-?([0-9]+)%<\/span>/i);
    if (discMatch) discount = discMatch[1] + '%';

    const affiliateUrl = `https://www.amazon.in/dp/${asin}?tag=${associateTag}`;

    return {
      asin,
      title,
      category,
      price,
      mrp: mrp || undefined,
      discount: discount || '40%',
      imageUrl,
      affiliateUrl,
    };
  }

  /**
   * Hunts for top deals prioritizing Fashion first (≥50% OFF), then Tech (≥40% OFF), then General
   * Discovers up to `count` unique high-discount deals in a batch
   */
  static async huntTopDeals(
    count: number = 3,
    postedAsins: string[] = [],
    associateTag: string = 'dealhunter-21',
    categoryPreference?: DealCategory
  ): Promise<HuntedDeal[]> {
    const postedSet = new Set(postedAsins);
    const discoveredDeals: HuntedDeal[] = [];

    // Filter configs by user preference if specified, else follow strict priority
    const configs = categoryPreference
      ? this.CATEGORY_CONFIGS.filter((c) => c.category === categoryPreference)
      : this.CATEGORY_CONFIGS;

    for (const config of configs) {
      if (discoveredDeals.length >= count) break;

      for (const queryUrl of config.queries) {
        if (discoveredDeals.length >= count) break;

        try {
          const searchHtml = await this.fetchHtml(queryUrl);
          const asins = [...searchHtml.matchAll(/data-asin="([A-Z0-9]{10})"/g)]
            .map((m) => m[1])
            .filter((a) => a && a !== 'undefined' && !postedSet.has(a));

          const uniqueAsins = [...new Set(asins)];
          if (uniqueAsins.length === 0) continue;

          for (const candidateAsin of uniqueAsins.slice(0, 4)) {
            if (discoveredDeals.length >= count) break;

            const productHtml = await this.fetchHtml(
              `https://www.amazon.in/dp/${candidateAsin}`
            );
            const deal = this.parseProductPage(
              productHtml,
              candidateAsin,
              config.category,
              associateTag
            );

            if (deal) {
              const numericDiscount = parseInt(deal.discount.replace(/[^0-9]/g, ''), 10) || 0;
              if (numericDiscount >= config.minDiscount) {
                discoveredDeals.push(deal);
                postedSet.add(deal.asin);
              }
            }
          }
        } catch {
          // Continue to next query if network blip occurs
          continue;
        }
      }
    }

    return discoveredDeals;
  }

  /**
   * Hunts for single top deal meeting discount threshold
   */
  static async huntTopDeal(
    postedAsins: string[] = [],
    associateTag: string = 'dealhunter-21',
    categoryPreference?: DealCategory
  ): Promise<HuntedDeal | null> {
    const deals = await this.huntTopDeals(1, postedAsins, associateTag, categoryPreference);
    return deals.length > 0 ? deals[0] : null;
  }
}
