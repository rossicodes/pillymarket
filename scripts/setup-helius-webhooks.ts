/**
 * Setup Helius webhooks for all tracked KOL wallets
 * Run this script after deploying to Railway with environment variables set
 */

import { TRACKED_KOLS } from '../src/lib/kol-data';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/helius`;

if (!HELIUS_API_KEY) {
  console.error('❌ HELIUS_API_KEY environment variable is required');
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_APP_URL) {
  console.error('❌ NEXT_PUBLIC_APP_URL environment variable is required');
  process.exit(1);
}

async function setupWebhooks() {
  console.log('🚀 Setting up Helius webhooks for KOL wallets...');
  console.log(`📡 Webhook URL: ${WEBHOOK_URL}`);
  console.log(`👥 Tracking ${TRACKED_KOLS.length} KOL wallets`);

  try {
    // Create webhook for all KOL addresses
    const response = await fetch(`https://api.helius.xyz/v0/webhooks?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhookURL: WEBHOOK_URL,
        transactionTypes: ['SWAP'], // Focus on swap transactions (Pump.Fun trades)
        accountAddresses: TRACKED_KOLS.map(kol => kol.address),
        webhookType: 'enhanced', // Get detailed transaction data
        authHeader: `Bearer ${process.env.WEBHOOK_SECRET}`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const webhook = await response.json();
    console.log('✅ Webhook created successfully!');
    console.log(`📋 Webhook ID: ${webhook.webhookID}`);
    console.log(`🎯 Monitoring addresses:`);
    
    TRACKED_KOLS.forEach((kol, index) => {
      console.log(`   ${index + 1}. ${kol.name} (@${kol.twitter}): ${kol.address}`);
    });

    console.log('\n🎉 Setup complete! Your app will now receive real-time trading data.');
    console.log('🔍 Monitor webhook activity in your Helius dashboard.');
    
    return webhook;
    
  } catch (error) {
    console.error('❌ Failed to setup webhooks:', error);
    process.exit(1);
  }
}

// Run the setup
setupWebhooks();