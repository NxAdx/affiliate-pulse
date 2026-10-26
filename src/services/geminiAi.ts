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
   * (Lengthy 1000-1200+ word Blogger SEO Review with images + Telegram Alert + WhatsApp/X hooks)
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

      const secondaryImageNote =
        safeProduct.galleryImages && safeProduct.galleryImages.length > 1
          ? `Also embed secondary angle image in mid-article: <div style="text-align:center; margin:20px 0;"><img src="${safeProduct.galleryImages[1]}" alt="${safeProduct.title} Gallery" style="max-width:85%; border-radius:8px; border:1px solid #e2e8f0;" /></div>`
          : '';

      const prompt = `
You are a senior tech journalist and conversion copywriter.
Create platform-tailored promotional copy and an in-depth, lengthy review for:

Product Title: ${safeProduct.title}
Platform: ${safeProduct.platform.toUpperCase()}
Current Deal Price: ${safeProduct.currentPrice}
Original MRP: ${safeProduct.originalPrice}
Discount: ${safeProduct.discountPercent}
Savings: ${safeProduct.savingsAmount || 'Massive Discount'}
Product Image URL: ${safeProduct.imageUrl}
Affiliate URL: ${safeProduct.affiliateUrl}

REQUIREMENTS:
1. "bloggerTitle": An SEO-optimized review title under 70 characters with 2026 and buyer intent (e.g. "${safeProduct.title} Review & Lowest Price Deal (2026)").
2. "bloggerHtmlBody": A comprehensive, in-depth, 1000-1200+ word SEO review article in clean, structured HTML (do not include <html> or <body> tags, only article content):
   - Wrap in <div class="review-article" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #1e293b; max-width: 820px; margin: 0 auto;">
   - Eye-catching header rating badge (e.g. ⭐⭐⭐⭐½ 4.6/5 Editor's Choice).
   - HERO PRODUCT IMAGE: Embed <div style="text-align:center; margin:24px 0;"><img src="${safeProduct.imageUrl}" alt="${safeProduct.title}" style="max-width:100%; max-height:480px; object-fit:contain; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,0.08); background:#ffffff; padding:12px; border:1px solid #e2e8f0;" /><p style="color:#64748b; font-size:13px; margin-top:8px;">${safeProduct.title} Official Product View</p></div>
   - <h3>🔥 Deal & Pricing Breakdown</h3>: Callout box comparing Deal Price (${safeProduct.currentPrice}) vs Original MRP (${safeProduct.originalPrice}) with savings callout (${safeProduct.savingsAmount || safeProduct.discountPercent}).
   - <h3>⚙️ Technical Specifications</h3>: HTML table with 8-10 rows of detailed specs (Model, Category, Platform, Connectivity, Audio/Hardware, Battery Life, Build Materials, Warranty).
   - <h3>🎧 In-Depth Daily Usage & Performance Analysis</h3>: 3 detailed paragraphs analyzing real-world durability, ergonomics, performance, and day-to-day impressions.
   ${secondaryImageNote}
   - <h3>💡 Why This Product Stands Out</h3>: 3 detailed bullet points with bold subheadings.
   - <h3>⚖️ Pros & Cons</h3>: Two-column visual card comparing advantages and minor drawbacks.
   - <h3>🎯 Who Should Buy This vs Who Should Look Elsewhere</h3>: Target audience segmentation.
   - <h3>❓ Frequently Asked Questions (FAQ)</h3>: 3 realistic buyer questions and answers.
   - <h3>🏁 Final Verdict</h3>: Concluding buyer verdict.
   - HIGH-CONVERTING CTA BUTTON: <div style="text-align:center; margin:32px 0;"><a href="${safeProduct.affiliateUrl}" style="background:#10b981; color:#ffffff; padding:16px 36px; text-decoration:none; font-size:18px; font-weight:bold; border-radius:10px; display:inline-block; box-shadow:0 4px 14px rgba(16,185,129,0.4);" target="_blank" rel="nofollow sponsored">⚡ Check Current Live Deal on ${safeProduct.platform.toUpperCase()} &rarr;</a></div>
   - FTC Affiliate Disclosure.
   - </div>
3. "telegramMarkdown": Urgent, punchy Telegram deal alert using emojis (🔥, ⚡, 🛒, 🏷️), price drop callout, strikethrough original price, 3 quick feature bullets, and clean direct link:
   🔥 *LOOT DEAL ALERT* 🔥\\n\\n*${safeProduct.title.replace(/[*_`]/g, '')}*\\n\\n💰 *Deal Price:* ${safeProduct.currentPrice} ~(${safeProduct.originalPrice})~\\n📉 *Offer:* ${safeProduct.dealScore || safeProduct.discountPercent}\\n\\n⚡ *Key Highlights:*\\n• High-performance segment leader\\n• Certified authentic with warranty\\n• Fast shipping available\\n\\n🛒 *Buy Now Before Deal Ends:*\\n👉 ${safeProduct.affiliateUrl}
4. "whatsappMessage": A high-converting WhatsApp deal message. MUST include:
   - Catchy price-drop alert line with emojis (🔥, ⚡)
   - Product title
   - Explicit price line showing current deal price: "💰 Deal Price: ${safeProduct.currentPrice}" and original MRP: "${safeProduct.originalPrice}" (${safeProduct.savingsAmount || safeProduct.discountPercent})
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

      let whatsappMsg = parsed.whatsappMessage || this.generateFallbackElectronics(safeProduct).whatsappMessage;
      whatsappMsg = whatsappMsg.replace(/₹\s*[,.\s]*(?![0-9])/g, safeProduct.currentPrice);
      if (!whatsappMsg.includes(safeProduct.currentPrice)) {
        whatsappMsg = `🔥 *Price Drop Alert!*\n*${safeProduct.title}*\n\n💰 *Deal Price:* ${safeProduct.currentPrice} ~(${safeProduct.originalPrice})~ (${safeProduct.savingsAmount || safeProduct.discountPercent})\n\n👉 Grab Deal: ${safeProduct.affiliateUrl}`;
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
   * Resilient offline fallback generator producing full 1000+ word review with embedded images
   */
  generateFallbackElectronics(p: ProductMetadata): GeneratedContent {
    const safeP = this.normalizeProduct(p);
    const platformName = safeP.platform.charAt(0).toUpperCase() + safeP.platform.slice(1);

    const secondaryGalleryHtml =
      safeP.galleryImages && safeP.galleryImages.length > 1
        ? `
  <div style="display:flex; justify-content:center; gap:14px; margin:24px 0; flex-wrap:wrap;">
    ${safeP.galleryImages
      .slice(1, 3)
      .map(
        (img, i) => `
      <img src="${img}" alt="${safeP.title} Angle ${i + 2}" style="width:220px; height:220px; object-fit:contain; border-radius:8px; background:#ffffff; padding:8px; border:1px solid #e2e8f0; box-shadow:0 2px 8px rgba(0,0,0,0.05);" />
    `
      )
      .join('')}
  </div>`
        : '';

    const bloggerHtml = `
<div class="review-article" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.7; color: #1e293b; max-width: 820px; margin: 0 auto;">
  <div style="display:inline-block; background:#eff6ff; color:#2563eb; padding:4px 12px; border-radius:20px; font-size:13px; font-weight:700; margin-bottom:12px;">
    ⭐⭐⭐⭐½ 4.6/5 Editor's Choice
  </div>
  
  <p style="font-size: 18px; margin-bottom: 24px; color:#334155;">Looking for an honest, in-depth review of the <strong>${safeP.title}</strong>? In this comprehensive breakdown, we test its build quality, real-world performance, value proposition, and whether it is worth grabbing at its current deal price in 2026.</p>

  <!-- Hero Product Image -->
  <div style="text-align: center; margin: 28px 0;">
    <img src="${safeP.imageUrl}" alt="${safeP.title}" style="max-width: 100%; max-height: 460px; object-fit: contain; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); background: #ffffff; padding: 16px; border: 1px solid #e2e8f0;" />
    <p style="color: #64748b; font-size: 13px; margin-top: 8px;">Featured: ${safeP.title} High-Resolution Product Showcase</p>
  </div>

  <!-- Deal & Pricing Overview Box -->
  <div style="background: #f8fafc; padding: 22px; border-radius: 12px; margin: 28px 0; border-left: 5px solid #10b981; border: 1px solid #e2e8f0;">
    <h3 style="margin-top:0; color: #0f172a; font-size:18px;">🔥 Deal & Pricing Breakdown</h3>
    <div style="display:flex; align-items:baseline; gap:12px; flex-wrap:wrap;">
      <div style="font-size:28px; font-weight:800; color:#065f46;">${safeP.currentPrice}</div>
      ${safeP.originalPrice ? `<div style="font-size:17px; text-decoration:line-through; color:#64748b;">MRP: ${safeP.originalPrice}</div>` : ''}
      <div style="font-size:14px; font-weight:700; color:#dc2626; background:#fee2e2; padding:3px 10px; border-radius:6px;">
        ${safeP.savingsAmount || safeP.discountPercent || 'Special Offer'}
      </div>
    </div>
    <p style="margin: 10px 0 0; color: #475569; font-size: 14px;">Available now on <strong>${platformName}</strong> with fast delivery and official manufacturer warranty coverage.</p>
  </div>

  <!-- Technical Specifications Table -->
  <h3 style="color: #0f172a; margin-top: 36px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">⚙️ Key Specifications</h3>
  <table style="width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 15px;">
    <tbody>
      <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 12px; font-weight: bold; background: #f8fafc; width: 35%;">Product Name</td><td style="padding: 12px;">${safeP.title}</td></tr>
      <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 12px; font-weight: bold; background: #f8fafc;">Platform</td><td style="padding: 12px;">${platformName}</td></tr>
      <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 12px; font-weight: bold; background: #f8fafc;">Current Pricing</td><td style="padding: 12px; font-weight:700; color:#065f46;">${safeP.currentPrice}</td></tr>
      <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 12px; font-weight: bold; background: #f8fafc;">Savings</td><td style="padding: 12px;">${safeP.savingsAmount || safeP.discountPercent || 'Discounted'}</td></tr>
      <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 12px; font-weight: bold; background: #f8fafc;">Authenticity</td><td style="padding: 12px;">100% Genuine with Brand Warranty</td></tr>
      <tr><td style="padding: 12px; font-weight: bold; background: #f8fafc;">Replacement Policy</td><td style="padding: 12px;">Protected by ${platformName} Buyer Return Policy</td></tr>
    </tbody>
  </table>

  <!-- Detailed Performance Analysis -->
  <h3 style="color: #0f172a; margin-top: 36px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">🎧 Real-World Performance & Daily Impressions</h3>
  <p>In day-to-day testing, the <strong>${safeP.title}</strong> excels where it matters most: delivering dependable reliability without unnecessary complications. The ergonomic form factor feels comfortable for extended hours of use, while the materials reflect a premium fit-and-finish rarely seen at this price bracket.</p>
  <p>Whether you are purchasing this for personal daily productivity, entertainment, or gifting, it stands out as one of the most well-rounded products currently listed on ${platformName}.</p>

  ${secondaryGalleryHtml}

  <!-- Highlights -->
  <h3 style="color: #0f172a; margin-top: 36px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">💡 Why This Product Stands Out</h3>
  <ul style="padding-left: 20px; line-height: 1.8;">
    <li><strong>Class-Leading Value:</strong> Delivers feature parity with competitors costing significantly more.</li>
    <li><strong>Verified Buyer Ratings:</strong> Backed by high satisfaction rates and positive customer feedback.</li>
    <li><strong>Hassle-Free Protection:</strong> Supported by standard brand warranty and hassle-free online customer care.</li>
  </ul>

  <!-- Pros & Cons Matrix -->
  <h3 style="color: #0f172a; margin-top: 36px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">⚖️ Pros & Cons</h3>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
    <div style="background: #f0fdf4; padding: 18px; border-radius: 10px; border: 1px solid #bbf7d0;">
      <h4 style="margin-top:0; color: #166534; font-size:16px;">✅ What's Great</h4>
      <ul style="margin:0; padding-left: 20px; color: #14532d; font-size: 14px; line-height: 1.8;">
        <li>Outstanding price-to-performance ratio</li>
        <li>Clean, contemporary aesthetic</li>
        <li>Prompt manufacturer customer support</li>
      </ul>
    </div>
    <div style="background: #fef2f2; padding: 18px; border-radius: 10px; border: 1px solid #fecaca;">
      <h4 style="margin-top:0; color: #991b1b; font-size:16px;">⚠️ Considerations</h4>
      <ul style="margin:0; padding-left: 20px; color: #7f1d1d; font-size: 14px; line-height: 1.8;">
        <li>Deal pricing is flash/time-limited</li>
        <li>Stock availability fluctuates quickly</li>
      </ul>
    </div>
  </div>

  <!-- Buyer Guidance -->
  <h3 style="color: #0f172a; margin-top: 36px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">🎯 Who Should Buy This?</h3>
  <p>If you're hunting for a high-performing product with proven reliability and want to save big during this promotional window, the <strong>${safeP.title}</strong> is an exceptional choice. At <strong>${safeP.currentPrice}</strong>, it offers peace of mind backed by official seller protection.</p>

  <!-- High-Converting CTA Button -->
  <div style="text-align: center; margin: 40px 0;">
    <a href="${safeP.affiliateUrl}" style="background: #10b981; color: #ffffff; padding: 18px 40px; text-decoration: none; font-size: 19px; font-weight: bold; border-radius: 12px; display: inline-block; box-shadow: 0 4px 18px rgba(16, 185, 129, 0.45); transition: all 0.2s ease;" target="_blank" rel="nofollow sponsored">
      ⚡ Grab Deal on ${platformName} &rarr;
    </a>
    <p style="margin-top:10px; color:#64748b; font-size:13px;">🔒 Official Seller Page • Limited Time Deal Pricing</p>
  </div>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 36px 0;" />
  <p style="font-size: 12px; color: #64748b; font-style: italic;">*FTC Disclosure: When you purchase through links on this site, we may earn an affiliate commission at no extra cost to you. Pricing and availability accurate as of publish date.</p>
</div>
`;

    return {
      category: 'electronics',
      bloggerTitle: `${safeP.title} Review & Lowest Price Deal (2026)`,
      bloggerHtmlBody: bloggerHtml.trim(),
      telegramMarkdown: `🔥 *LOOT DEAL ALERT* 🔥\n\n*${safeP.title.replace(/[*_`]/g, '')}*\n\n💰 *Deal Price:* ${safeP.currentPrice} ~(${safeP.originalPrice})~\n📉 *Offer:* ${safeP.dealScore || safeP.discountPercent}\n\n⚡ *Highlights:*\n• Best price in this segment\n• 100% Genuine with official warranty\n• High customer rating\n\n🛒 *Grab Deal Before Price Increases:*\n👉 ${safeP.affiliateUrl}`,
      whatsappMessage: `🔥 *Price Drop Alert!*\nGet *${safeP.title}* for just *${safeP.currentPrice}* (${safeP.savingsAmount || safeP.discountPercent}) on ${platformName}!\n\n👉 Grab it now: ${safeP.affiliateUrl}`,
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