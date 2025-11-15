/**
 * 商家 JWT 工具函数
 * 
 * 完全独立于 Supabase Auth 的商家认证系统
 * 使用 JWT token 存储在 httpOnly cookie 中
 */

import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const MERCHANT_JWT_SECRET = process.env.NEXT_PUBLIC_PARTYTIX_MERCHANT_SECRET || process.env.MERCHANT_JWT_SECRET

if (!MERCHANT_JWT_SECRET) {
  console.warn('⚠️ MERCHANT_JWT_SECRET not configured - merchant authentication will fail')
}

/**
 * 生成商家 JWT token
 * @param {Object} merchant - 商家信息
 * @param {string} merchant.id - 商家 ID
 * @param {string} merchant.email - 商家邮箱
 * @param {string} merchant.name - 商家名称
 * @returns {string} JWT token
 */
export function generateMerchantToken(merchant) {
  if (!MERCHANT_JWT_SECRET) {
    throw new Error('MERCHANT_JWT_SECRET is not configured')
  }

  const payload = {
    id: merchant.id,
    email: merchant.email,
    name: merchant.name,
    type: 'merchant',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  }

  return jwt.sign(payload, MERCHANT_JWT_SECRET)
}

/**
 * 验证商家 JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} 解码后的 payload 或 null（如果无效）
 */
export function verifyMerchantToken(token) {
  if (!MERCHANT_JWT_SECRET) {
    return null
  }

  try {
    const decoded = jwt.verify(token, MERCHANT_JWT_SECRET)
    
    // 验证 token 类型
    if (decoded.type !== 'merchant') {
      return null
    }

    return decoded
  } catch (error) {
    return null
  }
}

/**
 * 从请求中获取商家 token（从 cookie）
 * @param {Request} request - Next.js 请求对象
 * @returns {string|null} token 或 null
 */
export function getMerchantTokenFromRequest(request) {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) {
    return null
  }

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=')
    acc[key] = value
    return acc
  }, {})

  return cookies['ptx_merchant_token'] || null
}

/**
 * 从 cookie 中获取商家 token（服务端）
 * @returns {Promise<string|null>} token 或 null
 */
export async function getMerchantTokenFromCookie() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('ptx_merchant_token')
    return token?.value || null
  } catch (error) {
    return null
  }
}

/**
 * 设置商家 token cookie
 * @param {Response} response - Next.js 响应对象
 * @param {string} token - JWT token
 */
export function setMerchantTokenCookie(response, token) {
  response.cookies.set('ptx_merchant_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/'
  })
}

/**
 * 清除商家 token cookie
 * @param {Response} response - Next.js 响应对象
 */
export function clearMerchantTokenCookie(response) {
  response.cookies.set('ptx_merchant_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/'
  })
}

/**
 * 验证商家认证状态（从请求中）
 * @param {Request} request - Next.js 请求对象
 * @returns {Object|null} 商家信息或 null
 */
export function verifyMerchantAuth(request) {
  const token = getMerchantTokenFromRequest(request)
  if (!token) {
    return null
  }

  return verifyMerchantToken(token)
}

