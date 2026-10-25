import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeneratedContent, ProductMetadata } from '../types';

export class GeminiAiService {
  private client: GoogleGenerativeAI | null = null;

  constructor(apiKey: string) {
    if (apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Generates comprehensive content for Tech & Electronics
   * (Blogger SEO Review + Telegram Deal Alert + WhatsApp/X hooks)
   */
  async generateElectronicsDeal(product: ProductMetadata): Promise<GeneratedContent> {
    if (!this.client) {
      return this.generateFallbackElectronics(product);
    }

    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
You are an expert affiliate marketer and SEO tech copywriter.
Create high-converting, platform-tailored promotional copy for the following product:
Product Title: ${product.title}
Price: ${product.currentPrice} (Original: ${product.originalPrice || 'N/A'}, Discount: ${product.discountPercent || 'Special Offer'})
Affiliate URL: ${product.affiliateUrl}
Product Description: ${product.description}

Return ONLY valid JSON matching this exact structure:
{
  "bloggerTitle": "SEO-friendly review title under 70 chars",
  "bloggerHtmlBody": "Full 500-word SEO review in valid semantic HTML with <h2>Specifications</h2>, <h3>Why Buy This Product?</h3>, <ul>Pros and Cons</ul>, and a styled CTA button linking to affiliateUrl",
  "telegramMarkdown": "Urgent, punchy Telegram deal alert with emojis (🔥, ⚡, 🛒), price drop callout, and direct affiliate link",
  "whatsappMessage": "3-line conversational deal alert with affiliate link",
  "tweetText": "Viral X/Twitter hook under 260 chars with #TechDeals hashtags and link"
}
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        category: 'electronics',
        bloggerTitle: parsed.bloggerTitle,
        bloggerHtmlBody: parsed.bloggerHtmlBody,
        telegramMarkdown: parsed.telegramMarkdown,
        whatsappMessage: parsed.whatsappMessage,
        tweetText: parsed.tweetText,
      };
    } catch {
      return this.generateFallbackElectronics(product);
    }
  }

  /**
   * Generates high-converting visual Pin copy for Men's Fashion
   */
  async generateFashionPin(product: ProductMetadata): Promise<GeneratedContent> {
    if (!this.client) {
      return this.generateFallbackFashion(product);
    }

    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
You are a top Pinterest fashion strategist and menswear stylist.
Create viral Pinterest pin copy for this men's fashion item:
Title: ${product.title}
Price: ${product.currentPrice} (${product.discountPercent || 'Best Deal'})
Affiliate URL: ${product.affiliateUrl}

Return ONLY valid JSON matching this structure:
{
  "pinterestTitle": "Click-worthy Pinterest Pin Title under 60 chars",
  "pinterestDescription": "Compelling 2-sentence styling advice including direct affiliate link callout",
  "pinBadgeText": "Short uppercase ribbon badge (e.g., TRENDING LOOK, MUST-HAVE OUTFIT, MINIMAL STREETWEAR)",
  "pinPriceTag": "${product.currentPrice}",
  "pinterestTags": ["#MensFashion", "#MensStyle", "#Streetwear", "#AffordableFashion", "#OutfitInspo"]
}
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        category: 'fashion',
        pinterestTitle: parsed.pinterestTitle,
        pinterestDescription: parsed.pinterestDescription,
        pinBadgeText: parsed.pinBadgeText,
        pinPriceTag: parsed.pinPriceTag,
        pinterestTags: parsed.pinterestTags || ['#MensFashion', '#Style'],
      };
    } catch {
      return this.generateFallbackFashion(product);
    }
  }

  private generateFallbackElectronics(p: ProductMetadata): GeneratedContent {
    return {
      category: 'electronics',
      bloggerTitle: `${p.title} Review & Deals - Is It Worth Buying?`,
      bloggerHtmlBody: `
        <article class="product-review">
          <h2>Overview: ${p.title}</h2>
          <p>${p.description}</p>
          <div class="deal-highlight" style="padding:16px; background:#f0fdf4; border-radius:8px; border:1px solid #86efac; margin:16px 0;">
            <p><strong>Current Deal Price:</strong> ${p.currentPrice} <em>(${p.discountPercent || 'Limited Time'})</em></p>
            <a href="${p.affiliateUrl}" style="display:inline-block; padding:12px 24px; background:#10b981; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold;">Grab Deal On Store &rarr;</a>
          </div>
          <h3>Key Features</h3>
          <ul>
            <li>Premium build quality and top performance</li>
            <li>Unbeatable price-to-performance ratio in this segment</li>
            <li>Backed by full manufacturer warranty</li>
          </ul>
        </article>
      `,
      telegramMarkdown: `🔥 *LOOT DEAL ALERT* 🔥\n\n*${p.title}*\n\n💰 *Price:* ${p.currentPrice} ~(${p.originalPrice || ''})~\n⚡ *Offer:* ${p.discountPercent || 'Mega Discount'}\n\n👇 *Buy Here With Discount:*\n${p.affiliateUrl}`,
      whatsappMessage: `🔥 Check out this mega deal on ${p.title} for just ${p.currentPrice}! Grab it here: ${p.affiliateUrl}`,
      tweetText: `⚡ Price drop alert! Get ${p.title} at ${p.currentPrice} (${p.discountPercent || 'Save big'})! Grab before it's gone: ${p.affiliateUrl} #Deals #Shopping`,
    };
  }

  private generateFallbackFashion(p: ProductMetadata): GeneratedContent {
    return {
      category: 'fashion',
      pinterestTitle: `Minimalist Men's Outfit Pick: ${p.title.slice(0, 45)}`,
      pinterestDescription: `Upgrade your daily wardrobe with this versatile piece. Grab it now for ${p.currentPrice} before stock runs out! Direct link in pin.`,
      pinBadgeText: 'TRENDING LOOK',
      pinPriceTag: p.currentPrice,
      pinterestTags: ['#MensFashion', '#OOTDMen', '#StyleInspiration', '#StreetwearLook'],
    };
  }
}