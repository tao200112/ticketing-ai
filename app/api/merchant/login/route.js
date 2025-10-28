import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

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

    // 查找商家用户
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('role', 'merchant')
      .single()

    console.log('🔍 查询用户结果:', { user, error })

    if (error || !user) {
      console.log('❌ 未找到商家用户或查询错误:', error)
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
    console.log('🔑 验证密码:', { password, hash: user.password_hash?.substring(0, 20) + '...' })
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    console.log('✅ 密码验证结果:', isValidPassword)
    
    if (!isValidPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: '邮箱或密码错误'
        },
        { status: 401 }
      )
    }

    // 获取商家信息（注意：数据库字段是 owner_user_id）
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('*')
      .eq('owner_user_id', user.id)
      .single()
    
    console.log('🏪 商家信息:', merchant)
    console.log('🏪 商家查询错误:', merchantError)

    // 移除密码字段
    delete user.password_hash

    // 构造返回数据，包含 merchant_id 字段
    const userData = {
      ...user,
      merchant_id: merchant?.id || null, // 添加 merchant_id 字段
      merchant: merchant || null // 保留完整的 merchant 对象
    }
    
    console.log('📤 返回的用户数据:', { id: userData.id, merchant_id: userData.merchant_id, hasMerchant: !!userData.merchant })

    return NextResponse.json({
      success: true,
      message: '登录成功',
      user: userData
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
