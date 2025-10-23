import { NextResponse } from 'next/server'
import { getSupabaseClient } from '../../../../lib/supabase'
import { hasSupabase } from '../../../../lib/safeEnv'
import bcrypt from 'bcryptjs'
import localUserStorage from '../../../../lib/user-storage'

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    // 基本验证
    if (!email || !password) {
      return NextResponse.json(
        { message: '请输入邮箱和密码' },
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

        // 查找用户
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single()

        if (userError) {
          if (userError.code === 'PGRST116') {
            return NextResponse.json(
              { message: '用户不存在' },
              { status: 404 }
            )
          }
          throw new Error('数据库查询失败')
        }

        // 验证密码
        const isValidPassword = await bcrypt.compare(password, user.password_hash)
        if (!isValidPassword) {
          return NextResponse.json(
            { message: '密码错误' },
            { status: 401 }
          )
        }

        // 返回用户数据（不包含密码哈希）
        return NextResponse.json({
          ok: true,
          source: 'supabase',
          message: '登录成功',
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            age: user.age,
            created_at: user.created_at
          }
        })

      } catch (dbError) {
        console.error('Supabase 登录失败，降级到本地存储:', dbError)
        
        try {
          // 使用本地存储
          console.log('🔍 尝试本地存储登录，邮箱:', email)
          const user = await localUserStorage.authenticateUser(email, password)
          console.log('✅ 本地存储登录成功:', user)
          return NextResponse.json({
            ok: true,
            source: 'local',
            message: '登录成功（本地存储）',
            user,
            fallback_reason: dbError.message
          })
        } catch (localError) {
          console.error('本地存储登录也失败:', localError)
          return NextResponse.json({
            message: localError.message || '登录失败',
            source: 'error'
          }, { status: 401 })
        }
      }
    } else {
      // Supabase 不可用，使用本地存储
      console.log('🔄 Supabase 不可用，使用本地存储模式')
      try {
        console.log('🔍 尝试本地存储登录，邮箱:', email)
        const user = await localUserStorage.authenticateUser(email, password)
        console.log('✅ 本地存储登录成功:', user)
        return NextResponse.json({
          ok: true,
          source: 'local',
          message: '登录成功（本地存储）',
          user
        })
      } catch (error) {
        console.error('本地存储登录失败:', error)
        return NextResponse.json({
          message: error.message || '登录失败',
          source: 'error'
        }, { status: 401 })
      }
    }

  } catch (error) {
    console.error('登录 API 错误:', error)
    return NextResponse.json(
      { message: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
