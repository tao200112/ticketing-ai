'use client';

import { useState, useEffect } from 'react';

export function useEmailVerification(user) {
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.id) {
      checkVerificationStatus();
    }
  }, [user?.id]);

  const checkVerificationStatus = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/auth/check-verification?userId=${user.id}`);
      const data = await response.json();

      if (data.success) {
        setIsVerified(data.data.verified);
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error('检查邮箱验证状态失败:', err);
      setError('检查验证状态失败');
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!user?.email) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message || '发送失败');
      }

      return data;
    } catch (err) {
      console.error('重新发送验证邮件失败:', err);
      setError('网络错误，请稍后重试');
      return { success: false, message: '网络错误' };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isVerified,
    isLoading,
    error,
    checkVerificationStatus,
    resendVerification
  };
}
