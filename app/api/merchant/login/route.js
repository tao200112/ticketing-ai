import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { isGoogleOauthPasswordPlaceholder } from '@/lib/auth/password-placeholder'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password } = body

    // 验证必需字段
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'MISSING_FIELDS',
          message: '缺少必需字段'
        },
        { status: 400 }
      )
    }

    // 如果没有配置 Supabase，返回配置错误
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'CONFIG_ERROR',
          message: '系统未配置 Supabase，无法登录'
        },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 规范化邮箱
    const normalizedEmail = email.trim().toLowerCase()
    
    // 查找商家用户（role='merchant'）
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('role', 'merchant')
      .maybeSingle()

    console.log('🔍 查询商家用户结果:', { user: user ? { id: user.id, email: user.email, role: user.role } : null, error })

    if (error && error.code !== 'PGRST116') {
      console.error('❌ 查询商家用户错误:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'DATABASE_ERROR',
          message: '数据库查询错误'
        },
        { status: 500 }
      )
    }

    if (!user) {
      console.log('❌ 未找到商家用户')
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: '邮箱或密码错误'
        },
        { status: 401 }
      )
    }

    // 验证密码
    if (
      !user.password_hash ||
      isGoogleOauthPasswordPlaceholder(user.password_hash)
    ) {
      console.log('❌ 商家账户启用了 OAuth，需要使用 Google 登录', {
        userId: user.id,
        email: user.email
      })
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: '邮箱或密码错误'
        },
        { status: 401 }
      )
    }

    console.log('🔑 验证密码:', { 
      email: normalizedEmail,
      passwordLength: password.length,
      hasPasswordHash: !!user.password_hash,
      hashPrefix: user.password_hash?.substring(0, 30) + '...',
      userId: user.id
    })
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    console.log('✅ 密码验证结果:', isValidPassword)
    
    if (!isValidPassword) {
      console.error('❌ 密码验证失败:', {
        email: normalizedEmail,
        userId: user.id,
        providedPasswordLength: password.length,
        storedHashLength: user.password_hash?.length
      })
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: '邮箱或密码错误'
        },
        { status: 401 }
      )
    }

    // 查找关联的商家信息
    // 首先尝试通过 Supabase Auth UID 查找（新方式）
    // 如果 users 表有 supabase_uid 字段，使用它；否则回退到 user.id
    let merchant = null
    let merchantError = null
    
    // 尝试通过 owner_supabase_uid 查找（优先）
    const { data: merchantBySupabaseUid, error: merchantError1 } = await supabase
      .from('merchants')
      .select('*')
      .eq('owner_supabase_uid', user.id)
      .maybeSingle()
    
    if (merchantBySupabaseUid) {
      merchant = merchantBySupabaseUid
    } else {
      // 回退：尝试通过 owner_user_id 查找（向后兼容）
      const { data: merchantByUserId, error: merchantError2 } = await supabase
        .from('merchants')
        .select('*')
        .eq('owner_user_id', user.id)
        .maybeSingle()
      
      if (merchantByUserId) {
        merchant = merchantByUserId
        // 如果找到但使用的是旧字段，尝试更新到新字段
        if (!merchant.owner_supabase_uid) {
          await supabase
            .from('merchants')
            .update({ owner_supabase_uid: user.id })
            .eq('id', merchant.id)
        }
      }
      merchantError = merchantError2
    }

    if (merchantError && merchantError.code !== 'PGRST116') {
      console.warn('⚠️ 查询商家信息失败:', merchantError)
    }

    // 移除密码字段
    delete user.password_hash

    return NextResponse.json({
      success: true,
      message: '登录成功',
      user,
      merchant: merchant || null
    })

  } catch (error) {
    console.error('❌ API 错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: '服务器内部错误'
      },
      { status: 500 }
    )
  }
}
