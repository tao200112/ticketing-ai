/**
 * 同步 Merchants 表的 owner_supabase_uid 字段
 * 
 * 用途：
 *   根据 merchants.contact_email 匹配 Supabase auth.users.email，
 *   自动填充 owner_supabase_uid 字段
 * 
 * 使用方法：
 *   node scripts/sync_merchant_owner_supabase_uid.js
 * 
 * 环境变量：
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少环境变量: NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function syncMerchantOwnerSupabaseUid() {
  console.log('🔄 开始同步 merchants.owner_supabase_uid...\n')

  try {
    // 1. 获取所有需要同步的商家（owner_supabase_uid 为空但 contact_email 存在）
    const { data: merchants, error: merchantsError } = await supabase
      .from('merchants')
      .select('id, name, contact_email, owner_supabase_uid, owner_user_id')
      .is('owner_supabase_uid', null)
      .not('contact_email', 'is', null)

    if (merchantsError) {
      console.error('❌ 获取商家列表失败:', merchantsError)
      return
    }

    if (!merchants || merchants.length === 0) {
      console.log('✅ 没有需要同步的商家')
      return
    }

    console.log(`📋 找到 ${merchants.length} 个需要同步的商家\n`)

    let successCount = 0
    let failedCount = 0
    const unmatched = []

    // 2. 对每个商家，查找匹配的 Supabase Auth 用户
    for (const merchant of merchants) {
      console.log(`处理商家: ${merchant.name} (${merchant.contact_email})`)

      // 从 Supabase Auth 查找用户
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

      if (authError) {
        console.error(`  ❌ 查询 Auth 用户失败:`, authError)
        failedCount++
        unmatched.push(merchant)
        continue
      }

      // 查找匹配的邮箱
      const matchedUser = authUsers.users.find(
        user => user.email?.toLowerCase() === merchant.contact_email?.toLowerCase()
      )

      if (!matchedUser) {
        console.log(`  ⚠️  未找到匹配的 Supabase Auth 用户`)
        unmatched.push(merchant)
        failedCount++
        continue
      }

      // 3. 更新 owner_supabase_uid
      const { error: updateError } = await supabase
        .from('merchants')
        .update({ owner_supabase_uid: matchedUser.id })
        .eq('id', merchant.id)

      if (updateError) {
        console.error(`  ❌ 更新失败:`, updateError)
        failedCount++
        unmatched.push(merchant)
      } else {
        console.log(`  ✅ 已更新 owner_supabase_uid: ${matchedUser.id}`)
        successCount++
      }
    }

    // 4. 输出结果
    console.log('\n' + '='.repeat(50))
    console.log('📊 同步结果:')
    console.log(`  ✅ 成功: ${successCount}`)
    console.log(`  ❌ 失败: ${failedCount}`)
    console.log('='.repeat(50))

    if (unmatched.length > 0) {
      console.log('\n⚠️  无法匹配的商家（需要手动处理）:')
      unmatched.forEach(m => {
        console.log(`  - ${m.name} (${m.contact_email})`)
      })
      console.log('\n提示: 这些商家可能需要在 Supabase Auth 中创建对应的用户，或手动设置 owner_supabase_uid')
    }

  } catch (error) {
    console.error('❌ 同步过程出错:', error)
    process.exit(1)
  }
}

syncMerchantOwnerSupabaseUid()
  .then(() => {
    console.log('\n✅ 同步完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 同步失败:', error)
    process.exit(1)
  })

