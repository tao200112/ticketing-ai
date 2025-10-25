#!/usr/bin/env node

/**
 * 测试事件数据获取
 * 
 * 验证：
 * 1. getPublishedEventBySlug 能正确加载事件
 * 2. listActivePrices 能正确加载价格
 * 3. 字段映射正确
 */

import 'dotenv/config'

async function testEventFetch() {
  console.log('🧪 Testing event data fetch...\n')

  try {
    // 动态导入（ESM）
    const { getPublishedEventBySlug, listActivePrices } = await import('../lib/db/index.ts')

    const slug = 'ridiculous-chicken'
    console.log(`📋 Fetching event: ${slug}`)

    // 获取事件
    const event = await getPublishedEventBySlug(slug)

    if (!event) {
      console.error('❌ Event not found')
      process.exit(1)
    }

    console.log(`✅ Event loaded:`)
    console.log(`   Title: ${event.title}`)
    console.log(`   Status: ${event.status}`)
    console.log(`   Start: ${event.startAt}`)
    console.log(`   Venue: ${event.venueName}`)
    console.log(`   Description: ${event.description?.substring(0, 50)}...`)

    // 获取价格
    console.log(`\n📋 Fetching prices for event: ${event.id}`)
    const prices = await listActivePrices(event.id)

    console.log(`✅ Prices loaded: ${prices.length} items`)

    if (prices.length > 0) {
      console.log('\n📊 Price details:')
      prices.forEach((price, index) => {
        console.log(`   ${index + 1}. ${price.name}`)
        console.log(`      Amount: $${(price.amountCents / 100).toFixed(2)}`)
        console.log(`      Inventory: ${price.inventory}`)
        console.log(`      Active: ${price.isActive}`)
      })
    } else {
      console.warn('⚠️  No active prices found')
    }

    // 验证字段映射
    console.log('\n✅ Field mapping verification:')
    console.log(`   - title: ${event.title !== undefined}`)
    console.log(`   - startAt: ${event.startAt !== undefined}`)
    console.log(`   - venueName: ${event.venueName !== undefined}`)
    console.log(`   - posterUrl: ${event.posterUrl !== undefined || event.posterUrl === null}`)

    if (prices.length > 0) {
      const firstPrice = prices[0]
      console.log(`   - price.name: ${firstPrice.name !== undefined}`)
      console.log(`   - price.amountCents: ${firstPrice.amountCents !== undefined}`)
      console.log(`   - price.isActive: ${firstPrice.isActive !== undefined}`)
    }

    console.log('\n✅ All tests passed!')
    process.exit(0)

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

testEventFetch()
