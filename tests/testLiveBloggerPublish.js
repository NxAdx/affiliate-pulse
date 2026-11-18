/**
 * Live Blogger Webhook End-to-End Verification
 */

const DEFAULT_BLOGGER_WEBHOOK = 'https://script.google.com/macros/s/AKfycbxh1BaXpDleljcWtTW_WSTtO-ks7UfQYQ78TkLVnYbpdgW15EiB5RycAIhgruAiRZPQ/exec';
const DEFAULT_BLOGGER_BLOG_ID = '4105733030604942075';

async function testLiveWebhook() {
  console.log('📡 Testing GET (Webhook Status Ping)...');
  const getRes = await fetch(DEFAULT_BLOGGER_WEBHOOK, { method: 'GET', redirect: 'follow' });
  const getText = await getRes.text();
  console.log(`GET Status: ${getRes.status}`);
  console.log(`GET Response: ${getText}\n`);

  console.log('📝 Testing POST (Live Product Review Publishing to GadgetNX)...');
  const postPayload = {
    blogId: DEFAULT_BLOGGER_BLOG_ID,
    title: '🔥 Live Deal Verification: OnePlus Nord Buds 2r TWS (50% OFF)',
    content: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 720px; margin: 0 auto; padding: 16px;">
        <h2 style="color: #1e293b;">OnePlus Nord Buds 2r Deep Dive Review</h2>
        <p><strong>Status:</strong> Verified Live Autopilot Syndication Test</p>
        <p>The OnePlus Nord Buds 2r delivers premium acoustic performance with dual microphones and up to 38 hours of battery life.</p>
        <div style="background: #f1f5f9; padding: 12px 16px; border-left: 4px solid #10b981; border-radius: 4px; margin: 16px 0;">
          <p style="margin: 0; font-size: 16px;">Deal Price: <strong>₹1,799</strong> (50% OFF)</p>
        </div>
        <p><a href="https://www.amazon.in/dp/B0C7JCN2HG?tag=dealhunter-21" style="background: #e11d48; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Deal on Amazon &rarr;</a></p>
      </div>
    `,
    labels: ['Tech', 'OnePlus', 'TWS Earbuds', 'Verified Deals'],
  };

  const postRes = await fetch(DEFAULT_BLOGGER_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postPayload),
    redirect: 'follow',
  });

  const postText = await postRes.text();
  console.log(`POST Status: ${postRes.status}`);
  console.log(`POST Response: ${postText}\n`);

  try {
    const json = JSON.parse(postText);
    if (json.success && json.url) {
      console.log('🎉 SUCCESS! Article is officially published on GadgetNX:');
      console.log(`🔗 URL: ${json.url}`);
      console.log(`🆔 Post ID: ${json.id}`);
      process.exit(0);
    } else {
      console.error('❌ Failed: JSON did not contain success: true');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Failed to parse JSON response:', err);
    process.exit(1);
  }
}

testLiveWebhook().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
