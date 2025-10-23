import { NextResponse } from 'next/server'
import { getSupabaseClient } from '../../../../lib/supabase'
import { hasSupabase } from '../../../../lib/safeEnv'

export async function POST(request) {
  try {
    const { email, name, age } = await request.json()

    // 基本验证
    if (!email || !name || !age) {
      return NextResponse.json(
        { message: '缺少必填字段' },
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

        // 创建新用户
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([
            {
              email: email,
              name: name,
              age: parseInt(age),
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

        // 返回 Supabase 成功响应
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
        console.error('Supabase 操作失败，降级到本地模拟:', dbError)
        
        // 任何 Supabase 错误都降级到本地模拟
        return NextResponse.json({
          ok: true,
          source: 'local',
          message: '注册成功（本地模拟）',
          fallback_reason: dbError.message
        })
      }
    } else {
      // Supabase 不可用，直接使用本地模拟
      console.log('🔄 Supabase 不可用，使用本地模拟模式')
      return NextResponse.json({
        ok: true,
        source: 'local',
        message: '注册成功（本地模拟）'
      })
    }

  } catch (error) {
    console.error('注册 API 错误:', error)
    return NextResponse.json(
      { message: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
