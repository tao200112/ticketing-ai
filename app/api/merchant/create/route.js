import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import { getSupabaseUser } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

const logger = createLogger('merchant-create-api')

export async function POST(request) {
  try {
    const body = await request.json()
    const { businessName, phone, inviteCode, email, password, name, age } = body

    // Try to get authenticated user identity (optional - merchant creation can work without auth)
    const user = await getSupabaseUser()
    const authUserId = user?.id || null

    logger.info('Received merchant registration request', { 
      businessName, 
      inviteCode, 
      hasAuth: !!authUserId 
    })

    // 验证必需字段
    if (!businessName || !inviteCode) {
      throw ErrorHandler.validationError(
        'MISSING_FIELDS',
        'Business name and invite code are required'
      )
    }

    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase is not configured'
      )
    }

    const supabase = createSupabaseClient()

    // 验证邀请码（必须是活跃且未使用的）
    // 使用 maybeSingle() 避免 406 错误
    const { data: inviteCodeData, error: inviteError } = await supabase
      .from('admin_invite_codes')
      .select('*')
      .eq('code', inviteCode.trim().toUpperCase())
      .maybeSingle()

    if (inviteError && inviteError.code !== 'PGRST116') {
      logger.error('Error checking invite code', { error: inviteError, code: inviteCode })
      throw ErrorHandler.databaseError(
        inviteError,
        'INVITE_CODE_CHECK_FAILED',
        'Failed to verify invite code'
      )
    }

    if (!inviteCodeData) {
      throw ErrorHandler.validationError(
        'INVALID_INVITE_CODE',
        '邀请码无效，请检查是否正确'
      )
    }

    // 检查邀请码是否已被使用
    if (inviteCodeData.used_by) {
      throw ErrorHandler.validationError(
        'INVITE_CODE_ALREADY_USED',
        '邀请码已被使用，请联系管理员获取新的邀请码'
      )
    }

    // 检查邀请码是否过期
    if (new Date(inviteCodeData.expires_at) < new Date()) {
      throw ErrorHandler.validationError(
        'INVITE_CODE_EXPIRED',
        '邀请码已过期，请联系管理员获取新的邀请码'
      )
    }

    // 检查邀请码是否活跃
    if (!inviteCodeData.is_active) {
      throw ErrorHandler.validationError(
        'INVITE_CODE_INACTIVE',
        '邀请码已失效，请联系管理员获取新的邀请码'
      )
    }

    // 验证邮箱格式（如果提供了邮箱）
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        throw ErrorHandler.validationError(
          'INVALID_EMAIL',
          '邮箱格式不正确，请检查后重试'
        )
      }
    }

    let userRecord = null
    let finalAuthUserId = authUserId || null

    // 如果提供了用户信息，尝试创建或查找用户（可选）
    // merchants 表现在可以独立存在，不强制依赖 users 表
    // 如果已登录，优先使用登录用户的身份
    if (!finalAuthUserId && email && password && name && age) {
      // 检查邮箱是否已在 users 表中存在
      const { data: existingUser, error: existingUserError } = await supabase
        .from('users')
        .select('id, role, email, name')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle()

      // 如果查询出错（非"不存在"的错误），抛出错误
      if (existingUserError && existingUserError.code !== 'PGRST116') {
        throw ErrorHandler.fromSupabaseError(existingUserError, 'USER_CHECK_FAILED')
      }

      if (existingUser) {
        // 如果用户已存在，使用现有用户（不强制要求是 merchant 角色）
        // 允许普通用户同时拥有商家账户
        userRecord = existingUser
        finalAuthUserId = existingUser.id
        logger.info('Using existing user for merchant registration', { userId: finalAuthUserId })
      } else {
        // 用户不存在，创建新用户（可选，用于关联）
        // 验证密码长度
        if (password.length < 8) {
          throw ErrorHandler.validationError(
            'PASSWORD_TOO_SHORT',
            '密码长度至少为 8 个字符'
          )
        }

        // 验证年龄（数据库约束要求 age >= 16）
        const ageInt = parseInt(age)
        if (isNaN(ageInt) || ageInt < 16) {
          throw ErrorHandler.validationError(
            'INVALID_AGE',
            '年龄必须至少为 16 岁'
          )
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 12)

        // 创建用户（用于关联，但 merchants 表不强制依赖）
        // 注意：不显式传递 id，让数据库自动生成 UUID
        const userInsertData = {
          email: email.trim().toLowerCase(),
          name: name.trim(),
          age: ageInt,
          password_hash: hashedPassword,
          role: 'merchant', // 设置为 merchant 角色
          is_active: true
        }
        
        // 确保不传递 id 字段，让数据库使用默认值生成
        logger.info('创建商家用户', {
          email: userInsertData.email,
          name: userInsertData.name,
          age: userInsertData.age,
          hasPasswordHash: !!userInsertData.password_hash,
          passwordHashLength: userInsertData.password_hash?.length
        })
        
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert([userInsertData])
          .select()
          .single()

        if (userError) {
          logger.error('User creation failed', {
            error: userError,
            email: email.trim().toLowerCase(),
            age: ageInt
          })
          
          // 检查是否是约束违反错误
          if (userError.code === '23505') { // 唯一约束违反
            throw ErrorHandler.conflictError(
              'EMAIL_EXISTS',
              '该邮箱已在用户系统中注册，将使用现有账户关联商家'
            )
          }
          
          if (userError.code === '23514') { // 检查约束违反
            if (userError.message?.includes('age')) {
              throw ErrorHandler.validationError(
                'INVALID_AGE',
                '年龄必须至少为 16 岁'
              )
            }
            if (userError.message?.includes('role')) {
              throw ErrorHandler.validationError(
                'INVALID_ROLE',
                '无效的角色设置'
              )
            }
          }
          
          // 如果创建用户失败，仍然可以创建 merchant（独立表）
          logger.warn('User creation failed, but will continue with merchant creation', { error: userError })
        } else {
          userRecord = newUser
          finalAuthUserId = newUser.id
        }
      }
    }

    // 检查邮箱是否已注册为商家（通过 contact_email 检查，不依赖 users 表）
    // 使用 maybeSingle() 避免 406 错误
    const normalizedEmail = email ? email.trim().toLowerCase() : null
    let existingMerchant = null
    
    if (normalizedEmail) {
      const { data: merchantByEmail, error: merchantEmailError } = await supabase
        .from('merchants')
        .select('*')
        .eq('contact_email', normalizedEmail)
        .maybeSingle()

      if (merchantEmailError && merchantEmailError.code !== 'PGRST116') {
        throw ErrorHandler.fromSupabaseError(merchantEmailError, 'MERCHANT_CHECK_FAILED')
      }

      if (merchantByEmail) {
        existingMerchant = merchantByEmail
      }
    }

    // 如果已登录，也检查该用户是否已有商家账户
    if (finalAuthUserId && !existingMerchant) {
      // 优先检查 owner_supabase_uid（新字段）
      const { data: merchantByAuthId, error: merchantAuthIdError } = await supabase
        .from('merchants')
        .select('*')
        .eq('owner_supabase_uid', finalAuthUserId)
        .maybeSingle()

      if (merchantAuthIdError && merchantAuthIdError.code !== 'PGRST116') {
        throw ErrorHandler.fromSupabaseError(merchantAuthIdError, 'MERCHANT_CHECK_FAILED')
      }

      if (merchantByAuthId) {
        existingMerchant = merchantByAuthId
      } else {
        // 回退：检查 owner_user_id（向后兼容）
        const { data: merchantByUserId, error: merchantUserIdError } = await supabase
          .from('merchants')
          .select('*')
          .eq('owner_user_id', finalAuthUserId)
          .maybeSingle()

        if (merchantUserIdError && merchantUserIdError.code !== 'PGRST116') {
          throw ErrorHandler.fromSupabaseError(merchantUserIdError, 'MERCHANT_CHECK_FAILED')
        }

        if (merchantByUserId) {
          existingMerchant = merchantByUserId
        }
      }
    }

    if (existingMerchant) {
      throw ErrorHandler.conflictError(
        'MERCHANT_EXISTS',
        '该邮箱或账户已经注册为商家，请直接登录'
      )
    }

    // 创建商家记录
    // merchants 表现在可以独立存在，owner_supabase_uid 是可选的
    const merchantData = {
      name: businessName.trim(),
      contact_email: normalizedEmail || email?.trim().toLowerCase() || null,
      contact_phone: phone ? phone.trim() : null,
      verified: false,
      status: 'active'
    }

    // 如果有关联的用户，添加 owner_supabase_uid（优先）
    if (finalAuthUserId) {
      merchantData.owner_supabase_uid = finalAuthUserId
    }

    const { data: newMerchant, error: merchantError } = await supabase
      .from('merchants')
      .insert([merchantData])
      .select()
      .single()

    if (merchantError) {
      throw ErrorHandler.fromSupabaseError(merchantError, 'MERCHANT_CREATION_FAILED')
    }

    // 标记邀请码为已使用（一次性使用，设置is_active为false）
    // 注意：admin_invite_codes 表不包含 used_at 字段
    // 如果有关联的用户，记录 used_by，否则只标记为不活跃
    const inviteUpdateData = {
      is_active: false // 标记为不活跃，防止再次使用
    }
    
    // 如果有关联的用户，记录 used_by
    if (finalAuthUserId) {
      inviteUpdateData.used_by = finalAuthUserId
    }

    const { error: updateInviteError } = await supabase
      .from('admin_invite_codes')
      .update(inviteUpdateData)
      .eq('id', inviteCodeData.id)

    if (updateInviteError) {
      logger.warn('Failed to update invite code', { error: updateInviteError })
      // 非阻塞性错误，商家已创建成功
    }

    logger.success('Merchant created successfully', { merchantId: newMerchant.id, authUserId: finalAuthUserId || 'none' })

    // 准备返回数据
    const responseData = {
      ok: true,
      success: true,
      merchant: newMerchant
    }

    // 如果创建了用户，返回用户信息（但不包含密码哈希）
    if (userRecord) {
      const userResponse = { ...userRecord }
      delete userResponse.password_hash
      responseData.user = userResponse
    }

    return NextResponse.json(responseData)

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}






