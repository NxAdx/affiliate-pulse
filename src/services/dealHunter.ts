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
        'https://www.amazon.in/s?k=mens+sneakers+running+shoes&rh=p_8%3A50-',
        'https://www.amazon.in/s?k=mens+analog+watches+chronograph&rh=p_8%3A50-',
        'https://www.amazon.in/s?k=mens+polo+tshirts+cotton&rh=p_8%3A50-',
        'https://www.amazon.in/s?k=mens+casual+shirts+slim+fit&rh=p_8%3A50-',
        'https://www.amazon.in/s?k=mens+jeans+denim+pants&rh=p_8%3A50-',
        'https://www.amazon.in/s?k=mens+leather+wallets+belts&rh=p_8%3A50-',
        'https://www.amazon.in/s?k=mens+jackets+hoodies+sweatshirts&rh=p_8%3A50-',
        'https://www.amazon.in/s?k=mens+loafers+formal+shoes&rh=p_8%3A50-',
        'https://www.amazon.in/s?k=mens+sunglasses+polarised&rh=p_8%3A50-',
        'https://www.amazon.in/s?k=mens+trackpants+gym+wear&rh=p_8%3A50-',
      ],
    },
    {
      category: 'electronics' as DealCategory,
      name: 'Tech & Electronics',
      minDiscount: 40,
      queries: [
        'https://www.amazon.in/s?k=tws+wireless+earbuds+anc&rh=p_8%3A40-',
        'https://www.amazon.in/s?k=amoled+smartwatch+fitness+tracker&rh=p_8%3A40-',
        'https://www.amazon.in/s?k=bluetooth+portable+speakers+bass&rh=p_8%3A40-',
        'https://www.amazon.in/s?k=power+bank+fast+charging+20000mah&rh=p_8%3A40-',
        'https://www.amazon.in/s?k=gaming+headphones+with+mic&rh=p_8%3A40-',
        'https://www.amazon.in/s?k=mechanical+gaming+keyboard+mouse&rh=p_8%3A40-',
        'https://www.amazon.in/s?k=smart+home+wifi+plug+bulb&rh=p_8%3A40-',
        'https://www.amazon.in/s?k=laptop+backpack+tech+organiser&rh=p_8%3A40-',
        'https://www.amazon.in/s?k=external+ssd+type+c+drive&rh=p_8%3A40-',
        'https://www.amazon.in/s?k=action+camera+vlogging+accessories&rh=p_8%3A40-',
      ],
    },
    {
      category: 'general' as DealCategory,
      name: 'Home & Daily Essentials',
      minDiscount: 40,
      queries: [
        'https://www.amazon.in/s?k=kitchen+gadgets+air+fryer&rh=p_8%3A40-',
        'https://www.amazon.in/s?k=robotic+vacuum+cleaner+mop&rh=p_8%3A40-',
        'https://www.amazon.in/s?k=coffee+maker+espresso+machine&rh=p_8%3A40-',
        'https://www.amazon.in/s?k=electric+kettle+sandwich+maker&rh=p_8%3A40-',
        'https://www.amazon.in/s?k=home+tools+screwdriver+drill+kit&rh=p_8%3A40-',
        'https://www.amazon.in/s?k=desk+lamp+led+study+light&rh=p_8%3A40-',
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

  private static shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Hunts for top deals prioritizing Fashion first (≥50% OFF), then Tech (≥40% OFF), then General
   * Discovers up to `count` unique high-discount deals with randomized query & page exploration
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

      // Randomize queries so every run explores fresh sub-niches
      const shuffledQueries = this.shuffle(config.queries);

      for (const baseQueryUrl of shuffledQueries) {
        if (discoveredDeals.length >= count) break;

        // Randomly explore page 1, 2, or 3 to avoid the exact same top sponsored listings
        const randomPage = Math.floor(Math.random() * 3) + 1;
        const queryUrl = randomPage > 1 ? `${baseQueryUrl}&page=${randomPage}` : baseQueryUrl;

        try {
          const searchHtml = await this.fetchHtml(queryUrl);
          const asins = [...searchHtml.matchAll(/data-asin="([A-Z0-9]{10})"/g)]
            .map((m) => m[1])
            .filter((a) => a && a !== 'undefined' && !postedSet.has(a));

          const uniqueAsins = [...new Set(asins)];
          if (uniqueAsins.length === 0) continue;

          // Shuffle candidate ASINs across the page to ensure fresh product selection
          const candidateAsins = this.shuffle(uniqueAsins).slice(0, 8);

          for (const candidateAsin of candidateAsins) {
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
                break; // Pick 1 deal per search query to maximize product diversity
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
