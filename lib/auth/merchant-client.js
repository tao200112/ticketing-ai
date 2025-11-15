/**
 * 商家认证客户端工具函数
 * 
 * 用于前端页面获取商家信息
 * 认证通过 httpOnly cookie 管理，前端通过 API 获取商家信息
 */

/**
 * 获取当前登录的商家信息
 * @returns {Promise<Object|null>} 商家信息或 null（如果未登录）
 */
export async function getMerchantInfo() {
  try {
    const response = await fetch('/api/merchant/profile', {
      credentials: 'include' // 确保发送 cookie
    })
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    
    if (data.success && data.merchant) {
      return {
        id: data.merchant.id,
        email: data.merchant.email,
        name: data.merchant.name,
        verified: data.merchant.verified,
        status: data.merchant.status,
        merchant: data.merchant,
        merchant_id: data.merchant.id
      }
    }
    
    return null
  } catch (error) {
    console.error('Error fetching merchant info:', error)
    return null
  }
}

/**
 * 检查商家是否已登录
 * @returns {Promise<boolean>} 是否已登录
 */
export async function isMerchantAuthenticated() {
  const merchant = await getMerchantInfo()
  return merchant !== null
}

/**
 * 商家登出
 * @returns {Promise<void>}
 */
export async function merchantLogout() {
  try {
    // 清除 cookie（通过 API）
    await fetch('/api/merchant/logout', {
      method: 'POST',
      credentials: 'include'
    })
  } catch (error) {
    console.error('Error logging out:', error)
  }
}

