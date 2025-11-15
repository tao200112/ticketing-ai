/**
 * 统一 Supabase 客户端工具（用于 API 路由）
 * 提供统一的客户端创建和错误处理
 */

import { createClient } from '@supabase/supabase-js'
import { ErrorHandler } from './error-handler.js'
import { createLogger } from './logger.js'

const logger = createLogger('supabase-api')

/**
 * 获取 Supabase 配置
 */
export function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return { supabaseUrl, supabaseKey }
}

/**
 * 创建 Supabase 客户端（用于 API 路由）
 * ⚠️ DEPRECATED: Use getRouteHandlerSupabase() from '@/lib/auth-server' for auth operations
 * This function is kept for backward compatibility with Service Role operations
 * 
 * For authenticated operations, use getRouteHandlerSupabase() which uses SSR client
 * For admin operations requiring Service Role, use supabaseAdmin from '@/lib/supabase-admin'
 */
export function createSupabaseClient() {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig()

  if (!supabaseUrl || !supabaseKey) {
    throw ErrorHandler.configurationError(
      'CONFIG_ERROR',
      'Supabase is not configured'
    )
  }

  try {
    // ⚠️ WARNING: This creates a new client instance
    // For auth operations, use getRouteHandlerSupabase() instead
    return createClient(supabaseUrl, supabaseKey)
  } catch (error) {
    logger.error('Failed to create Supabase client', error)
    throw ErrorHandler.configurationError(
      'CONFIG_ERROR',
      'Failed to initialize Supabase client'
    )
  }
}

/**
 * 检查 Supabase 是否已配置
 */
export function isSupabaseConfigured() {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig()
  return !!(supabaseUrl && supabaseKey)
}
