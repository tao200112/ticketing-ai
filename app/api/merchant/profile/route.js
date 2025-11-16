/**
 * 商家个人信息 API（受保护）
 * 
 * 基于 Supabase Auth 会话 + merchants 表
 */

import { NextResponse } from 'next/server'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const logger = createLogger('merchant-profile-api')

export async function GET(request) {
  try {
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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      logger.warn('Merchant profile: user not authenticated', { error: userError })
      throw ErrorHandler.authenticationError(
        'AUTHENTICATION_REQUIRED',
        '请先登录'
      )
    }

    if (!user.email && !user.id) {
      throw ErrorHandler.authenticationError(
        'AUTHENTICATION_REQUIRED',
        '用户信息不完整，请重新登录'
      )
    }

    const authUserId = user.id
    const normalizedEmail = user.email?.toLowerCase()

    // 优先通过 owner_supabase_uid 查找商家（这是最可靠的方式）
    let merchant = null
    let merchantError = null

    // 首先尝试通过 owner_supabase_uid 查找
    const { data: merchantByUid, error: errorByUid } = await supabase
      .from('merchants')
      .select('id, email, name, verified, status, created_at, owner_supabase_uid')
      .eq('owner_supabase_uid', authUserId)
      .maybeSingle()

    if (merchantByUid) {
      merchant = merchantByUid
      logger.info('Found merchant by owner_supabase_uid', { 
        merchantId: merchant.id, 
        authUserId 
      })
    } else if (errorByUid && errorByUid.code !== 'PGRST116') {
      // 查询出错（不是"未找到"的错误）
      merchantError = errorByUid
      logger.error('Error fetching merchant by owner_supabase_uid', { 
        error: errorByUid, 
        authUserId 
      })
    } else if (normalizedEmail) {
      // 如果通过 owner_supabase_uid 没找到，尝试通过邮箱查找（向后兼容）
      logger.info('Merchant not found by owner_supabase_uid, trying email', { 
        email: normalizedEmail 
      })
      
      const { data: merchantByEmail, error: errorByEmail } = await supabase
        .from('merchants')
        .select('id, email, name, verified, status, created_at, owner_supabase_uid')
        .eq('email', normalizedEmail)
        .maybeSingle()

      if (merchantByEmail) {
        merchant = merchantByEmail
        logger.info('Found merchant by email', { 
          merchantId: merchant.id, 
          email: normalizedEmail 
        })
        
        // 如果找到了商家但没有设置 owner_supabase_uid，尝试更新它
        if (!merchant.owner_supabase_uid && authUserId) {
          logger.info('Updating merchant owner_supabase_uid', { 
            merchantId: merchant.id, 
            authUserId 
          })
          
          // 使用 Service Role 更新（如果需要）
          const { error: updateError } = await supabase
            .from('merchants')
            .update({ owner_supabase_uid: authUserId })
            .eq('id', merchant.id)
          
          if (updateError) {
            logger.warn('Failed to update owner_supabase_uid', { 
              error: updateError, 
              merchantId: merchant.id 
            })
          } else {
            merchant.owner_supabase_uid = authUserId
            logger.info('Successfully updated owner_supabase_uid', { 
              merchantId: merchant.id 
            })
          }
        }
      } else if (errorByEmail && errorByEmail.code !== 'PGRST116') {
        merchantError = errorByEmail
        logger.error('Error fetching merchant by email', { 
          error: errorByEmail, 
          email: normalizedEmail 
        })
      }
    }

    if (merchantError) {
      throw ErrorHandler.databaseError(
        merchantError,
        'DATABASE_ERROR',
        '获取商家信息失败'
      )
    }

    if (!merchant) {
      logger.warn('Merchant not found', { 
        authUserId, 
        email: normalizedEmail 
      })
      throw ErrorHandler.notFoundError(
        'MERCHANT_NOT_FOUND',
        '商家不存在，请先注册商家账户'
      )
    }

    return NextResponse.json({
      success: true,
      merchant
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

