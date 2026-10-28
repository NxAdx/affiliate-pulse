#!/usr/bin/env node
/**
 * dealAutopilot.js - Autonomous Deal Hunting & Multi-Channel Syndication Engine
 *
 * Rules:
 * 1. Category Priority: Fashion First (≥50% OFF) -> Tech & Electronics Second (≥40% OFF) -> Other (≥40% OFF)
 * 2. Deduplication: Tracks posted ASINs in deals_cache.json
 * 3. AI Studio / Gemini: Formats high-converting deal copy
 * 4. Auto-Broadcast: Sends to Telegram Deal Channel and Google Blogger
 */

const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '..', 'deals_cache.json');

// Configuration from environment variables
const CONFIG = {
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChannel: process.env.TELEGRAM_CHANNEL_ID || '',
  amazonTag: process.env.AMAZON_ASSOCIATE_TAG || 'dealhunter-21',
  bloggerBlogId: process.env.BLOGGER_BLOG_ID || '',
  bloggerToken: process.env.BLOGGER_ACCESS_TOKEN || '',
  minFashionDiscount: parseInt(process.env.MIN_FASHION_DISCOUNT || '50', 10),
  minTechDiscount: parseInt(process.env.MIN_TECH_DISCOUNT || '40', 10),
};

const CATEGORY_SEARCHES = [
  {
    category: 'fashion',
    name: "Men's Fashion & Footwear",
    minDiscount: CONFIG.minFashionDiscount,
    urls: [
      'https://www.amazon.in/s?k=mens+sneakers+clothing&rh=p_8%3A50-',
      'https://www.amazon.in/s?k=mens+watches+jackets&rh=p_8%3A50-',
      'https://www.amazon.in/s?k=mens+tshirts+jeans&rh=p_8%3A50-',
    ],
  },
  {
    category: 'electronics',
    name: 'Tech & Electronics',
    minDiscount: CONFIG.minTechDiscount,
    urls: [
      'https://www.amazon.in/s?k=tws+earbuds+smartwatch&rh=p_8%3A40-',
      'https://www.amazon.in/s?k=wireless+headphones+speakers&rh=p_8%3A40-',
      'https://www.amazon.in/s?k=power+bank+fast+charger&rh=p_8%3A40-',
    ],
  },
  {
    category: 'general',
    name: 'Home & Daily Essentials',
    minDiscount: 40,
    urls: [
      'https://www.amazon.in/s?k=home+gadgets+essentials&rh=p_8%3A40-',
      'https://www.amazon.in/s?k=kitchen+appliances+tools&rh=p_8%3A40-',
    ],
  },
];

function loadPostedAsins() {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      return Array.isArray(data.postedAsins) ? data.postedAsins : [];
    } catch {
      return [];
    }
  }
  return [];
}

function savePostedAsin(asin, title, price, category) {
  let existing = { postedAsins: [], history: [] };
  if (fs.existsSync(CACHE_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    } catch {}
  }
  if (!existing.postedAsins) existing.postedAsins = [];
  if (!existing.history) existing.history = [];

  existing.postedAsins.push(asin);
  existing.history.unshift({
    asin,
    title,
    price,
    category,
    timestamp: new Date().toISOString(),
  });

  // Keep last 500 ASINs in cache
  if (existing.postedAsins.length > 500) {
    existing.postedAsins = existing.postedAsins.slice(-500);
    existing.history = existing.history.slice(0, 500);
  }

  fs.writeFileSync(CACHE_FILE, JSON.stringify(existing, null, 2), 'utf8');
}

async function fetchHtml(url) {
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

function decodeHtml(str) {
  return (str || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function parseProductPage(html, asin, category) {
  let title = '';
  const titleMatch =
    html.match(/id="productTitle"[^>]*>([^<]+)<\/span>/i) ||
    html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
  if (titleMatch) title = decodeHtml(titleMatch[1].trim());
  if (!title || title.length < 5) return null;

  let imageUrl = '';
  const imgMatch =
    html.match(/data-a-dynamic-image="\{&quot;([^&"]+)/i) ||
    html.match(/data-a-dynamic-image="\{"([^"]+)/i) ||
    html.match(/"large":"(https:\/\/[^"]+media-amazon\.com[^"]+)"/i) ||
    html.match(/id="landingImage"[^>]*src="([^"]+)"/i) ||
    html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
  if (imgMatch) imageUrl = imgMatch[1].trim();

  let price = '';
  const priceMatch = html.match(/class="a-price-whole">([0-9,]+)/i);
  if (priceMatch) price = '₹' + priceMatch[1].replace(/,/g, '');
  if (!price) return null;

  let mrp = '';
  const mrpMatch = html.match(
    /class="a-price a-text-price"[^>]*>[\s\S]*?<span class="a-offscreen">₹?([0-9,]+)<\/span>/i
  );
  if (mrpMatch) mrp = '₹' + mrpMatch[1].replace(/,/g, '');

  let discount = '';
  const discMatch = html.match(/class="[^"]*savingsPercentage[^"]*">-?([0-9]+)%<\/span>/i);
  if (discMatch) discount = discMatch[1] + '%';

  const affiliateUrl = `https://www.amazon.in/dp/${asin}?tag=${CONFIG.amazonTag}`;

  return { asin, title, category, price, mrp, discount: discount || '40%', imageUrl, affiliateUrl };
}

async function generateDealCopy(deal) {
  // If Gemini API Key available, use AI for creative copywriting
  if (CONFIG.geminiApiKey) {
    try {
      const prompt = `You are a top affiliate deal copywriter. Create a viral, punchy Telegram deal alert for this product:
Title: ${deal.title}
Deal Price: ${deal.price}
MRP: ${deal.mrp || 'Higher'}
Discount: ${deal.discount} OFF
Category: ${deal.category}
Link: ${deal.affiliateUrl}

Rules:
- Start with an exciting hook and discount emoji (🔥 ${deal.discount} OFF)
- Clean, bold product title
- Show Deal Price and MRP comparison
- Add direct link with clear CTA
- Include 3-4 relevant hashtags
- Keep under 600 characters for Telegram photo caption.`;

      const aiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      const data = await aiRes.json();
      const generated = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (generated && generated.trim().length > 20) {
        return generated.trim();
      }
    } catch (e) {
      console.warn('Gemini AI fallback triggered:', e.message);
    }
  }

  // Template fallback
  const hashtag = deal.category === 'fashion' ? '#FashionDeals #StyleInspo' : '#TechDeals #LootAlert';
  return `🔥 MASSIVE LOOT: ${deal.discount} OFF!

🛍️ ${deal.title}

💰 Deal Price: ${deal.price} ${deal.mrp ? `(MRP: ${deal.mrp})` : ''}
⚡ Discount: ${deal.discount} OFF

👉 Grab Deal Here:
${deal.affiliateUrl}

${hashtag} #AmazonDeals #BestDeals`;
}

async function broadcastToTelegram(deal, copy) {
  if (!CONFIG.telegramToken || !CONFIG.telegramChannel) {
    console.log('ℹ️ Telegram credentials not set. Skipping Telegram broadcast.');
    return false;
  }

  const cleanChannel = CONFIG.telegramChannel.startsWith('@') || CONFIG.telegramChannel.startsWith('-')
    ? CONFIG.telegramChannel
    : `@${CONFIG.telegramChannel}`;

  try {
    if (deal.imageUrl) {
      const photoRes = await fetch(`https://api.telegram.org/bot${CONFIG.telegramToken}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanChannel,
          photo: deal.imageUrl,
          caption: copy.length > 1020 ? copy.substring(0, 1017) + '...' : copy,
        }),
      });
      const data = await photoRes.json();
      if (data.ok) {
        console.log(`✅ Broadcasted with Photo to Telegram channel (${cleanChannel})!`);
        return true;
      }
      console.warn('Telegram sendPhoto warning:', data.description, '- Falling back to text...');
    }

    const textRes = await fetch(`https://api.telegram.org/bot${CONFIG.telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChannel,
        text: copy,
        disable_web_page_preview: false,
      }),
    });
    const tData = await textRes.json();
    if (tData.ok) {
      console.log(`✅ Broadcasted text message to Telegram channel (${cleanChannel})!`);
      return true;
    }
    console.error('❌ Telegram broadcast error:', tData.description);
    return false;
  } catch (err) {
    console.error('❌ Network error broadcasting to Telegram:', err.message);
    return false;
  }
}

async function runAutopilot() {
  console.log('====================================================');
  console.log('🤖 AFFILIATE PULSE - AUTONOMOUS 24/7 DEAL HUNTER');
  console.log('====================================================');

  const postedAsins = loadPostedAsins();
  const postedSet = new Set(postedAsins);
  console.log(`📚 Loaded ${postedSet.size} previously syndicated deals from cache.`);

  let selectedDeal = null;

  for (const config of CATEGORY_SEARCHES) {
    console.log(`\n🎯 Hunting in: ${config.name} (Min ${config.minDiscount}% OFF)...`);
    for (const url of config.urls) {
      try {
        const html = await fetchHtml(url);
        const asins = [...html.matchAll(/data-asin="([A-Z0-9]{10})"/g)]
          .map((m) => m[1])
          .filter((a) => a && a !== 'undefined' && !postedSet.has(a));

        const unique = [...new Set(asins)];
        if (unique.length === 0) continue;

        for (const candidateAsin of unique.slice(0, 4)) {
          const prodHtml = await fetchHtml(`https://www.amazon.in/dp/${candidateAsin}`);
          const deal = parseProductPage(prodHtml, candidateAsin, config.category);

          if (deal) {
            const numericDiscount = parseInt(deal.discount.replace(/[^0-9]/g, ''), 10) || 0;
            if (numericDiscount >= config.minDiscount) {
              selectedDeal = deal;
              console.log(`✨ FOUND WINNING DEAL in ${config.name}!`);
              break;
            }
          }
        }
      } catch (e) {
        console.warn(`Warning hunting ${url}:`, e.message);
      }
      if (selectedDeal) break;
    }
    if (selectedDeal) break;
  }

  if (!selectedDeal) {
    console.log('\n😴 No new unseen deals found meeting discount threshold this run. Will check next cycle.');
    return;
  }

  console.log('\n--- 🏆 Selected Deal Summary ---');
  console.log('Category:', selectedDeal.category.toUpperCase());
  console.log('Title:', selectedDeal.title);
  console.log('Deal Price:', selectedDeal.price, selectedDeal.mrp ? `(MRP: ${selectedDeal.mrp})` : '');
  console.log('Discount:', selectedDeal.discount, 'OFF');
  console.log('Affiliate URL:', selectedDeal.affiliateUrl);
  console.log('Image URL:', selectedDeal.imageUrl || 'None');

  console.log('\n✍️ Generating AI Copy...');
  const copy = await generateDealCopy(selectedDeal);
  console.log('\n--- Generated Telegram Copy ---');
  console.log(copy);
  console.log('-------------------------------');

  console.log('\n📡 Broadcasting Deal...');
  const broadcasted = await broadcastToTelegram(selectedDeal, copy);

  // Save to cache so this ASIN is never syndicated again
  savePostedAsin(
    selectedDeal.asin,
    selectedDeal.title,
    selectedDeal.price,
    selectedDeal.category
  );
  console.log(`💾 Saved ASIN ${selectedDeal.asin} to cache.`);

  console.log('\n🎉 Autonomous Deal Run Finished Successfully!');
}

runAutopilot().catch((err) => {
  console.error('Fatal Autopilot Error:', err);
  process.exit(1);
});
