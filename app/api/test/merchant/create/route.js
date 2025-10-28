import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function GET() {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 创建测试商家用户
    const testEmail = 'taoliu0711@gmail.com'
    const testPassword = 'password123'
    const hashedPassword = await bcrypt.hash(testPassword, 10)

    // 检查用户是否存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', testEmail)
      .single()

    let userId
    if (existingUser) {
      // 更新现有用户为商家
      const { data: updatedUser } = await supabase
        .from('users')
        .update({ role: 'merchant', password_hash: hashedPassword })
        .eq('email', testEmail)
        .select()
        .single()
      userId = updatedUser.id
    } else {
      // 创建新商家用户
      const { data: newUser } = await supabase
        .from('users')
        .insert([{
          email: testEmail,
          name: 'Test Merchant',
          age: 25,
          password_hash: hashedPassword,
          role: 'merchant'
        }])
        .select()
        .single()
      userId = newUser.id
    }

    // 检查商家记录是否存在
    const { data: existingMerchant } = await supabase
      .from('merchants')
      .select('*')
      .eq('owner_user_id', userId)
      .single()

    let merchantId
    if (existingMerchant) {
      merchantId = existingMerchant.id
    } else {
      // 创建商家记录
      const { data: newMerchant } = await supabase
        .from('merchants')
        .insert([{
          owner_user_id: userId,
          name: 'Test Merchant Business',
          description: 'Test merchant account for development',
          verified: true,
          status: 'active'
        }])
        .select()
        .single()
      merchantId = newMerchant.id
    }

    return NextResponse.json({
      success: true,
      message: 'Test merchant created/updated',
      credentials: {
        email: testEmail,
        password: testPassword
      },
      userId,
      merchantId
    })

  } catch (error) {
    console.error('Error creating test merchant:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


