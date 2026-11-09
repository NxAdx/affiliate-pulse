const assert = require('assert');

console.log('🧪 Starting Single Deal Clear & Studio UI Verification Suite...\n');

// 1. Verify partialize in useAppStore includes activeProduct and activeContent
const fs = require('fs');
const storeContent = fs.readFileSync('src/store/useAppStore.ts', 'utf8');
assert(storeContent.includes('activeProduct: state.activeProduct'), 'partialize must include activeProduct');
assert(storeContent.includes('activeContent: state.activeContent'), 'partialize must include activeContent');
console.log('  ✅ PASS: useAppStore partialize includes activeProduct & activeContent in MMKV');

// 2. Verify DealHeroCard exports onClear and onRemove in props interface
const dealHeroCardSrc = fs.readFileSync('src/components/DealHeroCard.tsx', 'utf8');
assert(dealHeroCardSrc.includes('onRemove?: () => void;'), 'DealHeroCardProps must have onRemove');
assert(dealHeroCardSrc.includes('onClear?: () => void;'), 'DealHeroCardProps must have onClear');
assert(dealHeroCardSrc.includes('clearBtn'), 'DealHeroCard must have clearBtn in header');
assert(dealHeroCardSrc.includes('removeBtn'), 'DealHeroCard must have removeBtn in footer action row');
console.log('  ✅ PASS: DealHeroCard has both header Clear and footer Remove buttons');

// 3. Verify handleClearDeal in index.tsx
const indexSrc = fs.readFileSync('src/app/(tabs)/index.tsx', 'utf8');
assert(indexSrc.includes('handleClearDeal'), 'index.tsx must implement handleClearDeal');
assert(indexSrc.includes('useAppStore.getState().setActiveProduct(null)'), 'handleClearDeal must clear store activeProduct');
assert(indexSrc.includes('useAppStore.getState().setActiveContent(null)'), 'handleClearDeal must clear store activeContent');
// Confirm no auto-resurrection on mount
assert(!indexSrc.includes('else if (dealsHistory.length > 0)'), 'index.tsx must not auto-resurrect dealsHistory on mount when cleared');
console.log('  ✅ PASS: index.tsx resets deal state and prevents ghost deal resurrection');

// 4. Verify PinterestStudioCard 2x2 grid and feedback state
const pinterestSrc = fs.readFileSync('src/components/PinterestStudioCard.tsx', 'utf8');
assert(pinterestSrc.includes('utilityGrid'), 'PinterestStudioCard must use balanced utilityGrid');
assert(pinterestSrc.includes('utilityRow'), 'PinterestStudioCard must use utilityRow');
assert(pinterestSrc.includes('Copy AI Prompt'), 'Prompt button must be labeled Copy AI Prompt');
assert(pinterestSrc.includes('Paste New Image'), 'Paste button must be present');
assert(pinterestSrc.includes('Copy Image Link'), 'Image link copy button must be present');
assert(pinterestSrc.includes('Export Pin Graphic'), 'Export button must be present');
assert(pinterestSrc.includes('isPastedImage'), 'Paste button must have active feedback state');
assert(!pinterestSrc.includes('fαѕнισи'), 'PinterestStudioCard must not contain broken mathematical glyphs');
console.log('  ✅ PASS: PinterestStudioCard has balanced 2x2 grid, active feedback & standard typography');

// 5. Verify BloggerStudioCard & BroadcastStudioCard consistency
const bloggerSrc = fs.readFileSync('src/components/BloggerStudioCard.tsx', 'utf8');
assert(bloggerSrc.includes('utilityBtnSuccess'), 'BloggerStudioCard must have utilityBtnSuccess');
assert(bloggerSrc.includes('HTML Copied!'), 'BloggerStudioCard must show HTML Copied! feedback');

const broadcastSrc = fs.readFileSync('src/components/BroadcastStudioCard.tsx', 'utf8');
assert(broadcastSrc.includes('copyPillSuccess'), 'BroadcastStudioCard must have copyPillSuccess');
console.log('  ✅ PASS: Blogger and Broadcast Studio cards match unified design language');

// 6. Verify Settings portal links double-arrow elimination
const settingsSrc = fs.readFileSync('src/app/(tabs)/settings.tsx', 'utf8');
assert(!settingsSrc.includes('Portal ↗'), 'Settings must not contain duplicate ↗ in Portal label');
assert(!settingsSrc.includes('Admin ↗'), 'Settings must not contain duplicate ↗ in Admin label');
assert(settingsSrc.includes('open-outline'), 'PortalLink must use standard open-outline icon');
console.log('  ✅ PASS: Settings portal links use standard open-outline icon with zero double arrows');

console.log('\n========================================');
console.log('📊 Verification Summary: All Checks Passed (6/6)');
console.log('========================================\n');
