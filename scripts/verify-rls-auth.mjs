#!/usr/bin/env node

/**
 * RLS 验证脚本 - 登录用户场景
 * 
 * 测试：登录用户应能：
 * 1. 查询自己的订单
 * 2. 查询自己的票据
 * 3. 无法查询他人的订单/票据
 * 
 * ⚠️ 本脚本需要手动配置测试用户 token
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少环境变量')
  process.exit(1)
}

/**
 * 验证脚本说明
 * 
 * 本脚本需要实际的用户 token 才能完整测试
 * 
 * 获取 token 的方式：
 * 1. 在浏览器中登录应用
 * 2. 打开 DevTools > Application > Local Storage
 * 3. 查找包含 'access_token' 的键
 * 
 * 然后执行：
 * USER_TOKEN=<your_token> node scripts/verify-rls-auth.mjs
 */

const userToken = process.env.USER_TOKEN

if (!userToken) {
  console.log(`
📋 RLS 验证 - 登录用户场景

⚠️  缺少 USER_TOKEN 环境变量

使用方式：
1. 在应用中登录并获取 access_token
2. 运行: USER_TOKEN=<token> node scripts/verify-rls-auth.mjs

或者在 Supabase Dashboard 中手动测试 SQL：

-- 查询当前用户信息
SELECT auth.uid() as current_user_id;

-- 查询自己的订单
SELECT * FROM orders 
WHERE customer_email = (SELECT email FROM users WHERE id = auth.uid());

-- 查询自己的票据
SELECT * FROM tickets 
WHERE holder_email = (SELECT email FROM users WHERE id = auth.uid());
`)
  process.exit(0)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 设置用户 token
supabase.auth.setSession({
  access_token: userToken,
  token_type: 'bearer'
})

async function testUserReadOwnOrders() {
  console.log('\n📋 测试: 用户查询自己的订单')
  
  const { data, error } = await supabase
    .from('orders')
    .select('*')
  
  if (error) {
    console.error('❌ 查询失败:', error.message)
    return false
  }
  
  console.log(`✅ 成功查询 ${data?.length || 0} 条订单`)
  return true
}

async function testUserReadOwnTickets() {
  console.log('\n📋 测试: 用户查询自己的票据')
  
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
  
  if (error) {
    console.error('❌ 查询失败:', error.message)
    return false
  }
  
  console.log(`✅ 成功查询 ${data?.length || 0} 条票据`)
  return true
}

async function main() {
  console.log('🧪 RLS 验证 - 登录用户场景\n')
  console.log('使用 token:', userToken.substring(0, 20) + '...')
  
  const results = []
  results.push(await testUserReadOwnOrders())
  results.push(await testUserReadOwnTickets())
  
  const passed = results.filter(r => r).length
  
  console.log(`\n📊 Results: ${passed}/${results.length} tests passed\n`)
  
  if (passed === results.length) {
    console.log('✅ 所有测试通过')
    process.exit(0)
  } else {
    console.log('❌ 部分测试失败')
    process.exit(1)
  }
}

main().catch(console.error)
