/**
 * 票务相关工具函数
 */

/**
 * 生成短可读的票务 ID
 * @returns {string} 8位字符的票务ID
 */
export function generateShortTicketId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

