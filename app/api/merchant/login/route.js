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
    
    // 策略1: 首先尝试通过 Supabase Auth 认证（支持 OAuth 用户）
    // 创建一个临时客户端用于认证
    const authClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    let authUser = null
    let userFromUsersTable = null
    let supabaseAuthUid = null
    
    // 尝试通过 Supabase Auth 登录
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email: normalizedEmail,
      password: password
    })
    
    if (authData?.user) {
      authUser = authData.user
      supabaseAuthUid = authUser.id
      console.log('✅ Supabase Auth 认证成功:', { 
        id: authUser.id, 
        email: authUser.email 
      })
    } else if (authError) {
      console.log('⚠️ Supabase Auth 认证失败，尝试通过 users 表认证:', authError.message)
    }
    
    // 策略2: 如果 Supabase Auth 认证失败，尝试通过 users 表认证（向后兼容）
    if (!authUser) {
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
      
      userFromUsersTable = user
      // 如果 users 表中有 supabase_uid 字段，使用它；否则使用 user.id
      supabaseAuthUid = user.supabase_uid || user.id
    }

    // 查找关联的商家信息
    // 优先使用 Supabase Auth UID 查找（支持 OAuth 用户）
    let merchant = null
    let merchantError = null
    
    if (supabaseAuthUid) {
      // 尝试通过 owner_supabase_uid 查找（优先）
      const { data: merchantBySupabaseUid, error: merchantError1 } = await supabase
        .from('merchants')
        .select('*')
        .eq('owner_supabase_uid', supabaseAuthUid)
        .maybeSingle()
      
      if (merchantBySupabaseUid) {
        merchant = merchantBySupabaseUid
        console.log('✅ 通过 owner_supabase_uid 找到商家:', merchant.id)
      } else {
        // 回退：尝试通过 owner_user_id 查找（向后兼容）
        const { data: merchantByUserId, error: merchantError2 } = await supabase
          .from('merchants')
          .select('*')
          .eq('owner_user_id', supabaseAuthUid)
          .maybeSingle()
        
        if (merchantByUserId) {
          merchant = merchantByUserId
          console.log('✅ 通过 owner_user_id 找到商家:', merchant.id)
          // 如果找到但使用的是旧字段，尝试更新到新字段
          if (!merchant.owner_supabase_uid && supabaseAuthUid) {
            await supabase
              .from('merchants')
              .update({ owner_supabase_uid: supabaseAuthUid })
              .eq('id', merchant.id)
          }
        }
        merchantError = merchantError2
      }
    }

    if (merchantError && merchantError.code !== 'PGRST116') {
      console.warn('⚠️ 查询商家信息失败:', merchantError)
    }

    if (!merchant) {
      console.log('⚠️ 未找到关联的商家记录')
      return NextResponse.json(
        {
          success: false,
          error: 'NO_MERCHANT_FOUND',
          message: '未找到关联的商家账户，请联系管理员'
        },
        { status: 404 }
      )
    }

    // 准备返回的用户信息
    let userResponse = null
    if (userFromUsersTable) {
      userResponse = { ...userFromUsersTable }
      delete userResponse.password_hash
    } else if (authUser) {
      // 如果只有 Supabase Auth 用户，创建一个基本的用户对象
      userResponse = {
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || '商家用户',
        role: 'merchant',
        supabase_uid: authUser.id
      }
    }

    return NextResponse.json({
      success: true,
      message: '登录成功',
      user: userResponse,
      merchant: merchant
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
