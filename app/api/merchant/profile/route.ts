'use server'

import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { ErrorHandler } from '@/lib/error-handler'
import { getSupabaseServer } from '@/lib/supabase-server'

const logger = createLogger('merchant-profile-api')

export async function GET() {
  try {
    const supabase = getSupabaseServer()
    if (!supabase) {
      throw ErrorHandler.configurationError('CONFIG_ERROR', 'Supabase 未配置')
    }

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) {
      logger.warn('Failed to get user from session', { error: userError })
    }

    const user = userData?.user
    if (!user?.email) {
      logger.warn('Unauthenticated request to merchant profile')
      return NextResponse.json(
        { success: false, error: 'UNAUTHENTICATED', message: '未登录' },
        { status: 401 }
      )
    }

    const normalizedEmail = user.email.toLowerCase()

    const { data: merchant, error } = await supabase
      .from('merchants')
      .select(`
        id, name, email, contact_phone, status, verified, max_events, created_at, updated_at
      `)
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (error) {
      logger.error('Query merchant failed', { error })
      const handled = await ErrorHandler.handleError(error, logger)
      return NextResponse.json(
        { success: false, error: handled.response.error, message: handled.response.message },
        { status: handled.statusCode }
      )
    }

    if (!merchant) {
      logger.warn('商家不存在', { email: normalizedEmail })
      return NextResponse.json(
        { success: false, error: 'MERCHANT_NOT_FOUND', message: '商家不存在' },
        { status: 404 }
      )
    }

    if (merchant.status && merchant.status !== 'active') {
      logger.warn('Merchant not active', { id: merchant.id, status: merchant.status })
      return NextResponse.json(
        { success: false, error: 'MERCHANT_INACTIVE', message: '商家未激活' },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true, merchant })
  } catch (error: any) {
    const handled = await ErrorHandler.handleError(error, logger)
    return NextResponse.json(handled.response, { status: handled.statusCode })
  }
}

