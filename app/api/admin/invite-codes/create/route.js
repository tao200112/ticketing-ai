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

    // 检查使用哪个表：优先使用 invite_codes，如果不存在则使用 admin_invite_codes
    let useNewTable = true
    let existingCode = null

    // 首先尝试检查新表
    const { data: newTableCode, error: newTableError } = await supabase
      .from('invite_codes')
      .select('id')
      .eq('code', normalizedCode)
      .maybeSingle()

    if (newTableCode) {
      existingCode = newTableCode
    } else if (newTableError && newTableError.code !== 'PGRST116') {
      // 如果表不存在，回退到旧表
      logger.info('invite_codes table not available, using admin_invite_codes', { error: newTableError })
      useNewTable = false
      
      // 检查旧表
      const { data: oldTableCode, error: oldTableError } = await supabase
        .from('admin_invite_codes')
        .select('id')
        .eq('code', normalizedCode)
        .maybeSingle()

      if (oldTableError && oldTableError.code !== 'PGRST116') {
        logger.error('Error checking invite code', { error: oldTableError, code: normalizedCode })
        throw ErrorHandler.databaseError(
          oldTableError,
          'DATABASE_ERROR',
          '检查邀请码失败'
        )
      }

      if (oldTableCode) {
        existingCode = oldTableCode
      }
    }

    if (existingCode) {
      throw ErrorHandler.conflictError(
        'INVITE_CODE_EXISTS',
        '邀请码已存在'
      )
    }

    // 创建邀请码
    let newInviteCode = null
    let createError = null

    if (useNewTable) {
      // 使用新表
      const { data, error } = await supabase
        .from('invite_codes')
        .insert([{
          code: normalizedCode,
          type: type,
          used: false,
          created_by: adminUser.id
        }])
        .select('id, code, type, used, created_at')
        .single()

      newInviteCode = data
      createError = error
    } else {
      // 使用旧表（向后兼容）
      const { data, error } = await supabase
        .from('admin_invite_codes')
        .insert([{
          code: normalizedCode,
          max_events: 10,
          is_active: true,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1年后过期
          created_by: 'admin'
        }])
        .select('id, code, max_events, is_active, created_at')
        .single()

      newInviteCode = data ? {
        id: data.id,
        code: data.code,
        type: type,
        used: false,
        created_at: data.created_at
      } : null
      createError = error
    }

    if (createError) {
      logger.error('Error creating invite code', { error: createError, code: normalizedCode, useNewTable })
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

