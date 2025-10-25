import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'
import { hasSupabase } from '../../../../lib/safeEnv'
import bcrypt from 'bcryptjs'
import localUserStorage from '../../../../lib/user-storage'

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

    // 检查 Supabase 是否可用
    if (hasSupabase()) {
      try {
        // 使用服务端 Supabase 客户端
        const supabase = await createServerSupabaseClient()
        
        if (!supabase) {
          throw new Error('Supabase client initialization failed')
        }

        // Find user
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single()

        if (userError) {
          if (userError.code === 'PGRST116') {
            return NextResponse.json(
              { message: 'User not found, please check email or register first' },
              { status: 404 }
            )
          }
          console.error('Supabase user query failed:', userError)
          throw new Error('Database query failed')
        }

        if (!user) {
          return NextResponse.json(
            { message: 'User not found, please check email or register first' },
            { status: 404 }
          )
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash)
        if (!isValidPassword) {
          return NextResponse.json(
            { message: 'Incorrect password, please check password' },
            { status: 401 }
          )
        }

        // Return user data (excluding password hash)
        return NextResponse.json({
          ok: true,
          source: 'supabase',
          message: 'Login successful',
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            age: user.age,
            created_at: user.created_at
          }
        })

      } catch (dbError) {
        console.error('Supabase login failed, fallback to local storage:', dbError)
        
        try {
          // Use local storage
          console.log('🔍 Attempting local storage login, email:', email)
          const user = await localUserStorage.authenticateUser(email, password)
          console.log('✅ Local storage login successful:', user)
          return NextResponse.json({
            ok: true,
            source: 'local',
            message: 'Login successful (local storage)',
            user,
            fallback_reason: dbError.message
          })
        } catch (localError) {
          console.error('Local storage login failed:', localError)
          // 根据错误类型返回更具体的错误信息
          let errorMessage = 'Login failed'
          if (localError.message === '用户不存在') {
            errorMessage = 'User not found, please check email or register first'
          } else if (localError.message === '密码错误') {
            errorMessage = 'Incorrect password, please check password'
          } else if (localError.message === '用户密码数据异常') {
            errorMessage = '用户数据异常，请联系管理员'
          }
          
          return NextResponse.json({
            message: errorMessage,
            source: 'error'
          }, { status: 401 })
        }
      }
    } else {
      // Supabase 不可用，使用本地存储
      console.log('🔄 Supabase unavailable, using local storage mode')
      try {
        console.log('🔍 Attempting local storage login, email:', email)
        const user = await localUserStorage.authenticateUser(email, password)
        console.log('✅ Local storage login successful:', user)
        return NextResponse.json({
          ok: true,
          source: 'local',
          message: 'Login successful (local storage)',
          user
        })
      } catch (error) {
        console.error('Local storage login failed:', error)
        // 根据错误类型返回更具体的错误信息
        let errorMessage = '登录失败'
        if (error.message === '用户不存在') {
          errorMessage = '用户不存在，请检查邮箱地址或先注册账户'
        } else if (error.message === '密码错误') {
          errorMessage = '密码错误，请检查密码是否正确'
        } else if (error.message === '用户密码数据异常') {
          errorMessage = '用户数据异常，请联系管理员'
        }
        
        return NextResponse.json({
          message: errorMessage,
          source: 'error'
        }, { status: 401 })
      }
    }

  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { message: 'Server error, please try again later' },
      { status: 500 }
    )
  }
}
