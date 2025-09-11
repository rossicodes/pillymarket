/**
 * Setup Helius webhooks for all tracked KOL wallets
 * Run this script after deploying to Railway with environment variables set
 */
import 'dotenv/config'

import { TRACKED_KOLS } from '../src/lib/kol-data'

const HELIUS_API_KEY = process.env.HELIUS_API_KEY
const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/helius`

if (!HELIUS_API_KEY) {
  console.error('❌ HELIUS_API_KEY environment variable is required')
  process.exit(1)
}

if (!process.env.NEXT_PUBLIC_APP_URL) {
  console.error('❌ NEXT_PUBLIC_APP_URL environment variable is required')
  process.exit(1)
}

async function deleteExistingWebhooks() {
  console.log('🧹 Cleaning up existing webhooks...')
  
  try {
    // Get all existing webhooks
    const response = await fetch(`https://api.helius.xyz/v0/webhooks?api-key=${HELIUS_API_KEY}`, {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch webhooks: ${response.status}`)
    }

    const webhooks = await response.json()
    console.log(`📋 Found ${webhooks.length} existing webhooks`)

    if (webhooks.length === 0) {
      console.log('✅ No existing webhooks to delete')
      return
    }

    // Delete each webhook
    for (const webhook of webhooks) {
      console.log(`🗑️  Deleting webhook: ${webhook.webhookID}`)
      
      const deleteResponse = await fetch(`https://api.helius.xyz/v0/webhooks/${webhook.webhookID}?api-key=${HELIUS_API_KEY}`, {
        method: 'DELETE',
      })

      if (!deleteResponse.ok) {
        console.warn(`⚠️  Failed to delete webhook ${webhook.webhookID}: ${deleteResponse.status}`)
      } else {
        console.log(`✅ Deleted webhook: ${webhook.webhookID}`)
      }

      // Small delay between deletions
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    console.log('🎉 All existing webhooks cleaned up!')
    
  } catch (error) {
    console.error('❌ Failed to cleanup existing webhooks:', error)
    throw error
  }
}

async function setupWebhooks() {
  console.log('🚀 Setting up Helius webhooks for KOL wallets...')
  console.log(`📡 Webhook URL: ${WEBHOOK_URL}`)
  console.log(`👥 Tracking ${TRACKED_KOLS.length} KOL wallets`)

  // Split KOLs into batches of 20 addresses per webhook
  const ADDRESSES_PER_WEBHOOK = 20
  const addressBatches: string[][] = []

  for (let i = 0; i < TRACKED_KOLS.length; i += ADDRESSES_PER_WEBHOOK) {
    const batch = TRACKED_KOLS.slice(i, i + ADDRESSES_PER_WEBHOOK).map((kol) => kol.address)
    addressBatches.push(batch)
  }

  console.log(`📦 Creating ${addressBatches.length} webhooks (max ${ADDRESSES_PER_WEBHOOK} addresses each)`)

  try {
    const webhooks = []

    for (let batchIndex = 0; batchIndex < addressBatches.length; batchIndex++) {
      const batch = addressBatches[batchIndex]

      console.log(`\n🔄 Setting up webhook ${batchIndex + 1}/${addressBatches.length} (${batch.length} addresses)...`)

      const response = await fetch(`https://api.helius.xyz/v0/webhooks?api-key=${HELIUS_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhookURL: WEBHOOK_URL,
          transactionTypes: ['ANY'], // Monitor all transactions to catch Pump.Fun buy/sell instructions
          accountAddresses: batch,
          webhookType: 'enhanced', // Get detailed transaction data
          authHeader: `Bearer ${process.env.WEBHOOK_SECRET}`,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`HTTP ${response.status}: ${error}`)
      }

      const webhook = await response.json()
      webhooks.push(webhook)

      console.log(`✅ Webhook ${batchIndex + 1} created: ${webhook.webhookID}`)

      // Small delay between webhook creations
      if (batchIndex < addressBatches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    console.log(`\n🎉 All ${webhooks.length} webhooks created successfully!`)
    console.log(`📋 Webhook IDs:`)
    webhooks.forEach((webhook, index) => {
      console.log(`   ${index + 1}. ${webhook.webhookID}`)
    })

    console.log(`\n🎯 Monitoring addresses:`)
    TRACKED_KOLS.forEach((kol, index) => {
      console.log(`   ${index + 1}. ${kol.name} (@${kol.twitter}): ${kol.address}`)
    })

    console.log('\n🎉 Setup complete! Your app will now receive real-time trading data.')
    console.log('🔍 Monitor webhook activity in your Helius dashboard.')

    return webhooks
  } catch (error) {
    console.error('❌ Failed to setup webhooks:', error)
    process.exit(1)
  }
}

// Run the setup with cleanup
async function main() {
  try {
    await deleteExistingWebhooks()
    await setupWebhooks()
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

main()
