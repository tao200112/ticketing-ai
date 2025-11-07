'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userSession, setUserSession] = useState(null);
  
  // Check if user is logged in
  useEffect(() => {
    try {
      const session = localStorage.getItem('userSession');
      if (session) {
        const parsed = JSON.parse(session);
        setUserSession(parsed);
      }
    } catch (error) {
      console.error('Failed to parse user session:', error);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        // Check if user is logged in and email is not verified
        // If user is logged in but email is not verified, show specific message
        if (userSession && !userSession.email_verified_at) {
          // Check if the email matches the logged-in user's email
          if (email.toLowerCase() === userSession.email?.toLowerCase()) {
            // User is logged in and trying to reset password for their own unverified email
            setStatus('error');
            setMessage('Please verify your email before resetting your password.');
          } else {
            // User is logged in but trying to reset password for different email
            // Show generic success message (maintains security)
            setStatus('success');
            setMessage(data.message);
          }
        } else if (data._internal?.emailNotVerified) {
          // Email not verified but user might not be logged in
          // Show generic success message (maintains security)
          setStatus('success');
          setMessage(data.message);
        } else {
          setStatus('success');
          setMessage(data.message);
        }
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to send, please try again later');
      }
    } catch (error) {
      console.error('Failed to send reset email:', error);
      setStatus('error');
      setMessage('Network error, please try again later');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔒 找回密码
          </h1>
          <p className="text-gray-600">
            输入您的邮箱地址，我们将发送密码重置链接
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {status === 'success' ? (
            <div className="text-center">
              <div className="text-6xl mb-4">📧</div>
              <h2 className="text-xl font-semibold text-green-600 mb-4">
                邮件已发送！
              </h2>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              <div className="space-y-2">
                <Link
                  href="/auth/login"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  返回登录
                </Link>
                <button
                  onClick={() => {
                    setStatus('');
                    setMessage('');
                    setEmail('');
                  }}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  重新发送
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  邮箱地址
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="请输入您的邮箱地址"
                  />
                </div>
              </div>

              {status === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-800">{message}</p>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '发送中...' : '发送重置邮件'}
                </button>
              </div>

              <div className="text-center">
                <Link
                  href="/auth/login"
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  返回登录
                </Link>
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              💡 提示
            </h3>
            <ul className="text-sm text-blue-700 text-left space-y-1">
              <li>• 重置链接将在 30 分钟后过期</li>
              <li>• 每个链接只能使用一次</li>
              <li>• 如果没有收到邮件，请检查垃圾邮件文件夹</li>
              <li>• 如果问题持续，请联系客服</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
