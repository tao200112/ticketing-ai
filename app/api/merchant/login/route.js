import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'
import { hasSupabase } from '../../../../lib/safeEnv'
import bcrypt from 'bcryptjs'

export async function POST(request) {
  try {
    console.log('🔍 Merchant login attempt started')
    const { email, password } = await request.json()
    
    console.log('📝 Login data:', { email })

    // 基本验证
    if (!email || !password) {
      console.log('❌ Missing email or password')
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // 检查Supabase配置
    console.log('🔧 Supabase configuration check:', {
      hasSupabase: hasSupabase(),
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    })

    let user = null

    if (hasSupabase()) {
      console.log('✅ Using Supabase for merchant authentication')
      // 使用 Supabase 验证商户
      if (supabase) {
        // 首先查找用户
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .eq('role', 'merchant')
          .single()

        if (userError || !userData) {
          console.log('❌ Merchant not found in Supabase')
          return NextResponse.json(
            { error: 'User not found, please check email or register first' },
            { status: 404 }
          )
        }

        // 验证密码
        const isValidPassword = await bcrypt.compare(password, userData.password_hash)
        if (!isValidPassword) {
          console.log('❌ Invalid password')
          return NextResponse.json(
            { error: 'Incorrect password, please check password' },
            { status: 401 }
          )
        }

        // 查找关联的商家信息
        const { data: merchantData, error: merchantError } = await supabase
          .from('merchants')
          .select('*')
          .eq('owner_user_id', userData.id)
          .single()

        if (merchantError || !merchantData) {
          console.log('❌ Merchant profile not found')
          return NextResponse.json(
            { error: 'Merchant profile not found' },
            { status: 404 }
          )
        }

        user = {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          businessName: merchantData.name,
          phone: merchantData.contact_phone || '',
          maxEvents: 10,
          isActive: merchantData.status === 'active',
          verified: merchantData.verified,
          createdAt: userData.created_at
        }
      }
    } else {
      console.log('⚠️ Supabase not available, using fallback method')
      // 降级到本地存储 - 这里我们返回一个模拟的成功响应
      // 因为在实际部署中，localStorage数据不会在服务器端可用
      console.log('📝 Simulating merchant login for:', email)
      
      // 模拟验证（在实际应用中，这应该从数据库获取）
      if (email === 'test@merchant.com' && password === 'test123') {
        user = {
          id: 'test-merchant-123',
          email: 'test@merchant.com',
          name: 'Test Merchant',
          businessName: 'Test Business',
          phone: '1234567890',
          maxEvents: 10,
          isActive: true,
          verified: true,
          createdAt: new Date().toISOString()
        }
        console.log('✅ Test merchant login successful')
      } else {
        console.log('❌ Invalid credentials')
        return NextResponse.json(
          { error: 'User not found, please check email or register first' },
          { status: 404 }
        )
      }
    }

    console.log('✅ Merchant login successful:', user.email)
    
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: user
    })

  } catch (error) {
    console.error('Merchant login error:', error)
    return NextResponse.json(
      { error: 'Login failed, please try again' },
      { status: 500 }
    )
  }
}
