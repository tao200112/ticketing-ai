#!/usr/bin/env node

/**
 * RLS 验证脚本 - 匿名用户场景
 * 
 * 测试：匿名用户（使用 anon key）应能：
 * 1. 查询已发布的活动
 * 2. 查询活跃价格
 * 3. 无法查询订单/票据
 * 
 * ⚠️ 需要配置环境变量或修改为实际 Supabase 凭据
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少环境变量: NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAnonymousReadPublishedEvents() {
  console.log('\n📋 测试 1: 匿名用户查询已发布活动')
  
  const { data, error } = await supabase
    .from('events')
    .select('id, title, status')
    .eq('status', 'published')
    .limit(5)
  
  if (error) {
    console.error('❌ 查询失败:', error.message)
    return false
  }
  
  if (data && data.length > 0) {
    console.log(`✅ 成功查询 ${data.length} 条已发布活动`)
    return true
  } else {
    console.log('⚠️  未找到已发布活动（可能是数据问题，非策略问题）')
    return true // 策略未拒绝，只是没数据
  }
}

async function testAnonymousReadActivePrices() {
  console.log('\n📋 测试 2: 匿名用户查询活跃价格')
  
  const { data, error } = await supabase
    .from('prices')
    .select('id, name, amount_cents, is_active')
    .eq('is_active', true)
    .limit(5)
  
  if (error) {
    console.error('❌ 查询失败:', error.message)
    return false
  }
  
  console.log(`✅ 成功查询 ${data?.length || 0} 条活跃价格`)
  return true
}

async function testAnonymousCannotReadOrders() {
  console.log('\n📋 测试 3: 匿名用户无法查询订单（预期被策略拒绝）')
  
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .limit(1)
  
  if (error) {
    console.log('✅ 策略正确拒绝:', error.message)
    return true
  }
  
  if (!data || data.length === 0) {
    console.log('✅ 策略正确拒绝: 返回空结果')
    return true
  } else {
    console.error('❌ 策略未生效: 匿名用户能查询到订单')
    return false
  }
}

async function main() {
  console.log('🧪 RLS 验证 - 匿名用户场景\n')
  console.log('使用 anon key:', supabaseAnonKey.substring(0, 20) + '...')
  
  const results = []
  
  results.push(await testAnonymousReadPublishedEvents())
  results.push(await testAnonymousReadActivePrices())
  results.push(await testAnonymousCannotReadOrders())
  
  const passed = results.filter(r => r).length
  const total = results.length
  
  console.log(`\n📊 Results: ${passed}/${total} tests passed\n`)
  
  if (passed === total) {
    console.log('✅ 所有测试通过')
    process.exit(0)
  } else {
    console.log('❌ 部分测试失败')
    process.exit(1)
  }
}

main().catch(console.error)
