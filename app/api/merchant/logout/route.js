/**
 * 商家登出 API
 * 
 * 清除商家认证 cookie
 */

import { NextResponse } from 'next/server'
import { clearMerchantTokenCookie } from '@/lib/auth/merchant-jwt'

export async function POST(request) {
  const response = NextResponse.json({
    success: true,
    message: '登出成功'
  })

  clearMerchantTokenCookie(response)

  return response
}

