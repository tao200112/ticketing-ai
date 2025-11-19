/**
 * After Login Handler
 * 统一处理登录后的业务逻辑和路由跳转
 */

/**
 * 处理登录后的业务逻辑
 * @param {Object} options - 配置选项
 * @param {string} options.path - 当前访问路径（用于判断入口类型）
 * @param {Function} options.router - Next.js router 实例
 * @returns {Promise<void>}
 */
export async function handleAfterLogin({ path = '', router }) {
  try {
    // 调用 after-login API
    const response = await fetch('/api/auth/after-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path }),
    });

    if (!response.ok) {
      console.error('After login API failed:', response.status, response.statusText);
      // 如果 API 失败，默认跳转到 account 页面
      router.push('/account');
      return;
    }

    const data = await response.json();

    // 根据返回的数据决定跳转
    if (data.isMerchant) {
      router.push('/merchant/dashboard');
      return;
    }

    if (data.needPasswordSetup) {
      router.push('/onboarding/set-password');
      return;
    }

    if (data.needOnboarding) {
      router.push('/onboarding');
      return;
    }

    // 默认跳转到 account 页面
    router.push('/account');
  } catch (error) {
    console.error('After login handler error:', error);
    // 出错时默认跳转到 account 页面
    router.push('/account');
  }
}

