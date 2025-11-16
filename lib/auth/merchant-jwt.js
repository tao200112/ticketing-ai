/**
 * 商家 JWT 工具函数
 * 
 * 完全独立于 Supabase Auth 的商家认证系统
 * 使用 JWT token 存储在 httpOnly cookie 中
 */

import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

/**
 * 获取商家 JWT 密钥（支持多个环境变量）
 * 优先级：MERCHANT_JWT_SECRET > JWT_SECRET
 */
function getMerchantJwtSecret() {
  const secret =
    process.env.MERCHANT_JWT_SECRET ||
    process.env.JWT_SECRET ||
    null

  if (!secret) {
    console.warn(
      '⚠️ MERCHANT JWT SECRET missing. Expected MERCHANT_JWT_SECRET or JWT_SECRET. Merchant login will fail.'
    )
    throw new Error('Merchant JWT secret not configured')
  }

  return secret
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
  const secret = getMerchantJwtSecret()

  const payload = {
    id: merchant.id,
    email: merchant.email,
    name: merchant.name,
    type: 'merchant'
  }

  return jwt.sign(payload, secret, { expiresIn: '7d' })
}

/**
 * 验证商家 JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} 解码后的 payload 或 null（如果无效）
 */
export function verifyMerchantToken(token) {
  if (!token) {
    return null
  }

  try {
    const secret = getMerchantJwtSecret()
    const decoded = jwt.verify(token, secret)
    
    // 验证 token 类型
    if (decoded.type !== 'merchant') {
      return null
    }

    return decoded
  } catch (error) {
    // JWT 验证失败（过期、无效签名等）
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
    secure: true, // 始终使用 secure（HTTPS）
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 7 days in seconds
  })
}

/**
 * 清除商家 token cookie
 * @param {Response} response - Next.js 响应对象
 */
export function clearMerchantTokenCookie(response) {
  response.cookies.set('ptx_merchant_token', '', {
    httpOnly: true,
    secure: true, // 始终使用 secure（HTTPS）
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

