import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProductMetadata, GeneratedContent } from '../types';

export class GeminiAiService {
  private client: GoogleGenerativeAI | null = null;

  constructor(apiKey?: string) {
    if (apiKey && apiKey.trim().length > 0) {
      this.client = new GoogleGenerativeAI(apiKey.trim());
    }
  }

  /**
   * Robust multi-stage JSON extractor designed for LLM outputs.
   * Handles markdown code fences, conversational preambles, and malformed strings.
   */
  static extractJsonFromResponse(responseText: string): any {
    if (!responseText || typeof responseText !== 'string' || !responseText.trim()) {
      throw new Error('Gemini returned an empty response');
    }

    const trimmed = responseText.trim();

    // Stage 1: Standard markdown code fences (```json ... ``` or ``` ... ```)
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      const candidate = codeBlockMatch[1].trim();
      try {
        return JSON.parse(candidate);
      } catch {
        // Try sanitized version
        const sanitized = GeminiAiService.sanitizeJsonString(candidate);
        try {
          return JSON.parse(sanitized);
        } catch {
          // Fall through to regex extraction
        }
      }
    }

    // Stage 2: Outer braces matching { ... }
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = trimmed.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        const sanitized = GeminiAiService.sanitizeJsonString(candidate);
        try {
          return JSON.parse(sanitized);
        } catch {
          // Fall through to regex extraction
        }
      }
    }

    // Stage 3: Direct parse attempt
    try {
      return JSON.parse(trimmed);
    } catch {
      // Stage 4: Regex-based field extraction fallback
      return GeminiAiService.extractFieldsByRegex(trimmed);
    }
  }

  /**
   * Sanitizes broken JSON strings produced by LLMs (unescaped newlines, trailing commas, etc.)
   */
  private static sanitizeJsonString(str: string): string {
    return str
      .replace(/,\s*([}\]])/g, '$1') // Trailing commas before } or ]
      .replace(/[\u0000-\u001F]+/g, (match) => {
        // Preserve common escape sequences, encode others
        if (match === '\n') return '\\n';
        if (match === '\r') return '\\r';
        if (match === '\t') return '\\t';
        return '';
      });
  }

  /**
   * Regex extraction fallback when JSON.parse fails completely
   */
  private static extractFieldsByRegex(text: string): Record<string, any> {
    const result: Record<string, any> = {};

    const stringFields = [
      'bloggerTitle',
      'bloggerHtmlBody',
      'telegramMarkdown',
      'whatsappMessage',
      'tweetText',
      'pinterestTitle',
      'pinterestDescription',
      'pinBadgeText',
      'pinPriceTag',
    ];

    for (const field of stringFields) {
      const regex = new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, 'i');
      const match = text.match(regex);
      if (match && match[1]) {
        result[field] = match[1]
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"');
      }
    }

    // Tags array extraction
    const tagsMatch = text.match(/"pinterestTags"\s*:\s*\[([\s\S]*?)\]/i);
    if (tagsMatch && tagsMatch[1]) {
      const tagStrings = tagsMatch[1].match(/"([^"]+)"/g);
      if (tagStrings) {
        result.pinterestTags = tagStrings.map((t) => t.replace(/"/g, ''));
      }
    }

    return result;
  }

  /**
   * Ensures product pricing always contains digits and clean formatting
   */
  private normalizeProduct(product: ProductMetadata): ProductMetadata {
    let currentPrice = product.currentPrice;
    if (!currentPrice || !/\d/.test(currentPrice) || currentPrice.trim() === '₹,') {
      currentPrice = '₹1,499';
    }
    let originalPrice = product.originalPrice;
    if (!originalPrice || !/\d/.test(originalPrice)) {
      originalPrice = '₹3,999';
    }
    return {
      ...product,
      currentPrice,
      originalPrice,
      discountPercent: product.discountPercent || '50% OFF',
    };
  }

  /**
   * Generates promotional copy for Electronics & Tech
   * (Blogger 500-word SEO Review + Telegram Deal Alert + WhatsApp/X hooks)
   */
  async generateElectronicsDeal(product: ProductMetadata): Promise<GeneratedContent> {
    const safeProduct = this.normalizeProduct(product);

    if (!this.client) {
      return this.generateFallbackElectronics(safeProduct);
    }

    try {
      const model = this.client.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
        },
      });

      const prompt = `
You are an expert affiliate marketer, e-commerce copywriter, and SEO tech blogger.
Create platform-tailored promotional copy for the following tech product:

Product Title: ${safeProduct.title}
Platform: ${safeProduct.platform.toUpperCase()}
Current Deal Price: ${safeProduct.currentPrice}
Original MRP: ${safeProduct.originalPrice}
Discount: ${safeProduct.discountPercent}
Affiliate URL: ${safeProduct.affiliateUrl}
Product Overview: ${safeProduct.description}

REQUIREMENTS:
1. "bloggerTitle": An SEO-optimized review title under 70 characters with year 2026 and buyer intent (e.g. "${safeProduct.title} Review & Lowest Price Deal (2026)").
2. "bloggerHtmlBody": A complete, structured 500-word SEO article in clean HTML (do not include <html> or <body> tags, only content):
   - <div class="review-article">
   - Introduction paragraph explaining what the product is and who it's for.
   - <h3>🔥 Deal & Pricing Overview</h3> with comparison of deal price (${safeProduct.currentPrice}) vs original MRP (${safeProduct.originalPrice}).
   - <h3>⚙️ Key Specifications & Features</h3> with an HTML <table> (Feature | Specification).
   - <h3>💡 Why This Product Stands Out</h3> with 3 detailed bullet points.
   - <h3>⚖️ Pros & Cons</h3> with styled lists (<ul class="pros"> and <ul class="cons">).
   - <h3>🏁 Final Verdict & Buyer Advice</h3>
   - A styled CTA box: <div style="text-align:center; margin:24px 0;"><a href="${safeProduct.affiliateUrl}" style="background:#10b981; color:#ffffff; padding:14px 28px; text-decoration:none; font-size:16px; font-weight:bold; border-radius:8px; display:inline-block;" target="_blank" rel="nofollow noopener">⚡ Check Live Deal On ${safeProduct.platform.toUpperCase()} &rarr;</a></div>
   - <p><small>*Disclaimer: Prices and availability are subject to change. As an affiliate partner, we may earn a small commission on qualifying purchases at no extra cost to you.</small></p>
   - </div>
3. "telegramMarkdown": Urgent, punchy Telegram deal alert using emojis (🔥, ⚡, 🛒, 🏷️), price drop callout, strikethrough original price, 3 quick feature bullets, and clean direct link:
   🔥 *LOOT DEAL ALERT* 🔥\\n\\n*${safeProduct.title.replace(/[*_`]/g, '')}*\\n\\n💰 *Deal Price:* ${safeProduct.currentPrice} ~(${safeProduct.originalPrice})~\\n📉 *Discount:* ${safeProduct.discountPercent}\\n\\n⚡ *Key Highlights:*\\n• High-performance segment leader\\n• Certified authentic with warranty\\n• Fast shipping available\\n\\n🛒 *Buy Now Before Deal Ends:*\\n👉 ${safeProduct.affiliateUrl}
4. "whatsappMessage": A high-converting WhatsApp deal message. MUST include:
   - Catchy price-drop alert line with emojis (🔥, ⚡)
   - Product title
   - Explicit price line showing current deal price: "💰 Deal Price: ${safeProduct.currentPrice}" and original MRP: "${safeProduct.originalPrice}"
   - Discount callout: "${safeProduct.discountPercent}"
   - Direct affiliate link: "👉 Grab Deal: ${safeProduct.affiliateUrl}"
5. "tweetText": A viral X/Twitter hook under 260 characters with discount %, direct affiliate link, and hashtags (#TechDeals #${safeProduct.platform} #Deals).

Return ONLY valid JSON matching this exact structure:
{
  "bloggerTitle": "string",
  "bloggerHtmlBody": "string",
  "telegramMarkdown": "string",
  "whatsappMessage": "string",
  "tweetText": "string"
}
`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsed = GeminiAiService.extractJsonFromResponse(responseText);

      // Post-processing safeguards for WhatsApp, Telegram, X messages
      let whatsappMsg = parsed.whatsappMessage || this.generateFallbackElectronics(safeProduct).whatsappMessage;
      // Sanitize broken currency strings like "₹," or "₹ "
      whatsappMsg = whatsappMsg.replace(/₹\s*[,.\s]*(?![0-9])/g, safeProduct.currentPrice);
      if (!whatsappMsg.includes(safeProduct.currentPrice)) {
        whatsappMsg = `🔥 *Price Drop Alert!*\n*${safeProduct.title}*\n\n💰 *Deal Price:* ${safeProduct.currentPrice} ~(${safeProduct.originalPrice})~ (${safeProduct.discountPercent})\n\n👉 Grab Deal: ${safeProduct.affiliateUrl}`;
      }

      let telegramMsg = parsed.telegramMarkdown || this.generateFallbackElectronics(safeProduct).telegramMarkdown;
      telegramMsg = telegramMsg.replace(/₹\s*[,.\s]*(?![0-9])/g, safeProduct.currentPrice);

      let tweetText = parsed.tweetText || this.generateFallbackElectronics(safeProduct).tweetText;
      tweetText = tweetText.replace(/₹\s*[,.\s]*(?![0-9])/g, safeProduct.currentPrice);

      return {
        category: 'electronics',
        bloggerTitle: parsed.bloggerTitle || `${safeProduct.title} Review & Lowest Price Deal (2026)`,
        bloggerHtmlBody: parsed.bloggerHtmlBody || this.generateFallbackElectronics(safeProduct).bloggerHtmlBody,
        telegramMarkdown: telegramMsg,
        whatsappMessage: whatsappMsg,
        tweetText: tweetText,
      };
    } catch {
      return this.generateFallbackElectronics(safeProduct);
    }
  }

  /**
   * Generates high-converting visual Pin copy for Men's Fashion
   */
  async generateFashionPin(product: ProductMetadata): Promise<GeneratedContent> {
    const safeProduct = this.normalizeProduct(product);

    if (!this.client) {
      return this.generateFallbackFashion(safeProduct);
    }

    try {
      const model = this.client.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
        },
      });

      const prompt = `
You are a senior Pinterest fashion curator and menswear stylist.
Create viral Pinterest pin copy and styling metadata for this men's fashion item:

Product Title: ${safeProduct.title}
Platform: ${safeProduct.platform.toUpperCase()}
Current Price: ${safeProduct.currentPrice}
Original Price: ${safeProduct.originalPrice}
Discount: ${safeProduct.discountPercent}
Affiliate URL: ${safeProduct.affiliateUrl}

REQUIREMENTS:
1. "pinterestTitle": Searchable, click-worthy Pin title under 60 characters tailored for Pinterest visual search (e.g., "Trending Minimalist Outfit Pick 2026 | Under ${safeProduct.currentPrice}").
2. "pinterestDescription": 2 sentences of stylish pairing advice (what shoes/trousers/accessories to pair it with) ending with "Tap to shop the full look directly."
3. "pinBadgeText": Punchy uppercase outfit badge for the visual banner (e.g. MUST-HAVE OUTFIT, TRENDING LOOK, OLD MONEY FIT, STREETWEAR ESSENTIAL, SMART CASUAL). Max 20 chars.
4. "pinPriceTag": Clean formatted price string with digits (e.g. "${safeProduct.currentPrice}").
5. "pinterestTags": Array of 5-8 hyper-targeted Pinterest SEO hashtags (e.g. ["#MensFashion", "#OOTDMen", "#MensStyle", "#Streetwear", "#AffordableFashion"]).

Return ONLY valid JSON matching this exact structure:
{
  "pinterestTitle": "string",
  "pinterestDescription": "string",
  "pinBadgeText": "string",
  "pinPriceTag": "string",
  "pinterestTags": ["string"]
}
`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsed = GeminiAiService.extractJsonFromResponse(responseText);

      let pinPrice = parsed.pinPriceTag || safeProduct.currentPrice;
      if (!pinPrice || !/\d/.test(pinPrice) || pinPrice.trim() === '₹,') {
        pinPrice = safeProduct.currentPrice;
      }

      return {
        category: 'fashion',
        pinterestTitle: parsed.pinterestTitle || `Stylist Pick: ${safeProduct.title.slice(0, 50)}`,
        pinterestDescription: parsed.pinterestDescription || this.generateFallbackFashion(safeProduct).pinterestDescription,
        pinBadgeText: parsed.pinBadgeText || 'MUST-HAVE LOOK',
        pinPriceTag: pinPrice,
        pinterestTags: Array.isArray(parsed.pinterestTags) && parsed.pinterestTags.length > 0
          ? parsed.pinterestTags
          : ['#MensFashion', '#OOTDMen', '#StreetwearLook', '#MensStyle'],
      };
    } catch {
      return this.generateFallbackFashion(safeProduct);
    }
  }

  /**
   * Resilient offline fallback generator for Electronics & Tech deals
   */
  generateFallbackElectronics(p: ProductMetadata): GeneratedContent {
    const safeP = this.normalizeProduct(p);
    const platformName = safeP.platform.charAt(0).toUpperCase() + safeP.platform.slice(1);

    const bloggerHtml = `
<div class="review-article" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 0 auto;">
  <p style="font-size: 18px; margin-bottom: 24px;">Looking for an honest review of the <strong>${safeP.title}</strong>? In this breakdown, we examine its real-world performance, build quality, and whether it offers great value at its current deal pricing in 2026.</p>

  <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 5px solid #10b981;">
    <h3 style="margin-top:0; color: #0f172a;">🔥 Pricing & Deal Snapshot</h3>
    <div style="display:flex; align-items:baseline; gap:12px;">
      <div style="font-size:26px; font-weight:800; color:#065f46;">${safeP.currentPrice}</div>
      ${safeP.originalPrice ? `<div style="font-size:16px; text-decoration:line-through; color:#64748b;">${safeP.originalPrice}</div>` : ''}
      <div style="font-size:14px; font-weight:700; color:#dc2626;">(${safeP.discountPercent || 'Special Offer'})</div>
    </div>
    <p style="margin: 8px 0 0; color: #475569; font-size: 14px;">Available now on <strong>${platformName}</strong> with fast delivery options.</p>
  </div>

  <h3 style="color: #0f172a; margin-top: 32px;">⚙️ Key Specifications</h3>
  <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 15px;">
    <tbody>
      <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px; font-weight: bold; background: #f8fafc; width: 35%;">Product</td><td style="padding: 10px;">${safeP.title}</td></tr>
      <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px; font-weight: bold; background: #f8fafc;">Platform</td><td style="padding: 10px;">${platformName}</td></tr>
      <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px; font-weight: bold; background: #f8fafc;">Current Pricing</td><td style="padding: 10px;">${safeP.currentPrice}</td></tr>
      <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px; font-weight: bold; background: #f8fafc;">Discount</td><td style="padding: 10px;">${safeP.discountPercent || 'Discounted'}</td></tr>
      <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc;">Warranty</td><td style="padding: 10px;">Standard Brand Warranty</td></tr>
    </tbody>
  </table>

  <h3 style="color: #0f172a; margin-top: 32px;">💡 Why You Should Consider This Deal</h3>
  <ul>
    <li><strong>Outstanding Value:</strong> Offers premium-tier capabilities at a heavily discounted entry price point.</li>
    <li><strong>Verified Buyer Ratings:</strong> Consistently praised for reliability and build quality across customer reviews.</li>
    <li><strong>Hassle-Free Returns:</strong> Protected by standard ${platformName} return & replacement policies.</li>
  </ul>

  <h3 style="color: #0f172a; margin-top: 32px;">⚖️ Pros & Cons</h3>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 16px 0;">
    <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border: 1px solid #bbf7d0;">
      <h4 style="margin-top:0; color: #166534;">✅ What's Great</h4>
      <ul style="margin:0; padding-left: 20px; color: #14532d; font-size: 14px;">
        <li>High value-for-money ratio</li>
        <li>Clean, durable design</li>
        <li>Prompt manufacturer support</li>
      </ul>
    </div>
    <div style="background: #fef2f2; padding: 16px; border-radius: 8px; border: 1px solid #fecaca;">
      <h4 style="margin-top:0; color: #991b1b;">⚠️ Considerations</h4>
      <ul style="margin:0; padding-left: 20px; color: #7f1d1d; font-size: 14px;">
        <li>Deal pricing is time-sensitive</li>
        <li>Stock fluctuates rapidly</li>
      </ul>
    </div>
  </div>

  <h3 style="color: #0f172a; margin-top: 32px;">🏁 The Bottom Line</h3>
  <p>If you're seeking a dependable product that doesn't compromise on durability or essential features, the <strong>${safeP.title}</strong> is a standout choice at <strong>${safeP.currentPrice}</strong>.</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${safeP.affiliateUrl}" style="background: #10b981; color: #ffffff; padding: 16px 36px; text-decoration: none; font-size: 18px; font-weight: bold; border-radius: 10px; display: inline-block; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);" target="_blank" rel="nofollow noopener">
      ⚡ Grab Deal on ${platformName} &rarr;
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
  <p style="font-size: 12px; color: #64748b; font-style: italic;">*FTC Disclosure: When you purchase through links on this site, we may earn an affiliate commission at no extra cost to you. Pricing and availability accurate as of publish date.</p>
</div>
`;

    return {
      category: 'electronics',
      bloggerTitle: `${safeP.title} Review & Lowest Price Deal (2026)`,
      bloggerHtmlBody: bloggerHtml.trim(),
      telegramMarkdown: `🔥 *LOOT DEAL ALERT* 🔥\n\n*${safeP.title.replace(/[*_`]/g, '')}*\n\n💰 *Deal Price:* ${safeP.currentPrice} ${safeP.originalPrice ? `~(${safeP.originalPrice})~` : ''}\n📉 *Offer:* ${safeP.discountPercent || 'Limited Time'}\n\n⚡ *Highlights:*\n• Best price in this segment\n• 100% Genuine with official warranty\n• High customer rating\n\n🛒 *Grab Deal Before Price Increases:*\n👉 ${safeP.affiliateUrl}`,
      whatsappMessage: `🔥 *Price Drop Alert!*\nGet *${safeP.title}* for just *${safeP.currentPrice}* (${safeP.discountPercent || 'Special Deal'}) on ${platformName}!\n\n👉 Grab it now: ${safeP.affiliateUrl}`,
      tweetText: `⚡ Price drop alert! Get ${safeP.title.slice(0, 80)} for just ${safeP.currentPrice} (${safeP.discountPercent || 'Save big'}) on #${platformName}!\n\nGrab deal 👉 ${safeP.affiliateUrl}\n#TechDeals #Deals #Shopping`,
    };
  }

  /**
   * Resilient offline fallback generator for Fashion pins
   */
  generateFallbackFashion(p: ProductMetadata): GeneratedContent {
    const safeP = this.normalizeProduct(p);
    return {
      category: 'fashion',
      pinterestTitle: `Minimalist Style Pick: ${safeP.title.slice(0, 45)}`,
      pinterestDescription: `Upgrade your daily wardrobe with this versatile piece. Pair with neutral tones and clean footwear for an effortlessly elevated aesthetic. Tap to shop directly.`,
      pinBadgeText: 'TRENDING LOOK',
      pinPriceTag: safeP.currentPrice,
      pinterestTags: ['#MensFashion', '#OOTDMen', '#MensStyle', '#CapsuleWardrobe', '#AffordableStyle'],
    };
  }
}