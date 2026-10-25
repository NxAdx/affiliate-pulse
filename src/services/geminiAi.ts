import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeneratedContent, ProductMetadata } from '../types';

export class GeminiAiService {
  private client: GoogleGenerativeAI | null = null;

  constructor(apiKey: string) {
    if (apiKey && apiKey.trim().length > 0) {
      try {
        this.client = new GoogleGenerativeAI(apiKey.trim());
      } catch {
        this.client = null;
      }
    }
  }

  /**
   * Robust multi-stage JSON extractor that safely handles LLM formatting quirks:
   * 1. Markdown code fences (```json ... ```)
   * 2. Outer preamble/postamble conversational text
   * 3. Trailing commas before closing braces
   * 4. Unescaped control characters in multi-line HTML strings
   * 5. Regex field extraction fallback if strict JSON parsing fails
   */
  static extractJsonFromResponse(rawText: string): any {
    if (!rawText || !rawText.trim()) {
      throw new Error('Empty response received from AI model');
    }

    let text = rawText.trim();

    // 1. Strip markdown fences if wrapped
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch && fenceMatch[1]) {
      text = fenceMatch[1].trim();
    }

    // 2. Extract outermost JSON object
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      text = text.substring(startIdx, endIdx + 1);
    }

    // 3. Attempt direct JSON.parse
    try {
      return JSON.parse(text);
    } catch {
      // 4. Sanitize common LLM quirks: trailing commas and raw control characters
      try {
        const sanitized = text
          .replace(/,\s*([}\]])/g, '$1')
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => {
            if (c === '\n') return '\\n';
            if (c === '\r') return '\\r';
            if (c === '\t') return '\\t';
            return '';
          });
        return JSON.parse(sanitized);
      } catch {
        // 5. Fallback regex extraction for individual fields
        const extractField = (fieldName: string): string => {
          const regex = new RegExp(`"${fieldName}"\\s*:\\s*"([\\s\\S]*?)(?<!\\\\)"`, 'i');
          const match = text.match(regex);
          return match ? match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t') : '';
        };

        const bloggerTitle = extractField('bloggerTitle');
        const bloggerHtmlBody = extractField('bloggerHtmlBody');
        const telegramMarkdown = extractField('telegramMarkdown');
        const whatsappMessage = extractField('whatsappMessage');
        const tweetText = extractField('tweetText');
        const pinterestTitle = extractField('pinterestTitle');
        const pinterestDescription = extractField('pinterestDescription');
        const pinBadgeText = extractField('pinBadgeText');
        const pinPriceTag = extractField('pinPriceTag');

        if (bloggerTitle || pinterestTitle) {
          return {
            bloggerTitle,
            bloggerHtmlBody,
            telegramMarkdown,
            whatsappMessage,
            tweetText,
            pinterestTitle,
            pinterestDescription,
            pinBadgeText,
            pinPriceTag,
            pinterestTags: ['#MensFashion', '#Style', '#Deals'],
          };
        }

        throw new Error('Could not parse valid content payload from AI response');
      }
    }
  }

  /**
   * Generates comprehensive content for Tech & Electronics
   * (Blogger 500-word SEO Review + Telegram Deal Alert + WhatsApp/X hooks)
   */
  async generateElectronicsDeal(product: ProductMetadata): Promise<GeneratedContent> {
    if (!this.client) {
      return this.generateFallbackElectronics(product);
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

Product Title: ${product.title}
Platform: ${product.platform.toUpperCase()}
Current Deal Price: ${product.currentPrice}
Original MRP: ${product.originalPrice || 'N/A'}
Discount: ${product.discountPercent || 'Special Discount'}
Affiliate URL: ${product.affiliateUrl}
Product Overview: ${product.description}

REQUIREMENTS:
1. "bloggerTitle": An SEO-optimized review title under 70 characters with year 2026 and buyer intent (e.g. "[Product Name] Review: Is It Worth Buying in 2026?").
2. "bloggerHtmlBody": A complete, structured 500-word SEO article in clean HTML (do not include <html> or <body> tags, only content):
   - <div class="review-article">
   - Introduction paragraph explaining what the product is and who it's for.
   - <h3>🔥 Deal & Pricing Overview</h3> with comparison of deal price vs original MRP.
   - <h3>⚙️ Key Specifications & Features</h3> with an HTML <table> (Feature | Specification).
   - <h3>💡 Why This Product Stands Out</h3> with 3 detailed bullet points.
   - <h3>⚖️ Pros & Cons</h3> with styled lists (<ul class="pros"> and <ul class="cons">).
   - <h3>🏁 Final Verdict & Buyer Advice</h3>
   - A styled CTA box: <div style="text-align:center; margin:24px 0;"><a href="${product.affiliateUrl}" style="background:#10b981; color:#ffffff; padding:14px 28px; text-decoration:none; font-size:16px; font-weight:bold; border-radius:8px; display:inline-block;" target="_blank" rel="nofollow noopener">⚡ Check Live Deal On ${product.platform.toUpperCase()} &rarr;</a></div>
   - <p><small>*Disclaimer: Prices and availability are subject to change. As an affiliate partner, we may earn a small commission on qualifying purchases at no extra cost to you.</small></p>
   - </div>
3. "telegramMarkdown": Urgent, punchy Telegram deal alert using emojis (🔥, ⚡, 🛒, 🏷️), price drop callout, strikethrough original price, 3 quick feature bullets, and clean direct link:
   🔥 *LOOT DEAL ALERT* 🔥\\n\\n*${product.title.replace(/[*_`]/g, '')}*\\n\\n💰 *Deal Price:* ${product.currentPrice} ~(${product.originalPrice || ''})~\\n📉 *Discount:* ${product.discountPercent || 'Huge Savings'}\\n\\n⚡ *Key Highlights:*\\n• High-performance segment leader\\n• Certified authentic with warranty\\n• Fast shipping available\\n\\n🛒 *Buy Now Before Deal Ends:*\\n👉 ${product.affiliateUrl}
4. "whatsappMessage": A high-converting WhatsApp deal message. MUST include:
   - Catchy price-drop alert line with emojis (🔥, ⚡)
   - Product title
   - Explicit price line showing current deal price: "💰 Deal Price: ${product.currentPrice}" and original MRP: "${product.originalPrice || ''}"
   - Discount callout: "${product.discountPercent || 'Limited Time Offer'}"
   - Direct affiliate link: "👉 Grab Deal: ${product.affiliateUrl}"
5. "tweetText": A viral X/Twitter hook under 260 characters with discount %, direct affiliate link, and hashtags (#TechDeals #${product.platform} #Deals).

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

      let whatsappMsg = parsed.whatsappMessage || this.generateFallbackElectronics(product).whatsappMessage;
      if (whatsappMsg && !whatsappMsg.includes(product.currentPrice) && !whatsappMsg.includes('₹')) {
        whatsappMsg = `🔥 *Price Drop Alert!*\n*${product.title}*\n\n💰 *Deal Price:* ${product.currentPrice} ${product.originalPrice ? `~(${product.originalPrice})~` : ''} (${product.discountPercent || 'Special Offer'})\n\n👉 Grab Deal: ${product.affiliateUrl}`;
      }

      return {
        category: 'electronics',
        bloggerTitle: parsed.bloggerTitle || `${product.title} Review & Deals`,
        bloggerHtmlBody: parsed.bloggerHtmlBody || this.generateFallbackElectronics(product).bloggerHtmlBody,
        telegramMarkdown: parsed.telegramMarkdown || this.generateFallbackElectronics(product).telegramMarkdown,
        whatsappMessage: whatsappMsg,
        tweetText: parsed.tweetText || this.generateFallbackElectronics(product).tweetText,
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

Product Title: ${product.title}
Platform: ${product.platform.toUpperCase()}
Current Price: ${product.currentPrice}
Original Price: ${product.originalPrice || 'N/A'}
Discount: ${product.discountPercent || 'Best Price'}
Affiliate URL: ${product.affiliateUrl}

REQUIREMENTS:
1. "pinterestTitle": Searchable, click-worthy Pin title under 60 characters tailored for Pinterest visual search (e.g., "Trending Minimalist Outfit Pick 2026 | Under ${product.currentPrice}").
2. "pinterestDescription": 2 sentences of stylish pairing advice (what shoes/trousers/accessories to pair it with) ending with "Tap to shop the full look directly."
3. "pinBadgeText": Punchy uppercase outfit badge for the visual banner (e.g. MUST-HAVE OUTFIT, TRENDING LOOK, OLD MONEY FIT, STREETWEAR ESSENTIAL, SMART CASUAL). Max 20 chars.
4. "pinPriceTag": Clean formatted price string (e.g. "${product.currentPrice}").
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

      return {
        category: 'fashion',
        pinterestTitle: parsed.pinterestTitle || `Stylist Pick: ${product.title.slice(0, 50)}`,
        pinterestDescription: parsed.pinterestDescription || this.generateFallbackFashion(product).pinterestDescription,
        pinBadgeText: parsed.pinBadgeText || 'MUST-HAVE LOOK',
        pinPriceTag: parsed.pinPriceTag || product.currentPrice,
        pinterestTags: Array.isArray(parsed.pinterestTags) && parsed.pinterestTags.length > 0
          ? parsed.pinterestTags
          : ['#MensFashion', '#OOTDMen', '#StreetwearLook', '#MensStyle'],
      };
    } catch {
      return this.generateFallbackFashion(product);
    }
  }

  /**
   * Resilient offline fallback generator for Electronics & Tech deals
   */
  generateFallbackElectronics(p: ProductMetadata): GeneratedContent {
    const platformName = p.platform === 'amazon' ? 'Amazon' : p.platform === 'flipkart' ? 'Flipkart' : 'Online Store';
    return {
      category: 'electronics',
      bloggerTitle: `${p.title} Review & Lowest Price Deal (2026)`,
      bloggerHtmlBody: `
<div class="pulse-review-container" style="font-family:system-ui, -apple-system, sans-serif; line-height:1.7; color:#1e293b; max-width:760px; margin:0 auto; padding:20px;">
  <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:24px; margin-bottom:24px;">
    <h2 style="margin-top:0; color:#0f172a; font-size:24px;">Overview: ${p.title}</h2>
    <p style="font-size:16px; color:#475569;">${p.description}</p>
    <div style="display:flex; flex-wrap:wrap; gap:16px; background:#ecfdf5; border:1px solid #a7f3d0; border-radius:8px; padding:16px; margin:20px 0; align-items:center;">
      <div>
        <span style="font-size:12px; text-transform:uppercase; color:#047857; font-weight:bold; letter-spacing:0.5px;">Deal Price</span>
        <div style="font-size:26px; font-weight:800; color:#065f46;">${p.currentPrice}</div>
      </div>
      ${p.originalPrice ? `<div style="text-decoration:line-through; color:#94a3b8; font-size:18px;">${p.originalPrice}</div>` : ''}
      <div style="background:#fef3c7; color:#92400e; font-weight:bold; padding:4px 10px; border-radius:6px; font-size:14px;">${p.discountPercent || 'Special Offer'}</div>
    </div>
    <div style="text-align:center; margin-top:20px;">
      <a href="${p.affiliateUrl}" style="background:#10b981; color:#ffffff; padding:14px 28px; text-decoration:none; font-size:16px; font-weight:bold; border-radius:8px; display:inline-block; box-shadow:0 4px 6px -1px rgba(16, 185, 129, 0.4);" target="_blank" rel="nofollow noopener">⚡ Check Today's Deal on ${platformName} &rarr;</a>
    </div>
  </div>

  <h3 style="color:#0f172a; border-bottom:2px solid #e2e8f0; padding-bottom:8px; font-size:20px;">⚙️ Key Specifications</h3>
  <table style="width:100%; border-collapse:collapse; margin:16px 0;">
    <tbody>
      <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px; font-weight:bold; width:35%; background:#f8fafc;">Platform</td><td style="padding:10px;">${platformName}</td></tr>
      <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px; font-weight:bold; background:#f8fafc;">Current Pricing</td><td style="padding:10px;">${p.currentPrice}</td></tr>
      <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px; font-weight:bold; background:#f8fafc;">Discount Status</td><td style="padding:10px;">${p.discountPercent || 'Active Discount'}</td></tr>
      <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px; font-weight:bold; background:#f8fafc;">Authenticity</td><td style="padding:10px;">100% Genuine with Official Brand Warranty</td></tr>
    </tbody>
  </table>

  <h3 style="color:#0f172a; font-size:20px;">💡 Why You Should Buy This</h3>
  <ul>
    <li><strong>Top Tier Performance:</strong> Highly rated in its category for reliability and day-to-day usability.</li>
    <li><strong>Unmatched Value:</strong> Provides features typically found in premium price brackets at an accessible price point.</li>
    <li><strong>Hassle-Free Returns:</strong> Supported by standard platform return policy and secure payment methods.</li>
  </ul>

  <h3 style="color:#0f172a; font-size:20px;">⚖️ Pros &amp; Cons</h3>
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:16px 0;">
    <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:16px; border-radius:8px;">
      <h4 style="color:#166534; margin-top:0;">✅ What We Like</h4>
      <ul style="margin:0; padding-left:20px; color:#15803d;">
        <li>High build quality &amp; design</li>
        <li>Excellent price-to-performance ratio</li>
        <li>Backed by brand warranty</li>
      </ul>
    </div>
    <div style="background:#fef2f2; border:1px solid #fecaca; padding:16px; border-radius:8px;">
      <h4 style="color:#991b1b; margin-top:0;">⚠️ Things to Consider</h4>
      <ul style="margin:0; padding-left:20px; color:#b91c1c;">
        <li>Flash deal stock is strictly limited</li>
        <li>Prices may fluctuate dynamically</li>
      </ul>
    </div>
  </div>

  <div style="text-align:center; margin:32px 0;">
    <a href="${p.affiliateUrl}" style="background:#2563eb; color:#ffffff; padding:14px 32px; text-decoration:none; font-size:16px; font-weight:bold; border-radius:8px; display:inline-block;" target="_blank" rel="nofollow noopener">👉 Buy ${p.title.slice(0, 35)} On ${platformName} Now</a>
  </div>

  <p style="font-size:12px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:12px;">*Disclosure: As an affiliate, we earn from qualifying purchases. This helps support our reviews at no additional cost to you.</p>
</div>
      `.trim(),
      telegramMarkdown: `🔥 *LOOT DEAL ALERT* 🔥\n\n*${p.title.replace(/[*_`]/g, '')}*\n\n💰 *Deal Price:* ${p.currentPrice} ${p.originalPrice ? `~(${p.originalPrice})~` : ''}\n📉 *Offer:* ${p.discountPercent || 'Limited Time'}\n\n⚡ *Highlights:*\n• Best price in this segment\n• 100% Genuine with official warranty\n• High customer rating\n\n🛒 *Grab Deal Before Price Increases:*\n👉 ${p.affiliateUrl}`,
      whatsappMessage: `🔥 *Price Drop Alert!*\nGet *${p.title}* for just *${p.currentPrice}* (${p.discountPercent || 'Special Deal'}) on ${platformName}!\n\n👉 Grab it now: ${p.affiliateUrl}`,
      tweetText: `⚡ Price drop alert! Get ${p.title.slice(0, 80)} for just ${p.currentPrice} (${p.discountPercent || 'Save big'}) on #${platformName}!\n\nGrab deal 👉 ${p.affiliateUrl}\n#TechDeals #Deals #Shopping`,
    };
  }

  /**
   * Resilient offline fallback generator for Men's Fashion Pins
   */
  generateFallbackFashion(p: ProductMetadata): GeneratedContent {
    return {
      category: 'fashion',
      pinterestTitle: `Minimalist Men's Outfit: ${p.title.slice(0, 45)}`,
      pinterestDescription: `Elevate your everyday rotation with this versatile wardrobe staple. Pair with tailored trousers or clean sneakers for a refined aesthetic. Tap to shop the full look directly!`,
      pinBadgeText: 'TRENDING LOOK',
      pinPriceTag: p.currentPrice,
      pinterestTags: ['#MensFashion', '#OOTDMen', '#StyleInspiration', '#StreetwearLook', '#Menswear2026'],
    };
  }
}