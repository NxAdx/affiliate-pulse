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
  bloggerWebhookUrl:
    process.env.BLOGGER_WEBHOOK_URL ||
    'https://script.google.com/macros/s/AKfycbxh1BaXpDleljcWtTW_WSTtO-ks7UfQYQ78TkLVnYbpdgW15EiB5RycAIhgruAiRZPQ/exec',
  minFashionDiscount: parseInt(process.env.MIN_FASHION_DISCOUNT || '50', 10),
  minTechDiscount: parseInt(process.env.MIN_TECH_DISCOUNT || '40', 10),
  dealsPerRun: parseInt(
    process.env.DEALS_PER_RUN ||
      process.argv.find((a) => a.startsWith('--count='))?.split('=')[1] ||
      '3',
    10
  ),
};

const CATEGORY_SEARCHES = [
  {
    category: 'fashion',
    name: "Men's Fashion & Footwear",
    minDiscount: CONFIG.minFashionDiscount,
    urls: [
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
    category: 'electronics',
    name: 'Tech & Electronics',
    minDiscount: CONFIG.minTechDiscount,
    urls: [
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
    category: 'general',
    name: 'Home & Daily Essentials',
    minDiscount: 40,
    urls: [
      'https://www.amazon.in/s?k=kitchen+gadgets+air+fryer&rh=p_8%3A40-',
      'https://www.amazon.in/s?k=robotic+vacuum+cleaner+mop&rh=p_8%3A40-',
      'https://www.amazon.in/s?k=coffee+maker+espresso+machine&rh=p_8%3A40-',
      'https://www.amazon.in/s?k=electric+kettle+sandwich+maker&rh=p_8%3A40-',
      'https://www.amazon.in/s?k=home+tools+screwdriver+drill+kit&rh=p_8%3A40-',
      'https://www.amazon.in/s?k=desk+lamp+led+study+light&rh=p_8%3A40-',
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

function cleanHighResImageUrl(rawUrl) {
  if (!rawUrl || !rawUrl.startsWith('http')) return rawUrl;
  let clean = rawUrl.trim();
  if (clean.includes('media-amazon.com') || clean.includes('images-amazon.com') || clean.includes('ssl-images-amazon.com')) {
    clean = clean.replace(/\._[^.]+\./, '.');
  }
  return clean;
}

function parseProductPage(html, asin, category) {
  let title = '';
  const titleMatch =
    html.match(/id="productTitle"[^>]*>([^<]+)<\/span>/i) ||
    html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
  if (titleMatch) title = decodeHtml(titleMatch[1].replace(/Amazon\.in\s*:?/gi, '').trim());
  if (!title || title.length < 5) return null;

  let imageUrl = '';
  const imgMatch =
    html.match(/data-a-dynamic-image="\{&quot;([^&"]+)/i) ||
    html.match(/data-a-dynamic-image="\{"([^"]+)/i) ||
    html.match(/"large":"(https:\/\/[^"]+media-amazon\.com[^"]+)"/i) ||
    html.match(/id="landingImage"[^>]*src="([^"]+)"/i) ||
    html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
  if (imgMatch) {
    imageUrl = cleanHighResImageUrl(imgMatch[1].trim());
  } else {
    imageUrl = `https://m.media-amazon.com/images/P/${asin}.jpg`;
  }

  let price = '';
  const priceMatch =
    html.match(/id="corePriceDisplay_desktop_feature_div"[\s\S]*?class="a-price-whole">([0-9,]+)/i) ||
    html.match(/id="corePrice_feature_div"[\s\S]*?class="a-price-whole">([0-9,]+)/i) ||
    html.match(/class="apexPriceToPay"[^>]*>[\s\S]*?class="a-price-whole">([0-9,]+)/i) ||
    html.match(/class="a-price aok-align-center[^"]*"[\s\S]*?class="a-price-whole">([0-9,]+)/i) ||
    html.match(/class="a-price-whole">([0-9,]+)/i);
  if (priceMatch) price = '₹' + priceMatch[1].replace(/,/g, '');
  if (!price) return null;

  let mrp = '';
  const mrpMatch =
    html.match(/class="a-price a-text-price"[^>]*>[\s\S]*?<span class="a-offscreen">₹?([0-9,]+)<\/span>/i) ||
    html.match(/data-a-strike="true"[\s\S]*?<span class="a-offscreen">₹?([0-9,]+)<\/span>/i) ||
    html.match(/class="basisPrice"[\s\S]*?<span class="a-offscreen">₹?([0-9,]+)<\/span>/i) ||
    html.match(/(?:M\.?R\.?P\.?|List\s*Price|Typical\s*Price)[\s\S]{0,80}?class="[^"]*a-text-strike[^"]*">₹?([0-9,]+)/i) ||
    html.match(/class="[^"]*a-text-strike[^"]*">₹?([0-9,]+)/i);
  if (mrpMatch) mrp = '₹' + mrpMatch[1].replace(/,/g, '');

  let discount = '';
  if (price && mrp) {
    const pNum = parseInt(price.replace(/[^0-9]/g, ''), 10);
    const mNum = parseInt(mrp.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(pNum) && !isNaN(mNum) && mNum > pNum) {
      discount = `${Math.round(((mNum - pNum) / mNum) * 100)}%`;
    }
  }

  if (!discount) {
    const discMatch =
      html.match(/class="[^"]*savingsPercentage[^"]*">-?([0-9]+)%<\/span>/i) ||
      html.match(/class="reinventPriceSavingsPercentageMargin[^"]*">-?([0-9]+)%<\/span>/i);
    if (discMatch) discount = discMatch[1] + '%';
  }

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


async function publishToBlogger(deal) {
  if (!CONFIG.bloggerWebhookUrl && !CONFIG.bloggerToken) {
    console.log('ℹ️ Neither Blogger Webhook nor OAuth Token configured. Skipping Blogger post.');
    return false;
  }

  const title = `${deal.discount} OFF: ${deal.title.slice(0, 65)} (Deal Alert)`;
  const htmlContent = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222; max-width: 780px; margin: 0 auto; padding: 12px;">
  <h2 style="color: #1e293b;">🔥 ${deal.discount} OFF: ${deal.title}</h2>
  <div style="text-align: center; margin: 24px 0;">
    <img src="${deal.imageUrl}" alt="${deal.title}" style="max-width: 100%; max-height: 480px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.1);" />
  </div>
  <div style="background: #f8fafc; border-left: 4px solid #10B981; padding: 16px; margin: 20px 0; border-radius: 6px;">
    <p style="margin: 0; font-size: 18px; font-weight: bold;">
      Deal Price: <span style="color: #10B981;">${deal.price}</span>
      ${deal.mrp ? `<span style="text-decoration: line-through; color: #94a3b8; margin-left: 10px; font-size: 14px;">MRP: ${deal.mrp}</span>` : ''}
      <span style="background: #FEF3C7; color: #D97706; padding: 3px 8px; border-radius: 4px; font-size: 13px; margin-left: 10px;">${deal.discount} OFF</span>
    </p>
  </div>
  <h3 style="color: #334155;">Verified Deal Highlights:</h3>
  <ul>
    <li>Top verified seller on Amazon India</li>
    <li>Prime delivery eligible</li>
    <li>Authentic brand warranty included</li>
  </ul>
  <div style="text-align: center; margin: 32px 0;">
    <a href="${deal.affiliateUrl}" target="_blank" rel="noopener sponsored" style="background: #E11D48; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: bold; font-size: 16px; border-radius: 8px; display: inline-block;">👉 VIEW DEAL ON AMAZON &rarr;</a>
  </div>
</div>`;

  // Priority 1: Google Apps Script Webhook (Never Expires!)
  if (CONFIG.bloggerWebhookUrl) {
    try {
      console.log('🌐 Publishing to Blogger via Apps Script Webhook...');
      const response = await fetch(CONFIG.bloggerWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogId: CONFIG.bloggerBlogId,
          title,
          content: htmlContent,
          labels: [deal.category, 'Amazon Deals', 'Price Drop'],
        }),
        redirect: 'follow',
      });

      const text = await response.text();
      if (text.includes('Sign in - Google Accounts') || response.status === 401) {
        console.warn('⚠️ Blogger Webhook returned Google sign-in challenge. Set "Who has access" to "Anyone" in Apps Script.');
        return false;
      }

      console.log('✅ Successfully published deal to Blogger via Webhook!');
      return true;
    } catch (e) {
      console.warn('⚠️ Webhook publishing failed:', e.message);
    }
  }
  return false;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function runAutopilot() {
  console.log('====================================================');
  console.log('🤖 AFFILIATE PULSE - AUTONOMOUS 24/7 DEAL HUNTER');
  console.log('====================================================');
  console.log(`🎯 Target Batch Quota: Up to ${CONFIG.dealsPerRun} high-converting deals per run`);

  const postedAsins = loadPostedAsins();
  const postedSet = new Set(postedAsins);
  console.log(`📚 Loaded ${postedSet.size} previously syndicated deals from cache.`);

  const selectedDeals = [];

  // Round-robin across categories to guarantee varied niches (Fashion -> Tech -> Home Essentials)
  let round = 0;
  const maxRounds = 3;

  while (selectedDeals.length < CONFIG.dealsPerRun && round < maxRounds) {
    round++;

    for (const config of CATEGORY_SEARCHES) {
      if (selectedDeals.length >= CONFIG.dealsPerRun) break;
      console.log(`\n🎯 Hunting in: ${config.name} (Min ${config.minDiscount}% OFF, Round ${round})...`);

      // Shuffle query URLs to explore fresh product sub-niches each time
      const shuffledUrls = shuffle(config.urls);

      for (const baseUrl of shuffledUrls) {
        if (selectedDeals.length >= CONFIG.dealsPerRun) break;

        // Randomly explore page 1, 2, or 3 to bypass pinned/sponsored listings
        const randomPage = Math.floor(Math.random() * 3) + 1;
        const url = randomPage > 1 ? `${baseUrl}&page=${randomPage}` : baseUrl;

        try {
          const html = await fetchHtml(url);
          const asins = [...html.matchAll(/data-asin="([A-Z0-9]{10})"/g)]
            .map((m) => m[1])
            .filter((a) => a && a !== 'undefined' && !postedSet.has(a));

          const unique = [...new Set(asins)];
          if (unique.length === 0) continue;

          // Shuffle candidate ASINs across the page
          const candidateAsins = shuffle(unique).slice(0, 8);

          for (const candidateAsin of candidateAsins) {
            if (selectedDeals.length >= CONFIG.dealsPerRun) break;

            const prodHtml = await fetchHtml(`https://www.amazon.in/dp/${candidateAsin}`);
            const deal = parseProductPage(prodHtml, candidateAsin, config.category);

            if (deal) {
              const numericDiscount = parseInt(deal.discount.replace(/[^0-9]/g, ''), 10) || 0;
              if (numericDiscount >= config.minDiscount) {
                selectedDeals.push(deal);
                postedSet.add(deal.asin);
                console.log(
                  `✨ FOUND WINNING DEAL #${selectedDeals.length}/${CONFIG.dealsPerRun} in ${config.name}: ${deal.title.slice(0, 35)}... (${deal.discount} OFF)`
                );
                // Move to next category after 1 winning deal in this round to guarantee category diversity
                break;
              }
            }
          }
        } catch (e) {
          console.warn(`Warning hunting ${url}:`, e.message);
        }

        // If we found a deal in this category during this round, move to next category
        const dealsInThisCategory = selectedDeals.filter((d) => d.category === config.category);
        if (dealsInThisCategory.length >= round) {
          break;
        }
      }
    }
  }

  if (selectedDeals.length === 0) {
    console.log('\n😴 No new unseen deals found meeting discount threshold this run. Will check next cycle.');
    return;
  }

  console.log(`\n🏆 Discovered ${selectedDeals.length} Winning Deals for Syndication Batch:`);
  selectedDeals.forEach((d, i) => {
    console.log(`  ${i + 1}. [${d.category.toUpperCase()}] ${d.title.slice(0, 40)}... (${d.discount} OFF, ${d.price})`);
  });

  // Syndicate each deal in the batch
  for (let i = 0; i < selectedDeals.length; i++) {
    const deal = selectedDeals[i];
    console.log(`\n--- 🚀 Syndicating Deal ${i + 1}/${selectedDeals.length}: ${deal.title.slice(0, 35)}... ---`);

    console.log('✍️ Generating AI Copy...');
    const copy = await generateDealCopy(deal);
    console.log('\nGenerated Caption Preview:');
    console.log(copy);

    console.log('\n📡 Broadcasting Deal to Channels...');
    await broadcastToTelegram(deal, copy);
    await publishToBlogger(deal);

    // Save to cache so this ASIN is never syndicated again
    savePostedAsin(deal.asin, deal.title, deal.price, deal.category);
    console.log(`💾 Saved ASIN ${deal.asin} to cache.`);

    // If there are more deals, stagger by 3.5s to comply with Telegram API rate limits
    if (i < selectedDeals.length - 1) {
      console.log('⏳ Staggering next deal broadcast by 3.5 seconds to respect rate limits...');
      await new Promise((resolve) => setTimeout(resolve, 3500));
    }
  }

  console.log('\n🎉 Autonomous Deal Batch Run Finished Successfully!');
}

runAutopilot().catch((err) => {
  console.error('Fatal Autopilot Error:', err);
  process.exit(1);
});
