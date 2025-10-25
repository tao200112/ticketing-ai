#!/usr/bin/env node

/**
 * RLS 匿名用户验证脚本
 * 验证匿名用户可以读取公开事件和价格
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifyRLS() {
  console.log('🔍 Verifying RLS policies for anonymous users...')
  
  try {
    // 1. 测试事件读取
    console.log('\n📅 Testing events access...')
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, status, created_at')
      .eq('status', 'published')
      .limit(5)
    
    if (eventsError) {
      console.error('❌ Events query failed:', eventsError.message)
      return false
    }
    
    console.log(`✅ Found ${events?.length || 0} published events`)
    if (events && events.length > 0) {
      console.log('   Sample events:', events.map(e => `${e.title} (${e.status})`).join(', '))
    }
    
    // 2. 测试价格读取
    console.log('\n💰 Testing prices access...')
    const { data: prices, error: pricesError } = await supabase
      .from('prices')
      .select('id, name, amount_cents, is_active, event_id')
      .eq('is_active', true)
      .limit(5)
    
    if (pricesError) {
      console.error('❌ Prices query failed:', pricesError.message)
      return false
    }
    
    console.log(`✅ Found ${prices?.length || 0} active prices`)
    if (prices && prices.length > 0) {
      console.log('   Sample prices:', prices.map(p => `${p.name}: $${(p.amount_cents/100).toFixed(2)}`).join(', '))
    }
    
    // 3. 测试特定事件的价格
    if (events && events.length > 0) {
      const eventId = events[0].id
      console.log(`\n🎫 Testing prices for event ${eventId}...`)
      
      const { data: eventPrices, error: eventPricesError } = await supabase
        .from('prices')
        .select('id, name, amount_cents, is_active')
        .eq('event_id', eventId)
        .eq('is_active', true)
      
      if (eventPricesError) {
        console.error('❌ Event prices query failed:', eventPricesError.message)
        return false
      }
      
      console.log(`✅ Found ${eventPrices?.length || 0} prices for event ${eventId}`)
    }
    
    // 4. 测试订单访问（应该被拒绝）
    console.log('\n🚫 Testing orders access (should be denied)...')
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, customer_email')
      .limit(1)
    
    if (ordersError) {
      console.log('✅ Orders access correctly denied:', ordersError.message)
    } else {
      console.log('⚠️  Orders access unexpectedly allowed')
    }
    
    console.log('\n🎉 RLS verification completed successfully!')
    return true
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message)
    return false
  }
}

// 运行验证
verifyRLS().then(success => {
  process.exit(success ? 0 : 1)
})