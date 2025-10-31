'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function EmailVerificationBanner({ user }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // 检查用户邮箱是否已验证
    if (user && !user.emailVerified) {
      setIsVisible(true);
    }
  }, [user]);

  const handleResendVerification = async () => {
    if (!user?.email) return;
    
    setIsResending(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('验证邮件已重新发送，请检查您的邮箱');
      } else {
        setMessage(data.message || '发送失败，请稍后重试');
      }
    } catch (error) {
      console.error('重新发送验证邮件失败:', error);
      setMessage('网络错误，请稍后重试');
    } finally {
      setIsResending(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !user) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            需要验证邮箱
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              为了保障您的账户安全，请验证您的邮箱地址 <strong>{user.email}</strong>。
              未验证邮箱将无法购票、创建活动或提现。
            </p>
            {message && (
              <p className="mt-2 font-medium">{message}</p>
            )}
          </div>
          <div className="mt-4">
            <div className="-mx-2 -my-1.5 flex">
              <button
                onClick={handleResendVerification}
                disabled={isResending}
                className="bg-yellow-50 px-2 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? '发送中...' : '重新发送验证邮件'}
              </button>
              <button
                onClick={handleDismiss}
                className="ml-3 bg-yellow-50 px-2 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
              >
                稍后提醒
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
