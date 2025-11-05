'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailContent() {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const [isResending, setIsResending] = useState(false);
  
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setStatus('error');
      setMessage('Missing verification token');
    }
  }, [token]);

  const verifyEmail = async (verificationToken) => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
        setUser(data.data);
      } else {
        setStatus('error');
        setMessage(data.message || 'Verification failed');
      }
    } catch (error) {
      console.error('Email verification failed:', error);
      setStatus('error');
      setMessage('Network error, please try again later');
    }
  };

  const resendVerification = async () => {
    if (!user?.email) return;
    
    setIsResending(true);
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
        setMessage('Verification email has been resent, please check your inbox');
      } else {
        setMessage(data.message || 'Send failed');
      }
    } catch (error) {
      console.error('Resend verification email failed:', error);
      setMessage('Network error, please try again later');
    } finally {
      setIsResending(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {getStatusIcon()} Email Verification
          </h1>
          <p className="text-gray-600">
            {status === 'loading' && 'Verifying your email...'}
            {status === 'success' && 'Verification successful!'}
            {status === 'error' && 'Verification failed'}
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className={`text-lg font-medium ${getStatusColor()} mb-4`}>
              {message}
            </div>

            {status === 'success' && user && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <p className="text-sm text-green-800">
                    <strong>{user.name}</strong>, your email <strong>{user.email}</strong> has been successfully verified!
                  </p>
                </div>
                <div className="space-y-2">
                  <Link
                    href="/auth/login"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Login Now
                  </Link>
                  <Link
                    href="/"
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Return to Homepage
                  </Link>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-800">
                    Verification failed, possible reasons:
                  </p>
                  <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
                    <li>Verification link has expired</li>
                    <li>Verification link has been used</li>
                    <li>Verification link is invalid</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={resendVerification}
                    disabled={isResending || !user?.email}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResending ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                  <Link
                    href="/auth/login"
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Return to Login
                  </Link>
                </div>
              </div>
            )}

            {status === 'loading' && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
                <p className="text-sm text-gray-600">
                  Please wait, we are verifying your email...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
