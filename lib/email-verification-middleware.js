/**
 * 邮箱验证中间件
 * 检查用户邮箱是否已验证，未验证则阻止关键操作
 */

import { createClient } from '@supabase/supabase-js';
import { createError } from './error-codes.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * 检查用户邮箱验证状态
 * @param {string} userId - 用户ID
 * @returns {Promise<{verified: boolean, user: object|null}>}
 */
export async function checkEmailVerification(userId) {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, email_verified_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return { verified: false, user: null };
    }

    return {
      verified: !!user.email_verified_at,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerifiedAt: user.email_verified_at
      }
    };
  } catch (error) {
    console.error('❌ 检查邮箱验证状态失败:', error);
    return { verified: false, user: null };
  }
}

/**
 * Next.js API 路由中间件：检查邮箱验证
 * @param {Function} handler - 原始处理器
 * @param {Object} options - 配置选项
 * @returns {Function} 包装后的处理器
 */
export function withEmailVerification(handler, options = {}) {
  const {
    requireVerification = true,
    allowedActions = ['purchase', 'create_event', 'withdraw'],
    customMessage = null
  } = options;

  return async (req, res) => {
    try {
      // 从请求中获取用户ID（需要根据你的认证方式调整）
      const userId = req.headers['x-user-id'] || req.body?.userId;
      
      if (!userId) {
        return res.status(401).json(
          createError('AUTH_001', { 
            details: 'User not authenticated',
            action: 'login_required'
          })
        );
      }

      // 检查邮箱验证状态
      const { verified, user } = await checkEmailVerification(userId);

      if (!requireVerification) {
        // 如果不需要验证，直接调用原始处理器
        return handler(req, res);
      }

      if (!verified) {
        // 邮箱未验证，返回错误
        const message = customMessage || 
          '请先验证您的邮箱才能进行此操作。我们已向您的邮箱发送了验证邮件，请查收并点击验证链接。';

        return res.status(403).json(
          createError('AUTH_006', { 
            details: 'Email verification required',
            message,
            user: {
              id: user?.id,
              email: user?.email,
              name: user?.name
            },
            action: 'verify_email',
            allowedActions
          })
        );
      }

      // 邮箱已验证，继续处理请求
      return handler(req, res);

    } catch (error) {
      console.error('❌ 邮箱验证中间件错误:', error);
      return res.status(500).json(
        createError('SYS_001', { 
          details: 'Email verification check failed'
        })
      );
    }
  };
}

/**
 * 检查特定操作是否需要邮箱验证
 * @param {string} action - 操作类型
 * @returns {boolean} 是否需要验证
 */
export function requiresEmailVerification(action) {
  const protectedActions = [
    'purchase',           // 购票
    'create_event',       // 创建活动
    'edit_event',         // 编辑活动
    'withdraw',           // 提现
    'create_merchant',    // 创建商家
    'admin_action'        // 管理员操作
  ];

  return protectedActions.includes(action);
}

/**
 * 获取邮箱验证提示信息
 * @param {string} action - 操作类型
 * @returns {Object} 提示信息
 */
export function getVerificationMessage(action) {
  const messages = {
    purchase: {
      title: '需要验证邮箱才能购票',
      message: '为了保障您的购票安全，请先验证邮箱地址。我们已向您的邮箱发送了验证邮件。',
      action: 'verify_email'
    },
    create_event: {
      title: '需要验证邮箱才能创建活动',
      message: '为了确保活动创建者的身份真实性，请先验证邮箱地址。',
      action: 'verify_email'
    },
    withdraw: {
      title: '需要验证邮箱才能提现',
      message: '为了保障资金安全，请先验证邮箱地址才能进行提现操作。',
      action: 'verify_email'
    },
    default: {
      title: '需要验证邮箱',
      message: '请先验证您的邮箱地址才能进行此操作。',
      action: 'verify_email'
    }
  };

  return messages[action] || messages.default;
}

export default {
  checkEmailVerification,
  withEmailVerification,
  requiresEmailVerification,
  getVerificationMessage
};
