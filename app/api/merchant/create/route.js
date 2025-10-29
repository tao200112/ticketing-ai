import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function POST(request) {
  try {
    const body = await request.json()
    const { businessName, phone, inviteCode, userId, email, password, name, age } = body

    console.log('📦 收到商家注册请求:', { businessName, inviteCode, userId })

    // 验证必需字段
    if (!businessName || !inviteCode) {
      return NextResponse.json(
        {
          ok: false,
          reason: 'MISSING_FIELDS'
        },
        { status: 400 }
      )
    }

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          ok: false,
          reason: 'CONFIG_ERROR'
        },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 验证邀请码
    const { data: inviteCodeData, error: inviteError } = await supabase
      .from('admin_invite_codes')
      .select('*')
      .eq('code', inviteCode)
      .eq('is_active', true)
      .single()

    if (inviteError || !inviteCodeData) {
      console.error('❌ 邀请码无效:', inviteError)
      return NextResponse.json(
        {
          ok: false,
          reason: 'invalid_invite'
        },
        { status: 400 }
      )
    }

    // 检查邀请码是否过期
    if (new Date(inviteCodeData.expires_at) < new Date()) {
      console.error('❌ 邀请码已过期')
      return NextResponse.json(
        {
          ok: false,
          reason: 'invalid_invite'
        },
        { status: 400 }
      )
    }

    // 检查邀请码是否已被使用
    if (inviteCodeData.used_by) {
      console.error('❌ 邀请码已被使用')
      return NextResponse.json(
        {
          ok: false,
          reason: 'invalid_invite'
        },
        { status: 400 }
      )
    }

    let userRecord
    let finalUserId = userId

    // 如果没有 userId，需要先创建用户
    if (!userId) {
      if (!email || !password || !name || !age) {
        return NextResponse.json(
          {
            ok: false,
            reason: 'MISSING_USER_INFO'
          },
          { status: 400 }
        )
      }

      // 检查邮箱是否已存在
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

      if (existingUser) {
        return NextResponse.json(
          {
            ok: false,
            reason: 'EMAIL_EXISTS'
          },
          { status: 400 }
        )
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10)

      // 创建商家用户
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert([{
          email,
          name,
          age: parseInt(age),
          password_hash: hashedPassword,
          role: 'merchant'
        }])
        .select()
        .single()

      if (userError) {
        console.error('❌ 创建用户失败:', userError)
        return NextResponse.json(
          {
            ok: false,
            reason: 'USER_CREATION_FAILED'
          },
          { status: 500 }
        )
      }

      userRecord = newUser
      finalUserId = newUser.id
    } else {
      // 更新现有用户角色为商家
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ role: 'merchant' })
        .eq('id', userId)
        .select()
        .single()

      if (updateError) {
        console.error('❌ 更新用户失败:', updateError)
        return NextResponse.json(
          {
            ok: false,
            reason: 'USER_UPDATE_FAILED'
          },
          { status: 500 }
        )
      }

      userRecord = updatedUser
    }

    // 检查用户是否已有商家账户
    const { data: existingMerchant } = await supabase
      .from('merchants')
      .select('*')
      .eq('owner_user_id', finalUserId)
      .single()

    if (existingMerchant) {
      console.error('❌ 用户已有商家账户')
      return NextResponse.json(
        {
          ok: false,
          reason: 'merchant_exists'
        },
        { status: 400 }
      )
    }

    // 创建商家记录
    const { data: newMerchant, error: merchantError } = await supabase
      .from('merchants')
      .insert([{
        owner_user_id: finalUserId,
        name: businessName,
        description: `商家联系方式: ${phone}`,
        contact_email: userRecord.email,
        verified: false,
        status: 'active'
      }])
      .select()
      .single()

    if (merchantError) {
      console.error('❌ 创建商家失败:', merchantError)
      return NextResponse.json(
        {
          ok: false,
          reason: 'MERCHANT_CREATION_FAILED'
        },
        { status: 500 }
      )
    }

    // 标记邀请码为已使用
    await supabase
      .from('admin_invite_codes')
      .update({
        used_by: finalUserId,
        used_at: new Date().toISOString()
      })
      .eq('id', inviteCodeData.id)

    console.log('✅ 商家创建成功:', newMerchant.id)

    return NextResponse.json({
      ok: true,
      merchant: newMerchant,
      user: userRecord
    })

  } catch (error) {
    console.error('❌ API 错误:', error)
    return NextResponse.json(
      {
        ok: false,
        reason: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}





