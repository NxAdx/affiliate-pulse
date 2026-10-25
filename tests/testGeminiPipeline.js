// tests/testGeminiPipeline.js
// Automated verification for GeminiAiService prompt pipeline, JSON extractor, and fallbacks

const assert = require('assert');

// Multi-stage extractor matching GeminiAiService.extractJsonFromResponse
function extractJsonFromResponse(rawText) {
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
      const extractField = (fieldName) => {
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

// Fallback Generators
function generateFallbackElectronics(p) {
  const platformName = p.platform === 'amazon' ? 'Amazon' : p.platform === 'flipkart' ? 'Flipkart' : 'Online Store';
  return {
    category: 'electronics',
    bloggerTitle: `${p.title} Review & Lowest Price Deal (2026)`,
    bloggerHtmlBody: `
<div class="pulse-review-container">
  <h2>Overview: ${p.title}</h2>
  <p>${p.description}</p>
  <div class="deal-box">
    <span>Deal Price: ${p.currentPrice}</span>
    <span>MRP: ${p.originalPrice || 'N/A'}</span>
  </div>
  <table class="specs-table">
    <tr><td>Platform</td><td>${platformName}</td></tr>
    <tr><td>Price</td><td>${p.currentPrice}</td></tr>
  </table>
  <div class="cta"><a href="${p.affiliateUrl}">Check Today's Deal &rarr;</a></div>
</div>`.trim(),
    telegramMarkdown: `🔥 *LOOT DEAL ALERT* 🔥\n\n*${p.title.replace(/[*_`]/g, '')}*\n\n💰 *Deal Price:* ${p.currentPrice}\n🛒 *Buy Now:*\n👉 ${p.affiliateUrl}`,
    whatsappMessage: `🔥 Check out ${p.title} for ${p.currentPrice}! Grab it here: ${p.affiliateUrl}`,
    tweetText: `⚡ Price drop alert! Get ${p.title.slice(0, 80)} at ${p.currentPrice}! 👉 ${p.affiliateUrl} #TechDeals`,
  };
}

function generateFallbackFashion(p) {
  return {
    category: 'fashion',
    pinterestTitle: `Minimalist Men's Outfit: ${p.title.slice(0, 45)}`,
    pinterestDescription: `Elevate your everyday rotation with this versatile wardrobe staple. Tap to shop the full look directly!`,
    pinBadgeText: 'TRENDING LOOK',
    pinPriceTag: p.currentPrice,
    pinterestTags: ['#MensFashion', '#OOTDMen', '#StyleInspiration', '#StreetwearLook', '#Menswear2026'],
  };
}

// --- RUN TESTS ---
console.log('🧪 Starting Gemini AI Prompt Pipeline & JSON Extractor Tests...\n');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

// Test 1: Clean JSON Extraction
runTest('Extracts clean standard JSON', () => {
  const input = '{"bloggerTitle": "Sony WH-1000XM5 Review", "telegramMarkdown": "Deal Alert"}';
  const result = extractJsonFromResponse(input);
  assert.strictEqual(result.bloggerTitle, 'Sony WH-1000XM5 Review');
  assert.strictEqual(result.telegramMarkdown, 'Deal Alert');
});

// Test 2: Markdown Fenced JSON with leading/trailing chatter
runTest('Extracts fenced JSON with conversational chatter', () => {
  const input = `
Here is the requested promotional payload for the product:
\`\`\`json
{
  "bloggerTitle": "MacBook Air M3 In-Depth Review",
  "telegramMarkdown": "🔥 LOOT DEAL 🔥",
  "whatsappMessage": "3-line alert",
  "tweetText": "Viral tweet"
}
\`\`\`
Hope this helps your affiliate campaign!
  `;
  const result = extractJsonFromResponse(input);
  assert.strictEqual(result.bloggerTitle, 'MacBook Air M3 In-Depth Review');
  assert.strictEqual(result.telegramMarkdown, '🔥 LOOT DEAL 🔥');
});

// Test 3: Trailing Commas in JSON
runTest('Handles trailing commas in JSON object', () => {
  const input = `{"bloggerTitle": "boAt Rockerz 450", "pinPriceTag": "₹1,299",}`;
  const result = extractJsonFromResponse(input);
  assert.strictEqual(result.bloggerTitle, 'boAt Rockerz 450');
  assert.strictEqual(result.pinPriceTag, '₹1,299');
});

// Test 4: Multi-line HTML body with literal newlines inside string
runTest('Handles multi-line HTML string with unescaped newlines', () => {
  const input = `
\`\`\`json
{
  "bloggerTitle": "Samsung Galaxy S24 Ultra Review",
  "bloggerHtmlBody": "<div>
    <h2>Overview</h2>
    <p>Great phone</p>
  </div>",
  "telegramMarkdown": "Deal Alert"
}
\`\`\`
  `;
  const result = extractJsonFromResponse(input);
  assert.strictEqual(result.bloggerTitle, 'Samsung Galaxy S24 Ultra Review');
  assert(result.bloggerHtmlBody.includes('<h2>Overview</h2>'));
});

// Test 5: Fallback regex extraction on truncated/corrupted JSON
runTest('Recovers fields via regex fallback on truncated JSON', () => {
  const input = `{"bloggerTitle": "Logitech MX Master 3S", "telegramMarkdown": "🔥 Massive Deal"`;
  const result = extractJsonFromResponse(input);
  assert.strictEqual(result.bloggerTitle, 'Logitech MX Master 3S');
  assert.strictEqual(result.telegramMarkdown, '🔥 Massive Deal');
});

// Test 6: Throws error on empty response
runTest('Throws error on empty or whitespace response', () => {
  assert.throws(() => extractJsonFromResponse('   '), /Empty response/);
});

// Test 7: Electronics Deal Fallback Verification
runTest('Electronics fallback produces complete structured multichannel content', () => {
  const mockProduct = {
    originalUrl: 'https://amzn.to/3xyz',
    canonicalUrl: 'https://www.amazon.in/dp/B09XYZ1234',
    affiliateUrl: 'https://www.amazon.in/dp/B09XYZ1234/?tag=pulse-21',
    platform: 'amazon',
    title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
    description: 'Industry-leading noise cancellation with 30-hour battery life.',
    imageUrl: 'https://m.media-amazon.com/images/I/61+El0Z+rIL._SL1500_.jpg',
    currentPrice: '₹26,990',
    originalPrice: '₹34,990',
    discountPercent: '23% OFF',
    features: ['ANC', '30hr battery', 'Hi-Res Audio'],
  };

  const fallback = generateFallbackElectronics(mockProduct);
  assert.strictEqual(fallback.category, 'electronics');
  assert(fallback.bloggerTitle.includes('Sony WH-1000XM5'));
  assert(fallback.bloggerHtmlBody.includes('specs-table'));
  assert(fallback.bloggerHtmlBody.includes('pulse-21'));
  assert(fallback.telegramMarkdown.includes('LOOT DEAL ALERT'));
  assert(fallback.telegramMarkdown.includes('₹26,990'));
  assert(fallback.whatsappMessage.includes('pulse-21'));
  assert(fallback.tweetText.length <= 280);
});

// Test 8: Fashion Pin Fallback Verification
runTest('Fashion fallback produces complete Pinterest visual copy & tags', () => {
  const mockFashionProduct = {
    originalUrl: 'https://www.myntra.com/shirts/roadster/12345',
    canonicalUrl: 'https://www.myntra.com/shirts/roadster/12345',
    affiliateUrl: 'https://earnkaro.com/make-profit-link?url=...',
    platform: 'myntra',
    title: 'Roadster Men Regular Fit Casual Cotton Linen Shirt',
    description: 'Breezy summer linen shirt in olive green.',
    imageUrl: 'https://assets.myntassets.com/h_1440,q_90,w_1080/v1/assets/images/12345.jpg',
    currentPrice: '₹899',
    originalPrice: '₹1,999',
    discountPercent: '55% OFF',
    features: ['100% Linen', 'Breathable'],
  };

  const fallback = generateFallbackFashion(mockFashionProduct);
  assert.strictEqual(fallback.category, 'fashion');
  assert(fallback.pinterestTitle.includes("Minimalist Men's Outfit"));
  assert.strictEqual(fallback.pinBadgeText, 'TRENDING LOOK');
  assert.strictEqual(fallback.pinPriceTag, '₹899');
  assert(Array.isArray(fallback.pinterestTags));
  assert(fallback.pinterestTags.includes('#MensFashion'));
});

console.log(`\n========================================`);
console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
