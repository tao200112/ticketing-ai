import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

// 从环境变量获取 Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password, name, age } = body

    // 验证必需字段
    if (!email || !password || !name) {
      return NextResponse.json(
        {
          success: false,
          error: 'MISSING_FIELDS',
          message: '缺少必需字段'
        },
        { status: 400 }
      )
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_EMAIL',
          message: '无效的邮箱格式'
        },
        { status: 400 }
      )
    }

    // 验证密码长度
    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: 'PASSWORD_TOO_SHORT',
          message: '密码长度至少6个字符'
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
          message: '系统未配置 Supabase，无法注册'
        },
        { status: 500 }
      )
    }

    // 使用 Supabase 注册
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 检查用户是否已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'EMAIL_EXISTS',
          message: '该邮箱已被注册'
        },
        { status: 400 }
      )
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 创建用户（未验证状态）
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          password_hash: hashedPassword,
          name,
          age: age || null,
          role: 'user',
          email_verified_at: null  // 明确设置为未验证
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('❌ 注册失败:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'REGISTRATION_FAILED',
          message: '注册失败'
        },
        { status: 500 }
      )
    }

    // 生成邮箱验证令牌
    const verificationToken = await supabase.rpc('send_verification_email', {
      p_user_id: newUser.id,
      p_email: newUser.email
    });

    if (verificationToken.error) {
      console.error('❌ 生成验证令牌失败:', verificationToken.error);
      // 不阻止注册，但记录错误
    }

    // 发送验证邮件
    try {
      const emailService = (await import('../../../../lib/email-service.js')).default;
      await emailService.sendVerificationEmail(
        newUser.email, 
        newUser.name, 
        verificationToken.data
      );
    } catch (emailError) {
      console.error('❌ 发送验证邮件失败:', emailError);
      // 不阻止注册，但记录错误
    }

    // 移除密码字段
    delete newUser.password_hash

    return NextResponse.json({
      success: true,
      message: '注册成功！请检查您的邮箱并验证账户才能正常使用',
      data: {
        ...newUser,
        emailVerified: false,
        needsVerification: true,
        requiresEmailVerification: true
      },
      requiresEmailVerification: true
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
