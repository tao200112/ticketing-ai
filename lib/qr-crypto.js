import crypto from 'crypto';

// 服务器盐值，用于 HMAC 签名
// 在生产环境中，这应该从环境变量中读取
const SERVER_SALT = process.env.QR_SALT || 'ticketing-ai-secret-salt-2024';

/**
 * 生成 base64url 编码的 HMAC 签名
 * @param {string} data - 要签名的数据
 * @param {string} secret - 密钥
 * @returns {string} base64url 编码的签名
 */
function hmacSha256Base64Url(data, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  const signature = hmac.digest('base64');
  
  // 转换为 base64url 格式（替换 +/= 为 -_ 并移除填充）
  return signature
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * 生成票据二维码载荷
 * 格式：TKT.<ticket_id>.<exp_ts>.<sig>
 * @param {string} ticketId - 票据 ID
 * @param {number} expTs - 过期时间戳（秒）
 * @returns {string} 二维码载荷
 */
export function generateTicketQRPayload(ticketId, expTs) {
  // 构建要签名的数据：ticket_id + '.' + exp_ts
  const dataToSign = `${ticketId}.${expTs}`;
  
  // 生成 HMAC 签名
  const signature = hmacSha256Base64Url(dataToSign, SERVER_SALT);
  
  // 返回完整载荷：TKT.<ticket_id>.<exp_ts>.<sig>
  return `TKT.${ticketId}.${expTs}.${signature}`;
}

/**
 * 验证票据二维码载荷
 * @param {string} qrPayload - 二维码载荷
 * @returns {Object} 验证结果 { valid: boolean, ticketId: string, expTs: number, error?: string }
 */
export function verifyTicketQRPayload(qrPayload) {
  try {
    // 解析载荷格式：TKT.<ticket_id>.<exp_ts>.<sig>
    const parts = qrPayload.split('.');
    
    if (parts.length !== 4 || parts[0] !== 'TKT') {
      return {
        valid: false,
        error: 'Invalid QR payload format'
      };
    }
    
    const [, ticketId, expTsStr, signature] = parts;
    const expTs = parseInt(expTsStr, 10);
    
    if (isNaN(expTs)) {
      return {
        valid: false,
        error: 'Invalid expiration timestamp'
      };
    }
    
    // 验证签名
    const dataToSign = `${ticketId}.${expTs}`;
    const expectedSignature = hmacSha256Base64Url(dataToSign, SERVER_SALT);
    
    if (signature !== expectedSignature) {
      return {
        valid: false,
        error: 'Invalid signature'
      };
    }
    
    // 检查是否过期
    const currentTs = Math.floor(Date.now() / 1000);
    if (expTs < currentTs) {
      return {
        valid: false,
        error: 'Ticket expired',
        ticketId,
        expTs
      };
    }
    
    return {
      valid: true,
      ticketId,
      expTs
    };
    
  } catch (error) {
    return {
      valid: false,
      error: 'QR payload verification failed: ' + error.message
    };
  }
}

/**
 * 计算票据过期时间（活动结束后 48 小时）
 * @param {Date} eventEndTime - 活动结束时间
 * @returns {number} 过期时间戳（秒）
 */
export function calculateTicketExpiration(eventEndTime) {
  // 活动结束后 48 小时
  const expirationTime = new Date(eventEndTime.getTime() + 48 * 60 * 60 * 1000);
  return Math.floor(expirationTime.getTime() / 1000);
}

/**
 * 从二维码载荷中提取票据 ID
 * @param {string} qrPayload - 二维码载荷
 * @returns {string|null} 票据 ID 或 null
 */
export function extractTicketIdFromQR(qrPayload) {
  const parts = qrPayload.split('.');
  if (parts.length === 4 && parts[0] === 'TKT') {
    return parts[1];
  }
  return null;
}
