/**
 * 诊断商家登录和注册问题
 * 检查数据库中的用户和商家记录
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 配置缺失')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnose() {
  const email = 'taoliu0711@gmail.com'
  const supabaseAuthUid = 'fe9e9f3d-0362-48a0-abaf-0d2314ff5e22'
  
  console.log('🔍 诊断商家登录和注册问题\n')
  console.log(`邮箱: ${email}`)
  console.log(`Supabase Auth UID: ${supabaseAuthUid}\n`)

  // 1. 检查 users 表中的用户
  console.log('1️⃣ 检查 users 表中的用户记录:')
  const { data: usersByEmail, error: usersError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  
  if (usersError && usersError.code !== 'PGRST116') {
    console.error('❌ 查询 users 表错误:', usersError)
  } else if (usersByEmail) {
    console.log('✅ 找到 users 表记录:')
    console.log(JSON.stringify(usersByEmail, null, 2))
  } else {
    console.log('❌ users 表中没有找到该邮箱的用户')
  }

  // 2. 检查 merchants 表中的商家记录
  console.log('\n2️⃣ 检查 merchants 表中的商家记录:')
  
  // 通过 owner_supabase_uid 查找
  const { data: merchantByUid, error: merchantUidError } = await supabase
    .from('merchants')
    .select('*')
    .eq('owner_supabase_uid', supabaseAuthUid)
    .maybeSingle()
  
  if (merchantUidError && merchantUidError.code !== 'PGRST116') {
    console.error('❌ 通过 owner_supabase_uid 查询错误:', merchantUidError)
  } else if (merchantByUid) {
    console.log('✅ 通过 owner_supabase_uid 找到商家:')
    console.log(JSON.stringify(merchantByUid, null, 2))
  } else {
    console.log('❌ 通过 owner_supabase_uid 没有找到商家')
  }

  // 通过 contact_email 查找
  const { data: merchantByEmail, error: merchantEmailError } = await supabase
    .from('merchants')
    .select('*')
    .eq('contact_email', email.toLowerCase())
    .maybeSingle()
  
  if (merchantEmailError && merchantEmailError.code !== 'PGRST116') {
    console.error('❌ 通过 contact_email 查询错误:', merchantEmailError)
  } else if (merchantByEmail) {
    console.log('✅ 通过 contact_email 找到商家:')
    console.log(JSON.stringify(merchantByEmail, null, 2))
  } else {
    console.log('❌ 通过 contact_email 没有找到商家')
  }

  // 3. 检查 Supabase Auth 用户（如果可能）
  console.log('\n3️⃣ 检查 Supabase Auth 用户:')
  try {
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(supabaseAuthUid)
    if (authError) {
      console.log('⚠️ 无法查询 Supabase Auth（可能需要 service role key）:', authError.message)
    } else if (authUser) {
      console.log('✅ Supabase Auth 用户存在:')
      console.log(JSON.stringify({
        id: authUser.user.id,
        email: authUser.user.email,
        created_at: authUser.user.created_at
      }, null, 2))
    }
  } catch (error) {
    console.log('⚠️ 无法查询 Supabase Auth:', error.message)
  }

  // 4. 总结和建议
  console.log('\n📋 诊断总结:')
  const hasUserInUsersTable = !!usersByEmail
  const hasMerchantByUid = !!merchantByUid
  const hasMerchantByEmail = !!merchantByEmail
  
  if (hasMerchantByUid && !hasUserInUsersTable) {
    console.log('⚠️ 问题: 商家记录存在（通过 owner_supabase_uid），但 users 表中没有对应的用户记录')
    console.log('💡 建议: 需要在 users 表中创建对应的用户记录，或修改登录逻辑支持通过 Supabase Auth UID 查找')
  } else if (hasMerchantByUid && hasUserInUsersTable && usersByEmail.role !== 'merchant') {
    console.log('⚠️ 问题: 商家记录存在，但 users 表中的用户角色不是 merchant')
    console.log('💡 建议: 更新 users 表中的用户角色为 merchant')
  } else if (hasMerchantByUid && !hasMerchantByEmail) {
    console.log('⚠️ 问题: 商家记录存在，但 contact_email 不匹配')
    console.log('💡 建议: 更新商家记录的 contact_email 字段')
  } else if (!hasMerchantByUid && !hasUserInUsersTable) {
    console.log('✅ 状态: 没有找到商家或用户记录，可以正常注册')
  } else {
    console.log('✅ 状态: 数据看起来正常')
  }
}

diagnose().catch(console.error)

