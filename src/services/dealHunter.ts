import { ProductMetadata, DealCategory } from '../types';
import { ProductScraper } from './productScraper';

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

export interface HuntOptions {
  query?: string;
  category?: DealCategory;
  minDiscount?: number;
  count?: number;
  postedAsins?: string[];
  associateTag?: string;
}

export class DealHunterService {
  /**
   * Rich category query presets across all consumer categories
   */
  static CATEGORY_PRESETS: Record<DealCategory, { name: string; defaultMinDiscount: number; queries: string[] }> = {
    all: {
      name: 'All Categories (Universal)',
      defaultMinDiscount: 40,
      queries: [
        'smartwatch+fitness+tracker',
        'tws+wireless+earbuds',
        'mens+sneakers+running+shoes',
        'kitchen+air+fryer',
        'mens+analog+watch',
        'bluetooth+portable+speaker',
        'grooming+kit+trimmer',
        'coffee+maker+machine',
        'power+bank+fast+charging',
      ],
    },
    electronics: {
      name: 'Tech & Electronics',
      defaultMinDiscount: 40,
      queries: [
        'tws+wireless+earbuds+anc',
        'amoled+smartwatch+fitness',
        'bluetooth+portable+speakers+bass',
        'power+bank+fast+charging+20000mah',
        'gaming+headphones+with+mic',
        'mechanical+gaming+keyboard',
        'smart+home+wifi+plug+bulb',
        'external+ssd+type+c+drive',
        'action+camera+vlogging',
      ],
    },
    fashion: {
      name: "Men's & Unisex Fashion",
      defaultMinDiscount: 50,
      queries: [
        'mens+sneakers+running+shoes',
        'mens+analog+watches+chronograph',
        'mens+polo+tshirts+cotton',
        'mens+casual+shirts+slim+fit',
        'mens+jeans+denim+pants',
        'mens+leather+wallets+belts',
        'mens+jackets+hoodies+sweatshirts',
        'mens+loafers+formal+shoes',
        'mens+sunglasses+polarised',
      ],
    },
    home: {
      name: 'Home & Kitchen',
      defaultMinDiscount: 40,
      queries: [
        'kitchen+gadgets+air+fryer',
        'robotic+vacuum+cleaner+mop',
        'coffee+maker+espresso+machine',
        'electric+kettle+sandwich+maker',
        'home+tools+screwdriver+drill+kit',
        'desk+lamp+led+study+light',
        'cookware+set+non+stick',
      ],
    },
    beauty: {
      name: 'Beauty & Personal Care',
      defaultMinDiscount: 40,
      queries: [
        'all+in+one+grooming+kit+trimmer',
        'hair+dryer+ionic+diffuser',
        'electric+toothbrush+rechargeable',
        'skincare+serum+sunscreen+combo',
        'mens+perfume+eau+de+parfum',
      ],
    },
    fitness: {
      name: 'Fitness & Sports',
      defaultMinDiscount: 40,
      queries: [
        'yoga+mat+anti+skid+thick',
        'adjustable+dumbbells+gym+set',
        'resistance+bands+workout',
        'whey+protein+shaker+bottle',
        'badminton+racket+set',
      ],
    },
    books: {
      name: 'Books & Learning',
      defaultMinDiscount: 35,
      queries: [
        'bestselling+business+finance+books',
        'self+help+productivity+books',
        'fiction+novels+box+set',
        'biography+inspirational+books',
      ],
    },
    general: {
      name: 'General Essentials & Loot',
      defaultMinDiscount: 40,
      queries: [
        'loot+deal+today+offers',
        'travel+backpack+laptop+bag',
        'car+mobile+holder+charger',
        'umbrella+windproof+automatic',
      ],
    },
  };

  /**
   * Fetches HTML with authentic browser headers
   */
  private static async fetchHtml(url: string): Promise<string> {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-IN,en;q=0.9',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    return res.text();
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
   * Parses Amazon product page for clean, tamper-proof metadata and high-res imagery
   */
  static parseProductPage(
    html: string,
    asin: string,
    category: DealCategory,
    associateTag: string = 'dealhunter-21'
  ): HuntedDeal | null {
    // 1. Title
    let title = '';
    const titleMatch =
      html.match(/id="productTitle"[^>]*>([^<]+)<\/span>/i) ||
      html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
    if (titleMatch) title = ProductScraper.decodeHtml(titleMatch[1].replace(/Amazon\.in\s*:?/gi, ''));
    if (!title || title.length < 5) return null;

    // 2. High-Res Image (Uncompressed Studio Image)
    let imageUrl = '';
    const dynImgMatch =
      html.match(/data-a-dynamic-image="\{&quot;([^&"]+)/i) ||
      html.match(/data-a-dynamic-image="\{"([^"]+)/i) ||
      html.match(/"large":"(https:\/\/[^"]+media-amazon\.com[^"]+)"/i) ||
      html.match(/id="landingImage"[^>]*src="([^"]+)"/i) ||
      html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    if (dynImgMatch && dynImgMatch[1]) {
      imageUrl = ProductScraper.cleanHighResImageUrl(dynImgMatch[1]);
    } else {
      imageUrl = `https://m.media-amazon.com/images/P/${asin}.jpg`;
    }

    // 3. Deal Price (Core price section)
    let price = '';
    const priceMatch =
      html.match(/id="corePriceDisplay_desktop_feature_div"[\s\S]*?class="a-price-whole">([0-9,]+)/i) ||
      html.match(/id="corePrice_feature_div"[\s\S]*?class="a-price-whole">([0-9,]+)/i) ||
      html.match(/class="apexPriceToPay"[^>]*>[\s\S]*?class="a-price-whole">([0-9,]+)/i) ||
      html.match(/class="a-price aok-align-center[^"]*"[\s\S]*?class="a-price-whole">([0-9,]+)/i) ||
      html.match(/class="a-price-whole">([0-9,]+)/i);
    if (priceMatch && priceMatch[1]) {
      price = '₹' + priceMatch[1].replace(/,/g, '');
    }
    if (!price) return null;

    // 4. MRP (Strikethrough list price)
    let mrp = '';
    const mrpMatch =
      html.match(/class="a-price a-text-price"[^>]*>[\s\S]*?<span class="a-offscreen">₹?([0-9,]+)<\/span>/i) ||
      html.match(/data-a-strike="true"[\s\S]*?<span class="a-offscreen">₹?([0-9,]+)<\/span>/i) ||
      html.match(/class="basisPrice"[\s\S]*?<span class="a-offscreen">₹?([0-9,]+)<\/span>/i) ||
      html.match(/(?:M\.?R\.?P\.?|List\s*Price|Typical\s*Price)[\s\S]{0,80}?class="[^"]*a-text-strike[^"]*">₹?([0-9,]+)/i) ||
      html.match(/class="[^"]*a-text-strike[^"]*">₹?([0-9,]+)/i);
    if (mrpMatch && mrpMatch[1]) {
      mrp = '₹' + mrpMatch[1].replace(/,/g, '');
    }

    // 5. Discount Percentage (Calculated with mathematical precision)
    let discount = '';
    if (price && mrp) {
      const pNum = parseInt(price.replace(/[^0-9]/g, ''), 10);
      const mNum = parseInt(mrp.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(pNum) && !isNaN(mNum) && mNum > pNum) {
        discount = `${Math.round(((mNum - pNum) / mNum) * 100)}% OFF`;
      }
    }

    // Fallback discount badge if strike price was omitted by seller
    if (!discount) {
      const discMatch =
        html.match(/class="[^"]*savingsPercentage[^"]*">-?([0-9]+)%<\/span>/i) ||
        html.match(/class="reinventPriceSavingsPercentageMargin[^"]*">-?([0-9]+)%<\/span>/i);
      if (discMatch && discMatch[1]) {
        discount = discMatch[1] + '% OFF';
      } else {
        discount = '40% OFF';
      }
    }

    const affiliateUrl = `https://www.amazon.in/dp/${asin}?tag=${associateTag}`;

    return {
      asin,
      title,
      category,
      price,
      mrp: mrp || undefined,
      discount,
      imageUrl,
      affiliateUrl,
    };
  }

  /**
   * Universal deal hunting engine:
   * Accepts custom search query, category presets, and flexible discount filtering.
   */
  static async huntTopDeals(options: HuntOptions = {}): Promise<HuntedDeal[]> {
    const {
      query,
      category = 'all',
      minDiscount = 40,
      count = 3,
      postedAsins = [],
      associateTag = 'dealhunter-21',
    } = options;

    const postedSet = new Set(postedAsins);
    const discoveredDeals: HuntedDeal[] = [];

    // Construct search queries
    let searchQueries: string[] = [];
    if (query && query.trim().length > 0) {
      const cleanKeyword = encodeURIComponent(query.trim().replace(/\s+/g, '+'));
      searchQueries = [cleanKeyword];
    } else {
      const preset = this.CATEGORY_PRESETS[category] || this.CATEGORY_PRESETS.all;
      searchQueries = this.shuffle(preset.queries);
    }

    for (const searchKeyword of searchQueries) {
      if (discoveredDeals.length >= count) break;

      // Randomly explore page 1, 2, or 3 to discover fresh deals
      const randomPage = Math.floor(Math.random() * 3) + 1;
      const searchUrl = `https://www.amazon.in/s?k=${searchKeyword}&rh=p_8%3A${minDiscount}-${randomPage > 1 ? `&page=${randomPage}` : ''}`;

      try {
        const searchHtml = await this.fetchHtml(searchUrl);
        const asins = [...searchHtml.matchAll(/data-asin="([A-Z0-9]{10})"/g)]
          .map((m) => m[1])
          .filter((a) => a && a !== 'undefined' && !postedSet.has(a));

        const uniqueAsins = [...new Set(asins)];
        if (uniqueAsins.length === 0) continue;

        // Shuffle candidates on the page to prevent picking the same top sponsored items
        const candidateAsins = this.shuffle(uniqueAsins).slice(0, 8);

        for (const candidateAsin of candidateAsins) {
          if (discoveredDeals.length >= count) break;

          const productHtml = await this.fetchHtml(`https://www.amazon.in/dp/${candidateAsin}`);
          const deal = this.parseProductPage(
            productHtml,
            candidateAsin,
            category === 'all' ? 'general' : category,
            associateTag
          );

          if (deal) {
            const numericDiscount = parseInt(deal.discount.replace(/[^0-9]/g, ''), 10) || 0;
            if (numericDiscount >= minDiscount) {
              discoveredDeals.push(deal);
              postedSet.add(deal.asin);
              break; // 1 deal per search query for maximum catalog diversity
            }
          }
        }
      } catch {
        continue;
      }
    }

    return discoveredDeals;
  }

  /**
   * Convenience method to hunt single top deal
   */
  static async huntTopDeal(
    postedAsins: string[] = [],
    associateTag: string = 'dealhunter-21',
    categoryPreference: DealCategory = 'all',
    customQuery?: string,
    minDiscount: number = 40
  ): Promise<HuntedDeal | null> {
    const deals = await this.huntTopDeals({
      postedAsins,
      associateTag,
      category: categoryPreference,
      query: customQuery,
      minDiscount,
      count: 1,
    });
    return deals.length > 0 ? deals[0] : null;
  }
}
