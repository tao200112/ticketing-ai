import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'

// 从工厂变量获取 Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const logger = createLogger('register-api')

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password, name, age } = body

    // 验证必需字段
    if (!email || !password || !name) {
      throw ErrorHandler.validationError(
        'MISSING_FIELDS',
        'Please fill in all required fields (email, password, name)'
      )
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw ErrorHandler.validationError('INVALID_EMAIL')
    }

    // 验证密码长度
    if (password.length < 8) {
      throw ErrorHandler.validationError('PASSWORD_TOO_SHORT')
    }

    if (password.length > 128) {
      throw ErrorHandler.validationError('PASSWORD_TOO_LONG')
    }

    // 验证年龄（如果提供）
    if (age !== undefined && age !== null) {
      const ageNum = parseInt(age)
      if (isNaN(ageNum) || ageNum < 16 || ageNum > 150) {
        throw ErrorHandler.validationError('INVALID_AGE')
      }
    }

    // If Supabase is not configured, return configuration error
    if (!supabaseUrl || !supabaseKey) {
      throw ErrorHandler.configurationError('CONFIG_ERROR', 'Supabase is not configured, registration is not available')
    }

    // 使用 Supabase 注册
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 检查用户是否已存在
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    // 处理检查错误
    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 表示未找到记录，这是正常的（用户不存在）
      // 其他错误需要处理
      throw ErrorHandler.fromSupabaseError(checkError, 'DATABASE_QUERY_ERROR')
    }

    // 如果用户已存在，返回冲突错误
    if (existingUser) {
      throw ErrorHandler.conflictError('EMAIL_EXISTS')
    }

    // 加密密码
    let hashedPassword
    try {
      hashedPassword = await bcrypt.hash(password, 12)
    } catch (hashError) {
      logger.error('Password hashing failed', hashError)
      throw ErrorHandler.internalError(hashError, 'Password hashing failed, please try again later')
    }

    // 创建用户（未验证状态）
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          email,
          password_hash: hashedPassword,
          name,
          age: age ? parseInt(age) : null,
          role: 'user',
          email_verified_at: null  // 明确设置为未验证
        }
      ])
      .select()
      .single()

    // 处理插入错误
    if (insertError) {
      // 如果是唯一约束违反（邮箱已存在），返回冲突错误
      if (insertError.code === '23505') {
        throw ErrorHandler.conflictError('EMAIL_EXISTS')
      }
      // 其他数据库错误
      throw ErrorHandler.fromSupabaseError(insertError, 'REGISTRATION_FAILED')
    }

    // 生成邮箱验证令牌（可选，不阻止注册）
    try {
      const verificationToken = await supabase.rpc('send_verification_email', {
        p_user_id: newUser.id,
        p_email: newUser.email
      })

      if (verificationToken.error) {
        logger.warn('生成验证令牌失败', { error: verificationToken.error })
        // 不阻止注册，但记录警告
      }

      // 发送验证邮件（可选，不阻止注册）
      try {
        const emailService = (await import('../../../../lib/email-service.js')).default
        await emailService.sendVerificationEmail(
          newUser.email,
          newUser.name,
          verificationToken.data
        )
      } catch (emailError) {
        logger.warn('发送验证邮件失败', { error: emailError })
        // 不阻止注册，但记录警告
      }
    } catch (verificationError) {
      logger.warn('验证流程失败', { error: verificationError })
      // 不阻止注册
    }

    // 移除敏感信息
    const { password_hash, ...safeUser } = newUser

    logger.success('用户注册成功', { userId: newUser.id, email: newUser.email })

    return NextResponse.json({
      success: true,
      message: '注册成功！请检查您的邮箱并验证账户才能正常使用',
      data: {
        ...safeUser,
        emailVerified: false,
        needsVerification: true,
        requiresEmailVerification: true
      },
      requiresEmailVerification: true
    })

  } catch (error) {
    // 使用统一的错误处理
    return await handleApiError(error, request, logger)
  }
}
