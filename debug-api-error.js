#!/usr/bin/env node

/**
 * 调试 API 错误
 * 检查环境变量和数据库连接
 */

console.log('🔍 调试 API 错误...\n')

// 检查环境变量
console.log('📋 环境变量检查:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 已设置' : '❌ 未设置')
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 已设置' : '❌ 未设置')
console.log('QR_SALT:', process.env.QR_SALT ? '✅ 已设置' : '⚠️ 未设置（使用默认值）')

// 测试 Supabase 连接
async function testSupabaseConnection() {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('\n❌ 环境变量未配置，无法测试连接')
      return
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    console.log('\n🔗 测试数据库连接...')
    
    // 测试基本连接
    const { data, error } = await supabase
      .from('events')
      .select('count')
      .limit(1)

    if (error) {
      console.log('❌ 数据库连接失败:', error.message)
      console.log('错误代码:', error.code)
      return
    }

    console.log('✅ 数据库连接成功')

    // 测试 orders 表
    console.log('\n📊 测试 orders 表...')
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, stripe_session_id')
      .limit(5)

    if (ordersError) {
      console.log('❌ orders 表查询失败:', ordersError.message)
      console.log('错误代码:', ordersError.code)
    } else {
      console.log('✅ orders 表查询成功，记录数:', orders?.length || 0)
      if (orders && orders.length > 0) {
        console.log('示例订单:', orders[0])
      }
    }

    // 测试 tickets 表
    console.log('\n🎫 测试 tickets 表...')
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('id, short_id, order_id')
      .limit(5)

    if (ticketsError) {
      console.log('❌ tickets 表查询失败:', ticketsError.message)
      console.log('错误代码:', ticketsError.code)
    } else {
      console.log('✅ tickets 表查询成功，记录数:', tickets?.length || 0)
      if (tickets && tickets.length > 0) {
        console.log('示例票据:', tickets[0])
      }
    }

  } catch (error) {
    console.log('❌ 测试过程中出错:', error.message)
  }
}

// 运行测试
testSupabaseConnection().then(() => {
  console.log('\n🏁 调试完成')
}).catch(error => {
  console.log('❌ 调试失败:', error.message)
})
