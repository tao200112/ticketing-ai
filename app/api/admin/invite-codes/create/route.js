/**
 * 创建邀请码 API（管理员专用）
 * 
 * 需要管理员权限
 */

import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import { getSupabaseUser } from '@/lib/supabase/server'

const logger = createLogger('admin-invite-codes-create-api')

/**
 * 检查用户是否为管理员
 */
async function checkAdminAuth() {
  const user = await getSupabaseUser()
  
  if (!user) {
    throw ErrorHandler.authenticationError(
      'AUTHENTICATION_REQUIRED',
      '请先登录'
    )
  }

  // 检查用户是否为管理员
  // 这里假设管理员在 users 表中的 role 为 'admin'
  const supabase = createSupabaseClient()
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userError || !userData || userData.role !== 'admin') {
    throw ErrorHandler.authorizationError(
      'ADMIN_REQUIRED',
      '需要管理员权限'
    )
  }

  return user
}

export async function POST(request) {
  try {
    // 验证管理员权限
    await checkAdminAuth()

    const body = await request.json()
    const { code, type = 'merchant' } = body

    // 验证必需字段
    if (!code) {
      throw ErrorHandler.validationError(
        'MISSING_FIELDS',
        '邀请码是必需的'
      )
    }

    // 验证类型
    if (!['merchant', 'user', 'admin'].includes(type)) {
      throw ErrorHandler.validationError(
        'INVALID_TYPE',
        '邀请码类型必须是 merchant、user 或 admin'
      )
    }

    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase 未配置'
      )
    }

    const supabase = createSupabaseClient()
    const adminUser = await getSupabaseUser()

    // 规范化邀请码
    const normalizedCode = code.trim().toUpperCase()

    // 检查邀请码是否已存在
    const { data: existingCode, error: checkError } = await supabase
      .from('invite_codes')
      .select('id')
      .eq('code', normalizedCode)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      logger.error('Error checking invite code', { error: checkError, code: normalizedCode })
      throw ErrorHandler.databaseError(
        checkError,
        'DATABASE_ERROR',
        '检查邀请码失败'
      )
    }

    if (existingCode) {
      throw ErrorHandler.conflictError(
        'INVITE_CODE_EXISTS',
        '邀请码已存在'
      )
    }

    // 创建邀请码
    const { data: newInviteCode, error: createError } = await supabase
      .from('invite_codes')
      .insert([{
        code: normalizedCode,
        type: type,
        used: false,
        created_by: adminUser.id
      }])
      .select('id, code, type, used, created_at')
      .single()

    if (createError) {
      logger.error('Error creating invite code', { error: createError, code: normalizedCode })
      throw ErrorHandler.fromSupabaseError(createError, 'INVITE_CODE_CREATION_FAILED')
    }

    logger.success('Invite code created successfully', { 
      inviteCodeId: newInviteCode.id, 
      code: normalizedCode,
      type: type
    })

    return NextResponse.json({
      success: true,
      message: '邀请码创建成功',
      inviteCode: newInviteCode
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

