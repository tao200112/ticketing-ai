import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase-admin'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    // 基本验证
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Please enter email and password' },
        { status: 400 }
      )
    }

    console.log('🔍 Login attempt for email:', email)

    // 检查 Supabase 配置
    if (!supabaseAdmin) {
      console.error('❌ Supabase admin client not available')
      return NextResponse.json(
        { message: 'Database connection failed' },
        { status: 500 }
      )
    }

    try {
      // 查找用户
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (userError) {
        console.error('❌ User query failed:', userError)
        if (userError.code === 'PGRST116') {
          return NextResponse.json(
            { message: 'User not found, please check email or register first' },
            { status: 404 }
          )
        }
        return NextResponse.json(
          { message: 'Database query failed' },
          { status: 500 }
        )
      }

      if (!user) {
        return NextResponse.json(
          { message: 'User not found, please check email or register first' },
          { status: 404 }
        )
      }

      console.log('✅ User found:', user.email)

      // 验证密码
      const isValidPassword = await bcrypt.compare(password, user.password_hash)
      if (!isValidPassword) {
        console.log('❌ Invalid password for user:', user.email)
        return NextResponse.json(
          { message: 'Incorrect password, please check password' },
          { status: 401 }
        )
      }

      console.log('✅ Login successful for user:', user.email)

      // 返回用户数据（排除密码哈希）
      return NextResponse.json({
        ok: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          age: user.age,
          role: user.role,
          created_at: user.created_at
        }
      })

    } catch (dbError) {
      console.error('❌ Database error during login:', dbError)
      return NextResponse.json(
        { message: 'Database error, please try again later' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Login API error:', error)
    return NextResponse.json(
      { message: 'Server error, please try again later' },
      { status: 500 }
    )
  }
}
