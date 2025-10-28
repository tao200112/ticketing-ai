const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Supabase 连接测试开始...\n')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 环境变量')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testTable(tableName, queryFn) {
  try {
    const result = await queryFn()
    const status = result.error ? '❌' : '✅'
    const count = result.data ? result.data.length : 0
    console.log(`${status} ${tableName}: ${count} 条记录`)
    
    if (result.error) {
      console.log(`   错误: ${result.error.message}`)
    } else if (result.data && result.data.length > 0) {
      console.log(`   示例:`, JSON.stringify(result.data[0], null, 2).substring(0, 100))
    }
    return { success: !result.error, count }
  } catch (error) {
    console.log(`❌ ${tableName}: 测试失败`)
    console.log(`   错误: ${error.message}`)
    return { success: false, count: 0 }
  }
}

async function main() {
  console.log('📊 数据库表测试结果:\n')

  const results = {
    users: await testTable('users', () => supabase.from('users').select('id, email, name, role').limit(5)),
    merchants: await testTable('merchants', () => supabase.from('merchants').select('id, name, contact_email').limit(5)),
    events: await testTable('events', () => supabase.from('events').select('id, title, status').limit(5)),
    prices: await testTable('prices', () => supabase.from('prices').select('id, name, amount_cents').limit(5)),
    orders: await testTable('orders', () => supabase.from('orders').select('id, customer_email, status').limit(5)),
    tickets: await testTable('tickets', () => supabase.from('tickets').select('id, short_id, status').limit(5)),
  }

  console.log('\n' + '='.repeat(50))
  console.log('📈 测试总结:')
  console.log('='.repeat(50))

  const totalTables = Object.keys(results).length
  const successTables = Object.values(results).filter(r => r.success).length
  const totalRecords = Object.values(results).reduce((sum, r) => sum + r.count, 0)

  console.log(`总表数: ${totalTables}`)
  console.log(`成功连接: ${successTables} / ${totalTables}`)
  console.log(`总记录数: ${totalRecords}`)
  
  console.log('\n📝 详细状态:')
  Object.entries(results).forEach(([table, result]) => {
    const status = result.success ? '✅' : '❌'
    console.log(`${status} ${table}: ${result.count} 条记录`)
  })

  console.log('\n✅ 所有 Supabase 连接测试完成!')
}

main().catch(console.error)
