/**
 * 检查 merchants 表的依赖关系
 * 
 * 运行此脚本查看所有依赖于 merchants 表的 owner_supabase_uid 和 owner_user_id 列的对象
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 配置缺失')
  console.error('请设置 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDependencies() {
  console.log('🔍 检查 merchants 表的依赖关系...\n')

  // 读取 SQL 文件
  const sqlFile = path.join(__dirname, 'check-merchant-dependencies.sql')
  const sql = fs.readFileSync(sqlFile, 'utf8')

  // 分割 SQL 语句（按分号分割，但要注意字符串中的分号）
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && !s.startsWith('='))

  const results = {}

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    if (!statement) continue

    // 跳过注释和空行
    if (statement.startsWith('--') || statement.length < 10) continue

    try {
      console.log(`\n📋 执行查询 ${i + 1}...`)
      
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: statement + ';' 
      })

      if (error) {
        // 如果 RPC 不存在，尝试直接查询
        const { data: directData, error: directError } = await supabase
          .from('_dummy')
          .select('*')
          .limit(0)

        if (directError) {
          console.log('⚠️  无法直接执行 SQL，请在 Supabase Dashboard 的 SQL Editor 中运行 check-merchant-dependencies.sql')
          console.log('   或者使用 psql 命令行工具')
          break
        }
      }

      // 根据查询类型存储结果
      if (statement.includes('pg_policies')) {
        results.policies = data
      } else if (statement.includes('table_constraints')) {
        results.foreignKeys = data
      } else if (statement.includes('pg_indexes')) {
        results.indexes = data
      } else if (statement.includes('columns')) {
        results.columns = data
      } else if (statement.includes('triggers')) {
        results.triggers = data
      } else if (statement.includes('views')) {
        results.views = data
      }

    } catch (error) {
      console.error(`❌ 查询 ${i + 1} 失败:`, error.message)
    }
  }

  // 输出结果摘要
  console.log('\n\n📊 依赖关系摘要:')
  console.log('=' .repeat(60))
  
  if (results.policies && results.policies.length > 0) {
    console.log(`\n🔐 RLS 策略 (${results.policies.length} 个):`)
    results.policies.forEach(p => {
      console.log(`   - ${p.tablename}.${p.policyname}`)
    })
  } else {
    console.log('\n✅ 没有找到依赖的 RLS 策略')
  }

  if (results.foreignKeys && results.foreignKeys.length > 0) {
    console.log(`\n🔗 外键约束 (${results.foreignKeys.length} 个):`)
    results.foreignKeys.forEach(fk => {
      console.log(`   - ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`)
    })
  } else {
    console.log('\n✅ 没有找到相关的外键约束')
  }

  if (results.indexes && results.indexes.length > 0) {
    console.log(`\n📇 索引 (${results.indexes.length} 个):`)
    results.indexes.forEach(idx => {
      console.log(`   - ${idx.indexname}`)
    })
  }

  if (results.columns && results.columns.length > 0) {
    console.log(`\n📋 Merchants 表列 (${results.columns.length} 个):`)
    results.columns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'
      console.log(`   - ${col.column_name} (${col.data_type}) ${nullable}`)
    })
  }

  console.log('\n' + '='.repeat(60))
  console.log('\n💡 提示: 如果无法通过此脚本执行，请在 Supabase Dashboard 的 SQL Editor 中')
  console.log('   直接运行 scripts/check-merchant-dependencies.sql 文件')
}

checkDependencies().catch(console.error)

