import { NextResponse } from 'next/server'
import { getSupabaseClient } from '../../../../lib/supabase'

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
    const supabase = getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json(
        { message: '数据库服务暂不可用，请稍后重试' },
        { status: 503 }
      )
    }

    // 检查邮箱是否已存在
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('检查用户存在性时出错:', checkError)
      return NextResponse.json(
        { message: '服务器错误，请稍后重试' },
        { status: 500 }
      )
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
      return NextResponse.json(
        { message: '注册失败，请稍后重试' },
        { status: 500 }
      )
    }

    // 返回成功响应（不包含敏感信息）
    return NextResponse.json({
      message: '注册成功',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        age: newUser.age,
        created_at: newUser.created_at
      }
    })

  } catch (error) {
    console.error('注册 API 错误:', error)
    return NextResponse.json(
      { message: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
