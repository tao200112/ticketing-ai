/**
 * 列出邀请码 API（管理员专用）
 * 
 * 需要管理员权限
 */

import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import { getSupabaseUser } from '@/lib/supabase/server'

const logger = createLogger('admin-invite-codes-list-api')

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

export async function GET(request) {
  try {
    // 验证管理员权限
    await checkAdminAuth()

    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase 未配置'
      )
    }

    const supabase = createSupabaseClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 可选：merchant, user, admin
    const used = searchParams.get('used') // 可选：true, false

    // 构建查询
    let query = supabase
      .from('invite_codes')
      .select('id, code, type, used, used_at, created_at, created_by')
      .order('created_at', { ascending: false })

    // 应用过滤器
    if (type) {
      query = query.eq('type', type)
    }

    if (used !== null) {
      query = query.eq('used', used === 'true')
    }

    const { data: inviteCodes, error: listError } = await query

    if (listError) {
      logger.error('Error listing invite codes', { error: listError })
      throw ErrorHandler.databaseError(
        listError,
        'DATABASE_ERROR',
        '获取邀请码列表失败'
      )
    }

    return NextResponse.json({
      success: true,
      inviteCodes: inviteCodes || [],
      count: inviteCodes?.length || 0
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

