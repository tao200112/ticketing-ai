import { getSupabaseClient } from './supabase-client'

// 兼容旧导入：提供单例 Supabase 浏览器客户端
const supabase = getSupabaseClient()

export { supabase }
