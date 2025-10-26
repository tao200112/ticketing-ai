const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 测试 Supabase 连接...')
console.log('URL:', supabaseUrl)
console.log('Key exists:', !!supabaseKey)

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 环境变量未配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log('\n📊 测试数据库连接...')
    
    // 测试查询 events 表
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .limit(5)
    
    if (eventsError) {
      console.error('❌ Events 表查询失败:', eventsError.message)
    } else {
      console.log('✅ Events 表连接成功，找到', events?.length || 0, '条记录')
    }
    
    // 测试查询 merchants 表
    const { data: merchants, error: merchantsError } = await supabase
      .from('merchants')
      .select('*')
      .limit(5)
    
    if (merchantsError) {
      console.error('❌ Merchants 表查询失败:', merchantsError.message)
    } else {
      console.log('✅ Merchants 表连接成功，找到', merchants?.length || 0, '条记录')
    }
    
    // 测试查询 orders 表
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(5)
    
    if (ordersError) {
      console.error('❌ Orders 表查询失败:', ordersError.message)
    } else {
      console.log('✅ Orders 表连接成功，找到', orders?.length || 0, '条记录')
    }
    
    console.log('\n🎉 数据库连接测试完成')
    
  } catch (error) {
    console.error('💥 测试失败:', error.message)
    process.exit(1)
  }
}

testConnection()
