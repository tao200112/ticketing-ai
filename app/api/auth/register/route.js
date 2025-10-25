import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'
import { hasSupabase } from '../../../../lib/safeEnv'
import bcrypt from 'bcryptjs'
import localUserStorage from '../../../../lib/user-storage'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const { email, name, age, password } = await request.json()

    // 基本验证
    if (!email || !name || !age || !password) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 密码强度验证 - 只需要大于8位
    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    if (age < 16) {
      return NextResponse.json(
        { message: 'Age must be 16 or older' },
        { status: 400 }
      )
    }

    // 检查 Supabase 是否可用
    if (hasSupabase()) {
      try {
        // 使用服务端 Supabase 客户端
        const supabase = createServerSupabaseClient()
        
        if (!supabase) {
          throw new Error('Supabase client initialization failed')
        }

        // Check if email already exists
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking user existence:', checkError)
          throw new Error('Database query failed')
        }

        if (existingUser) {
          return NextResponse.json(
            { message: 'Email already registered' },
            { status: 409 }
          )
        }

        // Hash password
        const saltRounds = 12
        const hashedPassword = await bcrypt.hash(password, saltRounds)

        // Create new user
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([
            {
              email: email,
              name: name,
              age: parseInt(age),
              password_hash: hashedPassword,
              created_at: new Date().toISOString()
            }
          ])
          .select()
          .single()

        if (insertError) {
          console.error('Error creating user:', insertError)
          
          // If table does not exist, fallback to local simulation
          if (insertError.code === '42P01' || insertError.message?.includes('relation "users" does not exist')) {
            console.log('🔄 users table does not exist, fallback to local simulation mode')
            return NextResponse.json({
              ok: true,
              source: 'local',
              message: 'Registration successful (local simulation)'
            })
          }
          
          throw new Error('Database insert failed')
        }

        // Return Supabase success response (excluding password hash)
        return NextResponse.json({
          ok: true,
          source: 'supabase',
          message: 'Registration successful',
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            age: newUser.age,
            created_at: newUser.created_at
          }
        })

      } catch (dbError) {
        console.error('Supabase operation failed, fallback to local storage:', dbError)
        
      try {
        // Use local storage
        const user = await localUserStorage.createUser({ email, name, age, password })
        console.log('✅ Local storage registration successful:', user)
        return NextResponse.json({
          ok: true,
          source: 'local',
          message: 'Registration successful (local storage)',
          user,
          fallback_reason: dbError.message
        })
      } catch (localError) {
          console.error('Local storage also failed:', localError)
          return NextResponse.json({
            message: localError.message || 'Registration failed',
            source: 'error'
          }, { status: 500 })
        }
      }
    } else {
      // Supabase 不可用，使用本地存储
      console.log('🔄 Supabase unavailable, using local storage mode')
      try {
        const user = await localUserStorage.createUser({ email, name, age, password })
        console.log('✅ Local storage registration successful:', user)
        return NextResponse.json({
          ok: true,
          source: 'local',
          message: 'Registration successful (local storage)',
          user
        })
      } catch (error) {
        console.error('Local storage failed:', error)
        return NextResponse.json({
          message: error.message || 'Registration failed',
          source: 'error'
        }, { status: 500 })
      }
    }

  } catch (error) {
    console.error('Registration API error:', error)
    return NextResponse.json(
      { message: 'Server error, please try again later' },
      { status: 500 }
    )
  }
}
