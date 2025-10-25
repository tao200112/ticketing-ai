#!/usr/bin/env node

/**
 * 检查 orders 表结构
 * 确认是否有 stripe_session_id 字段
 */

console.log('🔍 检查 orders 表结构...\n')

// 设置环境变量
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://htaqcvnyipiqdbmvvfvj.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YXFjdm55aXBpcWRibXZ2ZnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzYwOTgsImV4cCI6MjA3NjY1MjA5OH0.5fPm5rvK_41wc9XZhzqaVupMlD9EEo4wwjaguQkCRKw'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YXFjdm55aXBpcWRibXZ2ZnZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA3NjA5OCwiZXhwIjoyMDc2NjUyMDk4fQ.84ZGW8t9veGNDJwvy-grFeOa67jtsp1UMLFRcw5hEKM'

async function checkOrdersSchema() {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    
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

    console.log('📊 检查 orders 表字段...')
    
    // 尝试查询 stripe_session_id 字段
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, stripe_session_id, customer_email, tier, currency')
      .limit(1)

    if (ordersError) {
      console.log('❌ orders 表查询失败:', ordersError.message)
      console.log('错误代码:', ordersError.code)
      
      if (ordersError.code === '42703') {
        console.log('\n💡 问题诊断:')
        console.log('- orders 表缺少 stripe_session_id 字段')
        console.log('- 需要运行数据库迁移脚本')
        console.log('\n🔧 解决方案:')
        console.log('1. 在 Supabase SQL Editor 中运行 fix-database-schema.sql')
        console.log('2. 或者手动添加字段:')
        console.log('   ALTER TABLE orders ADD COLUMN stripe_session_id TEXT;')
        console.log('   ALTER TABLE orders ADD COLUMN customer_email TEXT;')
        console.log('   ALTER TABLE orders ADD COLUMN tier TEXT DEFAULT \'general\';')
        console.log('   ALTER TABLE orders ADD COLUMN currency TEXT DEFAULT \'usd\';')
      }
    } else {
      console.log('✅ orders 表查询成功')
      console.log('可用字段:', Object.keys(orders[0] || {}))
      
      if (orders && orders.length > 0) {
        console.log('示例数据:', orders[0])
      } else {
        console.log('📝 orders 表为空，需要创建测试数据')
      }
    }

    // 检查 tickets 表字段
    console.log('\n🎫 检查 tickets 表字段...')
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('id, short_id, holder_email, tier, price_cents, qr_payload')
      .limit(1)

    if (ticketsError) {
      console.log('❌ tickets 表查询失败:', ticketsError.message)
      console.log('错误代码:', ticketsError.code)
      
      if (ticketsError.code === '42703') {
        console.log('\n💡 tickets 表也缺少字段，需要运行迁移脚本')
      }
    } else {
      console.log('✅ tickets 表查询成功')
      console.log('可用字段:', Object.keys(tickets[0] || {}))
    }

  } catch (error) {
    console.log('❌ 检查过程中出错:', error.message)
  }
}

// 运行检查
checkOrdersSchema().then(() => {
  console.log('\n🏁 检查完成')
}).catch(error => {
  console.log('❌ 检查失败:', error.message)
})
