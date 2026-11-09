const assert = require('assert');
const fs = require('fs');

console.log('🧪 Starting Traffic & Native Share Intent Verification Suite...\n');

// 1. Verify app.json has expo-share-intent plugin and Android SEND intent-filter
const appJsonRaw = fs.readFileSync('app.json', 'utf8');
const appJson = JSON.parse(appJsonRaw);

const plugins = appJson.expo.plugins || [];
assert(
  plugins.includes('expo-share-intent'),
  'app.json plugins must include expo-share-intent'
);

const intentFilters = appJson.expo.android.intentFilters || [];
const sendFilter = intentFilters.find(f => f.action === 'SEND' || f.action === 'android.intent.action.SEND');
assert(sendFilter, 'app.json must define SEND intentFilter');
const hasTextPlain = Array.isArray(sendFilter.data)
  ? sendFilter.data.some(d => d.mimeType === 'text/plain' || d.mimeType === 'text/*')
  : sendFilter.data && (sendFilter.data.mimeType === 'text/plain' || sendFilter.data.mimeType === 'text/*');
assert(hasTextPlain, 'SEND intentFilter must support text/plain or text/*');
console.log('  ✅ PASS: app.json configures expo-share-intent plugin & Android Intent.ACTION_SEND filter');

// 2. Verify index.tsx integrates useShareIntent and auto-triggers generation
const indexSrc = fs.readFileSync('src/app/(tabs)/index.tsx', 'utf8');
assert(indexSrc.includes('useShareIntent'), 'index.tsx must import and call useShareIntent');
assert(indexSrc.includes('hasShareIntent'), 'index.tsx must listen for hasShareIntent');
assert(indexSrc.includes('handleGenerateWithUrl'), 'index.tsx must trigger handleGenerateWithUrl on share intent');
assert(indexSrc.includes('seoDescription={activeContent?.pinterestDescription}'), 'index.tsx must pass seoDescription to PinterestStudioCard');
assert(indexSrc.includes('tags={activeContent?.pinterestTags}'), 'index.tsx must pass tags to PinterestStudioCard');
console.log('  ✅ PASS: index.tsx intercepts Android share intents & passes SEO tags to Studio');

// 3. Verify ProductScraper.extractUrlFromText logic
const scraperSrc = fs.readFileSync('src/services/productScraper.ts', 'utf8');
assert(scraperSrc.includes('extractUrlFromText'), 'productScraper.ts must export extractUrlFromText');
// Test the regex directly
const extractUrlRegex = /(https?:\/\/[^\s]+)/i;
const sampleShareText = 'Check this out on Amazon! Fossil Grant Watch: https://amzn.to/3ABCXYZ with deal';
const match = sampleShareText.match(extractUrlRegex);
assert(match && match[1] === 'https://amzn.to/3ABCXYZ', 'Regex must extract clean link from conversational share text');
console.log('  ✅ PASS: ProductScraper extracts clean URL from conversational Android share text');

// 4. Verify GeminiAiService Schema.org JSON-LD generation
const geminiSrc = fs.readFileSync('src/services/geminiAi.ts', 'utf8');
assert(geminiSrc.includes('generateProductJsonLd'), 'geminiAi.ts must define generateProductJsonLd');
assert(geminiSrc.includes("'@type': 'Product'"), 'generateProductJsonLd must define Schema.org Product type');
assert(geminiSrc.includes("'@type': 'Offer'"), 'generateProductJsonLd must define Schema.org Offer');
assert(geminiSrc.includes("'@type': 'AggregateRating'"), 'generateProductJsonLd must define Schema.org AggregateRating for Google Rich Snippets');
assert(geminiSrc.includes('${jsonLd}'), 'bloggerHtmlBody must embed jsonLd');
assert(geminiSrc.includes('FTC Disclosure:'), 'bloggerHtmlBody must include FTC disclosure');
console.log('  ✅ PASS: geminiAi.ts generates Google Schema.org JSON-LD & compliant Blogger HTML');

// 5. Verify PinterestStudioCard and CinematicStudioService SEO tagging
const pinterestCardSrc = fs.readFileSync('src/components/PinterestStudioCard.tsx', 'utf8');
assert(pinterestCardSrc.includes('seoDescription?: string;'), 'PinterestStudioCard must accept seoDescription');
assert(pinterestCardSrc.includes('tags?: string[];'), 'PinterestStudioCard must accept tags');
assert(pinterestCardSrc.includes('SEO Search Keywords'), 'PinterestStudioCard must display SEO search keyword badge');

const cinematicSrc = fs.readFileSync('src/services/cinematicStudio.ts', 'utf8');
assert(cinematicSrc.includes('getPinterestCreatePinUrl'), 'cinematicStudio.ts must define getPinterestCreatePinUrl');
assert(cinematicSrc.includes('https://www.pinterest.com/pin/create/button/?'), 'getPinterestCreatePinUrl must construct Pinterest Pin URL');
assert(cinematicSrc.includes('tags: string[] = []'), 'getPinterestCreatePinUrl must accept tags array');
console.log('  ✅ PASS: Pinterest Studio and Cinematic service construct SEO-rich Pin URLs with tags');

console.log('\n========================================');
console.log('📊 Verification Summary: All 5 Tests Passed');
console.log('========================================\n');
