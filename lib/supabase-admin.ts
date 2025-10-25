/**
 * Service Role Supabase 客户端
 * 绕过 RLS，仅在服务端 API 路由使用
 * 
 * ⚠️ 安全警告:
 * - 此客户端绕过所有 RLS 策略
 * - 仅在 lib/db/* 中使用
 * - 禁止在客户端组件或页面中导入
 * - 禁止暴露 Service Role Key 到浏览器
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// 仅在服务端环境创建
let adminInstance: ReturnType<typeof createClient> | null = null

if (typeof window === 'undefined') {
  // 服务端环境
  if (supabaseUrl && supabaseServiceKey) {
    adminInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  } else {
    console.warn('⚠️ Service Role Key not configured')
  }
} else {
  // 浏览器环境：禁止使用
  console.error('❌ Service Role client should never be used in the browser')
}

export const supabaseAdmin = adminInstance

// 导出类型检查函数
export function isServiceRoleAvailable(): boolean {
  return adminInstance !== null
}