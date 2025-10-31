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
    if (!user.password_hash) {
      console.log('❌ 用户没有密码哈希')
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: '邮箱或密码错误'
        },
        { status: 401 }
      )
    }
    
    console.log('🔑 验证密码:', { password: password.substring(0, 2) + '***', hash: user.password_hash?.substring(0, 20) + '...' })
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    console.log('✅ 密码验证结果:', isValidPassword)
    
    if (!isValidPassword) {
      console.log('❌ 密码验证失败')
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: '邮箱或密码错误'
        },
        { status: 401 }
      )
    }

    // 获取商家信息（先尝试作为owner）
    let merchant = null
    let merchantId = null
    
    const { data: ownerMerchant, error: merchantError } = await supabase
      .from('merchants')
      .select('*')
      .eq('owner_user_id', user.id)
      .single()
    
    if (!merchantError && ownerMerchant) {
      merchant = ownerMerchant
      merchantId = ownerMerchant.id
      console.log('🏪 找到商家（owner）:', merchant.id)
    } else {
      // 如果不是owner，尝试作为员工查找
      const { data: member, error: memberError } = await supabase
        .from('merchant_members')
        .select('merchant_id')
        .eq('user_id', user.id)
        .single()
      
      if (!memberError && member) {
        merchantId = member.merchant_id
        // 获取员工所属的商家信息
        const { data: memberMerchant } = await supabase
          .from('merchants')
          .select('*')
          .eq('id', member.merchant_id)
          .single()
        
        if (memberMerchant) {
          merchant = memberMerchant
          console.log('🏪 找到商家（员工）:', merchant.id)
        }
      }
    }
    
    // 如果既不是owner也不是员工，返回错误
    if (!merchant && !merchantId) {
      console.log('❌ 用户没有关联的商家')
      return NextResponse.json(
        {
          success: false,
          error: 'NO_MERCHANT_ACCESS',
          message: '您没有关联的商家账户，请联系管理员'
        },
        { status: 403 }
      )
    }

    // 移除密码字段
    delete user.password_hash

    // 构造返回数据
    // 注意：不区分boss/staff角色，所有商家用户登录后都能访问Staff和Boss页面
    // Boss页面通过第二重密码（boss123）验证
    const finalMerchantId = merchant?.id || merchantId
    const userData = {
      ...user,
      merchant_id: finalMerchantId,
      merchant: merchant || null,
      merchant_role: 'boss' // 默认设置为boss，但不用于页面访问控制
    }
    
    console.log('📤 返回的用户数据:', { 
      id: userData.id, 
      merchant_id: userData.merchant_id, 
      merchant_role: userData.merchant_role,
      hasMerchant: !!userData.merchant 
    })

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
