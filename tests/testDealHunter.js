// testDealHunter.js - Tests end-to-end deal hunting & scraping
async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Accept-Language': 'en-IN,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  return { status: res.status, text: await res.text() };
}

function parseAmazonMetadata(html, asin, associateTag = 'dealhunter-21') {
  // Title
  let title = '';
  const titleMatch = html.match(/id="productTitle"[^>]*>([^<]+)<\/span>/i) ||
                     html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
  if (titleMatch) title = titleMatch[1].trim();

  // Image extraction with all Amazon CDN fallbacks
  let imageUrl = '';
  const imgMatch =
    html.match(/data-a-dynamic-image="\{&quot;([^&"]+)/i) ||
    html.match(/data-a-dynamic-image="\{"([^"]+)/i) ||
    html.match(/"large":"(https:\/\/[^"]+media-amazon\.com[^"]+)"/i) ||
    html.match(/id="landingImage"[^>]*src="([^"]+)"/i) ||
    html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
  if (imgMatch) imageUrl = imgMatch[1].trim();

  // Current Price
  let price = '';
  const priceMatch = html.match(/class="a-price-whole">([0-9,]+)/i);
  if (priceMatch) price = '₹' + priceMatch[1].replace(/,/g, '');

  // MRP / Original Price
  let mrp = '';
  const mrpMatch = html.match(/class="a-price a-text-price"[^>]*>[\s\S]*?<span class="a-offscreen">₹?([0-9,]+)<\/span>/i);
  if (mrpMatch) mrp = '₹' + mrpMatch[1].replace(/,/g, '');

  // Discount percentage
  let discount = '';
  const discMatch = html.match(/class="[^"]*savingsPercentage[^"]*">-?([0-9]+)%<\/span>/i);
  if (discMatch) discount = discMatch[1] + '%';

  const affiliateUrl = `https://www.amazon.in/dp/${asin}?tag=${associateTag}`;

  return { asin, title, price, mrp, discount, imageUrl, affiliateUrl };
}

async function run() {
  console.log('🔍 1. Autonomous Hunting: Fashion (50%+ Off)...');
  const fashionUrl = 'https://www.amazon.in/s?k=mens+sneakers+clothing&rh=p_8%3A50-';
  const fRes = await fetchHtml(fashionUrl);

  const fashionAsins = [...fRes.text.matchAll(/data-asin="([A-Z0-9]{10})"/g)]
    .map((m) => m[1])
    .filter((a) => a && a !== 'undefined');
  const uniqueFashion = [...new Set(fashionAsins)];
  console.log(`✅ Discovered ${uniqueFashion.length} Fashion Deals with ≥50% OFF!`);

  if (uniqueFashion.length > 0) {
    const sampleAsin = uniqueFashion[0];
    console.log(`\n📦 Scraping Sample Fashion Product: https://www.amazon.in/dp/${sampleAsin}`);
    const prodRes = await fetchHtml(`https://www.amazon.in/dp/${sampleAsin}`);
    const data = parseAmazonMetadata(prodRes.text, sampleAsin);
    console.log('--- Fashion Deal Details ---');
    console.log('Title:', data.title.substring(0, 70));
    console.log('Price:', data.price, '| MRP:', data.mrp, '| Discount:', data.discount);
    console.log('Image:', data.imageUrl ? data.imageUrl.substring(0, 60) + '...' : 'None');
    console.log('Affiliate URL:', data.affiliateUrl);
  }

  console.log('\n🔍 2. Autonomous Hunting: Tech & Electronics (40%+ Off)...');
  const techUrl = 'https://www.amazon.in/s?k=tws+earbuds+smartwatch&rh=p_8%3A40-';
  const tRes = await fetchHtml(techUrl);

  const techAsins = [...tRes.text.matchAll(/data-asin="([A-Z0-9]{10})"/g)]
    .map((m) => m[1])
    .filter((a) => a && a !== 'undefined');
  const uniqueTech = [...new Set(techAsins)];
  console.log(`✅ Discovered ${uniqueTech.length} Tech Deals with ≥40% OFF!`);

  if (uniqueTech.length > 0) {
    const sampleAsin = uniqueTech[0];
    console.log(`\n📦 Scraping Sample Tech Product: https://www.amazon.in/dp/${sampleAsin}`);
    const prodRes = await fetchHtml(`https://www.amazon.in/dp/${sampleAsin}`);
    const data = parseAmazonMetadata(prodRes.text, sampleAsin);
    console.log('--- Tech Deal Details ---');
    console.log('Title:', data.title.substring(0, 70));
    console.log('Price:', data.price, '| MRP:', data.mrp, '| Discount:', data.discount);
    console.log('Image:', data.imageUrl ? data.imageUrl.substring(0, 60) + '...' : 'None');
    console.log('Affiliate URL:', data.affiliateUrl);
  }
}

run().catch(console.error);
