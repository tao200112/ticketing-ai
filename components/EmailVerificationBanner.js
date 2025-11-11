'use client';

import { useMemo, useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';

export default function EmailVerificationBanner({ user }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = useMemo(() => getSupabaseClient(), []);

  useEffect(() => {
    if (user && !user.emailVerified) {
      setIsVisible(true);
    }
  }, [user]);

  const handleResendVerification = async () => {
    if (!user?.email) return;

    setIsResending(true);
    setMessage('');

    try {
      if (!supabase) {
        setMessage('Authentication service is not available. Please try again later.');
        return;
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });

      if (error) {
        setMessage(error.message || 'Failed to send, please try again later');
        return;
      }

      setMessage('Verification email has been resent, please check your inbox');
    } catch (error) {
      console.error('Resend verification email failed:', error);
      setMessage('Network error, please try again later');
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
          <h3 className="text-sm font-medium text-yellow-800">Email Verification Required</h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              To ensure your account security, please verify your email address <strong>{user.email}</strong>.
              Unverified emails cannot purchase tickets, create events, or withdraw funds.
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
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </button>
              <button
                onClick={handleDismiss}
                className="ml-3 bg-yellow-50 px-2 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
              >
                Remind Me Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}