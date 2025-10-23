import { NextResponse } from 'next/server'
import { getSupabaseClient } from '../../../../lib/supabase'
import { hasSupabase } from '../../../../lib/safeEnv'
import bcrypt from 'bcryptjs'
import localUserStorage from '../../../../lib/user-storage'

export async function POST(request) {
  try {
    const { email, name, age, password } = await request.json()

    // 基本验证
    if (!email || !name || !age || !password) {
      return NextResponse.json(
        { message: '缺少必填字段' },
        { status: 400 }
      )
    }

    // 密码强度验证
    if (password.length < 8) {
      return NextResponse.json(
        { message: '密码至少需要8个字符' },
        { status: 400 }
      )
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return NextResponse.json(
        { message: '密码必须包含大小写字母和数字' },
        { status: 400 }
      )
    }

    if (age < 16) {
      return NextResponse.json(
        { message: '年龄必须为 16 岁或以上' },
        { status: 400 }
      )
    }

    // 检查 Supabase 是否可用
    if (hasSupabase()) {
      try {
        const supabase = getSupabaseClient()
        
        if (!supabase) {
          throw new Error('Supabase 客户端初始化失败')
        }

        // 检查邮箱是否已存在
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('检查用户存在性时出错:', checkError)
          throw new Error('数据库查询失败')
        }

        if (existingUser) {
          return NextResponse.json(
            { message: '该邮箱已被注册' },
            { status: 409 }
          )
        }

        // 哈希密码
        const saltRounds = 12
        const hashedPassword = await bcrypt.hash(password, saltRounds)

        // 创建新用户
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
          console.error('创建用户时出错:', insertError)
          
          // 如果是表不存在的错误，降级到本地模拟
          if (insertError.code === '42P01' || insertError.message?.includes('relation "users" does not exist')) {
            console.log('🔄 users 表不存在，降级到本地模拟模式')
            return NextResponse.json({
              ok: true,
              source: 'local',
              message: '注册成功（本地模拟）'
            })
          }
          
          throw new Error('数据库插入失败')
        }

        // 返回 Supabase 成功响应（不包含密码哈希）
        return NextResponse.json({
          ok: true,
          source: 'supabase',
          message: '注册成功',
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            age: newUser.age,
            created_at: newUser.created_at
          }
        })

      } catch (dbError) {
        console.error('Supabase 操作失败，降级到本地存储:', dbError)
        
      try {
        // 使用本地存储
        const user = await localUserStorage.createUser({ email, name, age, password })
        console.log('✅ 本地存储注册成功:', user)
        return NextResponse.json({
          ok: true,
          source: 'local',
          message: '注册成功（本地存储）',
          user,
          fallback_reason: dbError.message
        })
      } catch (localError) {
          console.error('本地存储也失败:', localError)
          return NextResponse.json({
            message: localError.message || '注册失败',
            source: 'error'
          }, { status: 500 })
        }
      }
    } else {
      // Supabase 不可用，使用本地存储
      console.log('🔄 Supabase 不可用，使用本地存储模式')
      try {
        const user = await localUserStorage.createUser({ email, name, age, password })
        console.log('✅ 本地存储注册成功:', user)
        return NextResponse.json({
          ok: true,
          source: 'local',
          message: '注册成功（本地存储）',
          user
        })
      } catch (error) {
        console.error('本地存储失败:', error)
        return NextResponse.json({
          message: error.message || '注册失败',
          source: 'error'
        }, { status: 500 })
      }
    }

  } catch (error) {
    console.error('注册 API 错误:', error)
    return NextResponse.json(
      { message: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
