/**
 * 商家注册 API（基于 Supabase Auth）
 * 
 * 使用 Supabase Auth 创建用户账户，然后在 merchants 表中插入记录
 */

import { NextResponse } from 'next/server'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const logger = createLogger('merchant-register-api')

// 使用 Service Role 进行受 RLS 保护的数据写入（仅服务端）
function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    throw ErrorHandler.configurationError('CONFIG_ERROR', 'Supabase Service Role Key 未配置')
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password, inviteCode, name } = body

    // 验证必需字段
    if (!email || !password || !inviteCode || !name) {
      throw ErrorHandler.validationError(
        'MISSING_FIELDS',
        '邮箱、密码、邀请码和商家名称都是必需的'
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      throw ErrorHandler.configurationError('CONFIG_ERROR', 'Supabase 未配置')
    }

    const cookieStore = cookies()
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    })

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const normalizedEmail = email.trim().toLowerCase()
    
    if (!emailRegex.test(normalizedEmail)) {
      throw ErrorHandler.validationError(
        'INVALID_EMAIL',
        '邮箱格式不正确'
      )
    }

    // 验证密码长度
    if (password.length < 8) {
      throw ErrorHandler.validationError(
        'PASSWORD_TOO_SHORT',
        '密码长度至少为 8 个字符'
      )
    }

    // 1. 验证邀请码
    // 支持两种表：invite_codes（新表）和 admin_invite_codes（旧表，向后兼容）
    const normalizedInviteCode = inviteCode.trim().toUpperCase()
    let inviteCodeData = null
    let inviteTableName = null

    // 首先尝试查询 admin_invite_codes 表（当前使用的表）
    // 因为 invite_codes 表可能还不存在（迁移未运行）
    const { data: oldInviteCode, error: oldInviteError } = await supabase
      .from('admin_invite_codes')
      .select('*')
      .eq('code', normalizedInviteCode)
      .maybeSingle()

    if (oldInviteCode) {
      // 找到邀请码，使用旧表
      inviteCodeData = oldInviteCode
      inviteTableName = 'admin_invite_codes'
      logger.info('Found invite code in admin_invite_codes', { code: normalizedInviteCode })
    } else if (oldInviteError && oldInviteError.code !== 'PGRST116') {
      // 查询出错（不是"未找到"的错误）
      logger.error('Error checking invite code in admin_invite_codes', { 
        error: oldInviteError, 
        code: normalizedInviteCode,
        errorCode: oldInviteError.code,
        errorMessage: oldInviteError.message
      })
      
      // 尝试查询新表（如果存在）
      const { data: newInviteCode, error: newInviteError } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('code', normalizedInviteCode)
        .eq('type', 'merchant')
        .maybeSingle()

      if (newInviteCode) {
        inviteCodeData = newInviteCode
        inviteTableName = 'invite_codes'
        logger.info('Found invite code in invite_codes', { code: normalizedInviteCode })
      } else if (newInviteError && newInviteError.code !== 'PGRST116') {
        // 新表查询也出错
        logger.error('Error checking invite code in both tables', { 
          oldError: oldInviteError,
          newError: newInviteError,
          code: normalizedInviteCode
        })
        throw ErrorHandler.databaseError(
          oldInviteError,
          'INVITE_CODE_CHECK_FAILED',
          '验证邀请码失败'
        )
      }
    } else {
      // 旧表未找到，尝试新表
      const { data: newInviteCode, error: newInviteError } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('code', normalizedInviteCode)
        .eq('type', 'merchant')
        .maybeSingle()

      if (newInviteCode) {
        inviteCodeData = newInviteCode
        inviteTableName = 'invite_codes'
        logger.info('Found invite code in invite_codes', { code: normalizedInviteCode })
      } else if (newInviteError && newInviteError.code !== 'PGRST116') {
        // 新表查询出错（不是"未找到"）
        logger.error('Error checking invite code in invite_codes', { 
          error: newInviteError, 
          code: normalizedInviteCode 
        })
        throw ErrorHandler.databaseError(
          newInviteError,
          'INVITE_CODE_CHECK_FAILED',
          '验证邀请码失败'
        )
      }
    }

    if (!inviteCodeData) {
      logger.warn('Invite code not found', { code: normalizedInviteCode })
      throw ErrorHandler.validationError(
        'INVALID_INVITE_CODE',
        '邀请码无效，请检查是否正确'
      )
    }

    // 检查邀请码有效性（根据 admin_invite_codes 表结构）
    // 表结构：id, code, is_active, used_by, expires_at, created_at, max_events
    // 没有 used_at 字段
    if (inviteTableName === 'admin_invite_codes') {
      // 1. 检查 is_active 必须为 true
      if (inviteCodeData.is_active !== true) {
        throw ErrorHandler.validationError(
          'INVITE_CODE_INACTIVE',
          '邀请码已失效，请联系管理员获取新的邀请码'
        )
      }

      // 2. 检查 used_by 必须为 null（未使用）
      // 注意：used_by 可能是 null、undefined 或空字符串，需要严格检查
      if (inviteCodeData.used_by !== null && inviteCodeData.used_by !== undefined && inviteCodeData.used_by !== '') {
        throw ErrorHandler.validationError(
          'INVITE_CODE_ALREADY_USED',
          '邀请码已被使用，请联系管理员获取新的邀请码'
        )
      }

      // 3. 检查 expires_at 必须大于当前时间
      if (inviteCodeData.expires_at) {
        const expiresAt = new Date(inviteCodeData.expires_at)
        const now = new Date()
        if (expiresAt < now) {
          throw ErrorHandler.validationError(
            'INVITE_CODE_EXPIRED',
            '邀请码已过期，请联系管理员获取新的邀请码'
          )
        }
      }
    } else if (inviteTableName === 'invite_codes') {
      // 新表逻辑（如果存在）
      if (inviteCodeData.used === true) {
        throw ErrorHandler.validationError(
          'INVITE_CODE_ALREADY_USED',
          '邀请码已被使用，请联系管理员获取新的邀请码'
        )
      }
    }

    // 2. 使用 Supabase Admin API 直接创建已验证的商家用户
    // 商家账号不需要邮箱验证，使用 admin.createUser 直接创建已验证用户
    // 这样可以区别于顾客用户，不影响顾客注册流程
    logger.info('Creating merchant user with Admin API (no email verification required)', {
      email: normalizedEmail
    })

    const admin = createServiceRoleClient()
    
    // 首先检查邮箱是否已存在
    const { data: { users }, error: listUsersError } = await admin.auth.admin.listUsers()
    if (listUsersError) {
      logger.error('Failed to list users to check for existing email', { error: listUsersError })
      throw ErrorHandler.databaseError(
        listUsersError,
        'USER_CHECK_FAILED',
        '无法检查邮箱是否已存在'
      )
    }

    const existingUser = users.find(u => u.email?.toLowerCase() === normalizedEmail)
    if (existingUser) {
      logger.warn('Email already exists in Supabase Auth', { 
        email: normalizedEmail,
        existingUserId: existingUser.id,
        existingUserRole: existingUser.user_metadata?.role
      })
      throw ErrorHandler.conflictError(
        'SUPABASE_USER_EXISTS',
        '该邮箱已存在用户，请直接登录或联系管理员'
      )
    }

    // 使用 admin.createUser 直接创建已验证用户
    const { data: createUserData, error: createUserError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true, // 直接创建已验证用户，无需邮箱验证
      user_metadata: {
        role: 'merchant', // 标记为商家用户
        account_type: 'merchant', // 额外标记，便于区分
        merchant_name: name.trim(), // 商家名称
        skip_email_verification: true // 标记为跳过邮箱验证
      }
    })

    if (createUserError) {
      logger.error('Failed to create merchant user with Admin API', { 
        email: normalizedEmail, 
        error: createUserError 
      })
      throw ErrorHandler.authenticationError(
        'SIGNUP_FAILED',
        createUserError.message || '注册失败，无法创建用户账户'
      )
    }

    if (!createUserData?.user) {
      logger.error('Admin createUser returned no user', { email: normalizedEmail, createUserData })
      throw ErrorHandler.authenticationError(
        'SIGNUP_FAILED',
        '注册失败，未创建用户账户'
      )
    }

    const createdUser = createUserData.user

    logger.info('Successfully created merchant user with Admin API', {
      userId: createdUser.id,
      email: createdUser.email,
      emailConfirmed: createdUser.email_confirmed_at !== null,
      emailConfirmedAt: createdUser.email_confirmed_at,
      confirmedAt: createdUser.confirmed_at,
      role: createdUser.user_metadata?.role
    })

    // 3. 使用 Service Role 操作业务表，避免 RLS 阻断
    // admin 已在上面创建，继续使用

    // 检查 merchants 表中是否已存在记录（理论上不应该）
    const { data: existingMerchant, error: merchantCheckError } = await admin
      .from('merchants')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (merchantCheckError && merchantCheckError.code !== 'PGRST116') {
      logger.error('Error checking merchant email', { error: merchantCheckError, email: normalizedEmail })
      throw ErrorHandler.databaseError(
        merchantCheckError,
        'MERCHANT_CHECK_FAILED',
        '检查商家邮箱失败'
      )
    }

    if (existingMerchant) {
      logger.warn('Merchant already exists for email after user creation', { email: normalizedEmail, merchantId: existingMerchant.id })
      throw ErrorHandler.conflictError(
        'MERCHANT_EMAIL_EXISTS',
        '该邮箱已经注册为商家，请直接登录'
      )
    }

    // 4. 在 merchants 表中创建商家记录（不再存储 password_hash）
    // 设置 owner_supabase_uid 关联 Supabase Auth 用户
    const supabaseAuthUserId = createdUser.id
    
    let merchantPayload = {
      email: normalizedEmail,
      name: name.trim(),
      verified: false,
      status: 'active'
    }
    
    // 设置 owner_supabase_uid（关联 Supabase Auth 用户的关键字段）
    // 优先使用 owner_supabase_uid，如果不存在则使用 owner_user_id（向后兼容）
    if (supabaseAuthUserId) {
      // 首先尝试设置 owner_supabase_uid
      try {
        const { error: columnCheckError } = await admin
          .from('merchants')
          .select('owner_supabase_uid')
          .limit(0)
        if (!columnCheckError) {
          merchantPayload.owner_supabase_uid = supabaseAuthUserId
          logger.info('Setting owner_supabase_uid for merchant', { 
            merchantEmail: normalizedEmail,
            authUserId: supabaseAuthUserId 
          })
        } else {
          // 如果 owner_supabase_uid 列不存在，尝试使用 owner_user_id
          const { error: userIdColumnCheckError } = await admin
            .from('merchants')
            .select('owner_user_id')
            .limit(0)
          if (!userIdColumnCheckError) {
            merchantPayload.owner_user_id = supabaseAuthUserId
            logger.info('Setting owner_user_id for merchant (fallback)', { 
              merchantEmail: normalizedEmail,
              authUserId: supabaseAuthUserId 
            })
          } else {
            logger.warn('Neither owner_supabase_uid nor owner_user_id column found, merchant will be created without user association')
          }
        }
      } catch (err) {
        logger.error('Error checking merchant table columns', { error: err })
        // 即使检查失败，也尝试直接设置（列可能仍然存在）
        merchantPayload.owner_supabase_uid = supabaseAuthUserId
        logger.info('Attempting to set owner_supabase_uid directly', { 
          merchantEmail: normalizedEmail,
          authUserId: supabaseAuthUserId 
        })
      }
    } else {
      logger.error('supabaseAuthUserId is null, cannot associate merchant with auth user', {
        email: normalizedEmail
      })
    }
    
    // 不再存储 temp_password，所有密码由 Supabase Auth 处理

    const { data: newMerchant, error: merchantError } = await admin
      .from('merchants')
      .insert([merchantPayload])
      .select('*')
      .single()

    if (merchantError) {
      logger.error('Error creating merchant', { error: merchantError, email: normalizedEmail })
      throw ErrorHandler.fromSupabaseError(merchantError, 'MERCHANT_CREATION_FAILED')
    }

    // 5. 标记邀请码为已使用
    if (inviteTableName === 'invite_codes') {
      // 新表：使用 used 和 used_at 字段
      const updatePayload = {
        used: true,
        used_at: new Date().toISOString()
      }
      
      logger.info('Updating invite code (new table) with payload', { 
        inviteCodeId: inviteCodeData.id,
        payload: updatePayload
      })
      
      const { data: updatedInvite, error: updateInviteError } = await admin
        .from('invite_codes')
        .update(updatePayload)
        // 按 code 精确更新，确保与当前查到的 code 一致
        .eq('code', normalizedInviteCode)
        .eq('used', false)
        .select()
        .maybeSingle()

      if (updateInviteError) {
        logger.warn('Failed to update invite code (new table)', { 
          error: updateInviteError,
          errorCode: updateInviteError.code,
          errorMessage: updateInviteError.message,
          errorDetails: updateInviteError.details,
          errorHint: updateInviteError.hint,
          payload: updatePayload,
          inviteCodeId: inviteCodeData.id
        })
        // 非阻塞性错误，商家已创建成功
      } else {
        logger.info('Successfully updated invite code (new table)', { 
          inviteCodeId: inviteCodeData.id,
          code: normalizedInviteCode,
          updatedData: updatedInvite
        })
      }
    } else {
      // 旧表 admin_invite_codes：根据实际表结构更新
      // 表结构：id, code, is_active, used_by, expires_at, created_at, max_events
      // 注意：表中没有 used_at 字段，只更新 used_by 和 is_active
      const updatePayload = {
        is_active: false,
        used_by: supabaseAuthUserId // 设置为 Supabase Auth 用户ID
      }
      
      logger.info('Updating invite code (admin_invite_codes) with payload', { 
        inviteCodeId: inviteCodeData.id,
        code: normalizedInviteCode,
        payload: updatePayload,
        currentInviteCodeData: {
          id: inviteCodeData.id,
          code: inviteCodeData.code,
          is_active: inviteCodeData.is_active,
          used_by: inviteCodeData.used_by,
          expires_at: inviteCodeData.expires_at
        }
      })
      
      // 使用条件更新：只更新 is_active=true 且 used_by 为 null 的记录
      // 这样可以防止并发问题
      const { data: updatedInvite, error: updateInviteError } = await admin
        .from('admin_invite_codes')
        .update(updatePayload)
        .eq('code', normalizedInviteCode)
        .eq('is_active', true)
        .is('used_by', null) // 确保 used_by 为 null（未使用）
        .select()
        .maybeSingle()

      if (updateInviteError) {
        logger.warn('Invite code update failed after merchant created', { 
          error: updateInviteError,
          errorCode: updateInviteError.code,
          errorMessage: updateInviteError.message,
          errorDetails: updateInviteError.details,
          errorHint: updateInviteError.hint,
          payload: updatePayload,
          inviteCodeId: inviteCodeData.id,
          code: normalizedInviteCode
        })
        // 非阻塞性错误，商家已创建成功，只记录警告
      } else {
        logger.info('Successfully updated invite code (admin_invite_codes)', { 
          inviteCodeId: inviteCodeData.id,
          code: normalizedInviteCode,
          updatedData: updatedInvite
        })
      }
    }

    // 6. 返回成功响应
    // 注意：自动登录由前端执行，后端只负责创建用户和商家记录
    const response = NextResponse.json({
      success: true,
      message: '商家注册成功',
      merchant: {
        id: newMerchant.id,
        email: newMerchant.email,
        name: newMerchant.name
      }
    })

    logger.success('Merchant registered successfully', { 
      merchantId: newMerchant.id, 
      email: normalizedEmail,
      authUserId: supabaseAuthUserId
    })

    return response

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

