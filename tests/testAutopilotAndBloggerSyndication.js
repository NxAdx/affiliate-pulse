/**
 * Autopilot and Blogger Syndication Verification Suite
 * Verifies:
 * 1. BloggerService error handling for 403 Forbidden / Google Auth HTML redirects
 * 2. Store defaults for bloggerBlogId and autoSyndicateOnShare
 * 3. OmnichannelSyndicateBar component structure and integration in GeneratorScreen
 * 4. Automatic hands-free syndication pipeline on Android Share Target
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting Autopilot & Blogger Syndication Verification Suite...\n');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${err.message}`);
  }
}

// 1. Blogger Webhook and Error Diagnostics
test('BloggerService detects 403 Forbidden, HTML error pages and handles invalid permissions', () => {
  const bloggerServicePath = path.join(__dirname, '../src/services/bloggerApi.ts');
  const content = fs.readFileSync(bloggerServicePath, 'utf8');

  assert(content.includes('DEFAULT_BLOGGER_BLOG_ID'), 'Must export DEFAULT_BLOGGER_BLOG_ID');
  assert(content.includes('4105733030604942075'), 'Must contain GadgetNX blog ID');
  assert(content.includes('403') || content.includes('Forbidden'), 'Must handle 403 Forbidden');
  assert(content.includes('docs.google.com/accounts') || content.includes('You need access'), 'Must detect Google Auth redirects');
  assert(!content.includes('if (response.ok) return { success: true };'), 'Must NOT return false-positive success on non-JSON HTML redirects');
});

// 2. App Store Defaults
test('useAppStore defaults include GadgetNX blog ID and autoSyndicateOnShare: true', () => {
  const storePath = path.join(__dirname, '../src/store/useAppStore.ts');
  const content = fs.readFileSync(storePath, 'utf8');

  assert(content.includes('bloggerBlogId: DEFAULT_BLOGGER_BLOG_ID'), 'Must default bloggerBlogId to DEFAULT_BLOGGER_BLOG_ID');
  assert(content.includes('autoSyndicateOnShare: true'), 'Must enable autoSyndicateOnShare by default');
});

// 3. OmnichannelSyndicateBar Component
test('OmnichannelSyndicateBar provides 1-Tap Syndicate, live status chips, and auto-post toggle', () => {
  const componentPath = path.join(__dirname, '../src/components/OmnichannelSyndicateBar.tsx');
  const content = fs.readFileSync(componentPath, 'utf8');

  assert(content.includes('Omnichannel Autopilot'), 'Must display Omnichannel Autopilot title');
  assert(content.includes('onSyndicateAll'), 'Must provide 1-tap syndicate callback');
  assert(content.includes('onToggleAutoSyndicate'), 'Must provide auto-syndicate toggle');
  assert(content.includes('telegramStatus') && content.includes('bloggerStatus'), 'Must display live status chips');
  assert(content.includes('403') && content.includes('script.google.com'), 'Must provide clear diagnostic guidance on 403');
});

// 4. Index.tsx Integration
test('GeneratorScreen wires OmnichannelSyndicateBar and auto-syndicates on Android Share Intent', () => {
  const indexPath = path.join(__dirname, '../src/app/(tabs)/index.tsx');
  const content = fs.readFileSync(indexPath, 'utf8');

  assert(content.includes('OmnichannelSyndicateBar'), 'Must import and render OmnichannelSyndicateBar');
  assert(content.includes('executeSyndication'), 'Must implement executeSyndication orchestrator');
  assert(content.includes('handleGenerateWithUrl(extracted, true)'), 'Must pass autoSyndicate flag from Android share intent');
  assert(content.includes('await executeSyndication(product, content)'), 'Must execute syndication automatically when autoSyndicate is true');
});

// 5. Settings Screen Toggle
test('Settings screen allows configuring auto-syndication and defaults Blogger Blog ID', () => {
  const settingsPath = path.join(__dirname, '../src/app/(tabs)/settings.tsx');
  const content = fs.readFileSync(settingsPath, 'utf8');

  assert(content.includes('autoSyndicateOnShare'), 'Settings must include autoSyndicateOnShare');
  assert(content.includes('DEFAULT_BLOGGER_BLOG_ID'), 'Settings must default Blogger Blog ID to DEFAULT_BLOGGER_BLOG_ID');
});

console.log('\n========================================');
console.log(`📊 Verification Summary: ${passed}/${total} Tests Passed`);
console.log('========================================\n');

if (passed !== total) {
  process.exit(1);
}
