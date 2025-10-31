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

    // 获取商家信息（注意：数据库字段是 owner_user_id）
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('*')
      .eq('owner_user_id', user.id)
      .single()
    
    console.log('🏪 商家信息:', merchant)
    console.log('🏪 商家查询错误:', merchantError)

    // 查询用户在 merchant_members 表中的角色（如果是员工）
    let merchantRole = 'boss' // 默认为boss（owner）
    let memberMerchantId = merchant?.id || null
    
    if (merchant?.id) {
      // 如果是owner，角色是boss
      merchantRole = 'boss'
      // 但也要检查是否同时在merchant_members中，如果是staff，也要记录
      const { data: member } = await supabase
        .from('merchant_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('merchant_id', merchant.id)
        .single()
      
      if (member) {
        // 如果同时在merchant_members中，使用该角色（可能是staff）
        merchantRole = member.role
      }
    } else {
      // 如果不是owner，查询是否是员工
      const { data: member, error: memberError } = await supabase
        .from('merchant_members')
        .select('merchant_id, role')
        .eq('user_id', user.id)
        .single()
      
      if (!memberError && member) {
        merchantRole = member.role
        memberMerchantId = member.merchant_id
        
        // 获取员工所属的商家信息
        const { data: memberMerchant } = await supabase
          .from('merchants')
          .select('*')
          .eq('id', member.merchant_id)
          .single()
        
        if (memberMerchant) {
          merchant = memberMerchant
        }
      } else {
        // 既不是owner也不是员工，返回错误
        console.log('❌ 用户既不是商家owner也不是员工')
        return NextResponse.json(
          {
            success: false,
            error: 'NO_MERCHANT_ACCESS',
            message: '您没有商家访问权限'
          },
          { status: 403 }
        )
      }
    }
    
    // 确保用户有merchant_id
    if (!merchant?.id && !memberMerchantId) {
      console.log('❌ 用户没有关联的商家')
      return NextResponse.json(
        {
          success: false,
          error: 'NO_MERCHANT_ACCESS',
          message: '您没有关联的商家账户'
        },
        { status: 403 }
      )
    }

    // 移除密码字段
    delete user.password_hash

    // 构造返回数据，包含 merchant_id 和 role 字段
    const finalMerchantId = merchant?.id || memberMerchantId
    const userData = {
      ...user,
      merchant_id: finalMerchantId,
      merchant: merchant || null,
      merchant_role: merchantRole // 商家内部角色: boss 或 staff
    }
    
    // 确保merchant_id存在
    if (!finalMerchantId) {
      console.log('❌ 无法确定用户的商家ID')
      return NextResponse.json(
        {
          success: false,
          error: 'NO_MERCHANT_ACCESS',
          message: '无法确定您的商家账户'
        },
        { status: 403 }
      )
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
