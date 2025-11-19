"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const STATUS_IDLE = "idle";
const STATUS_SUCCESS = "success";
const STATUS_ERROR = "error";

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(STATUS_IDLE);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!supabase) {
      setStatus(STATUS_ERROR);
      setMessage("Authentication service is not configured.");
      return;
    }

    setIsLoading(true);
    setStatus(STATUS_IDLE);
    setMessage("");

    try {
      // Use SITE_URL from env or fallback to window.location.origin
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : undefined);
      const redirectTo = siteUrl ? `${siteUrl}/auth/update-password` : undefined;
      const options = redirectTo ? { redirectTo } : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email, options);

      if (error) {
        setStatus(STATUS_ERROR);
        setMessage(error.message || "Failed to send reset email, please try again later");
        return;
      }

      setStatus(STATUS_SUCCESS);
      setMessage("If this email is registered, you will receive a password reset message shortly.");
    } catch (error) {
      console.error("Failed to send reset email", error);
      setStatus(STATUS_ERROR);
      setMessage("Network error, please try again later");
    } finally {
      setIsLoading(false);
    }
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email Address
        </label>
        <div className="mt-1">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Enter your email address"
          />
        </div>
      </div>

      {status === STATUS_ERROR && (
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
          {isLoading ? "Sending..." : "Send Reset Email"}
        </button>
      </div>

      <div className="text-center">
        <Link href="/auth/login" className="text-sm text-indigo-600 hover:text-indigo-500">
          Back to Login
        </Link>
      </div>
    </form>
  );

  const renderSuccess = () => (
    <div className="text-center">
      <div className="text-6xl mb-4">✓</div>
      <h2 className="text-xl font-semibold text-green-600 mb-4">Email Sent!</h2>
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="space-y-2">
        <Link
          href="/auth/login"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Back to Login
        </Link>
        <button
          onClick={() => {
            setStatus(STATUS_IDLE);
            setMessage("");
            setEmail("");
          }}
          className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Resend
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔑 Reset Password</h1>
          <p className="text-gray-600">Enter your email address and we'll send you a password reset link.</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {status === STATUS_SUCCESS ? renderSuccess() : renderForm()}
        </div>

        <div className="mt-6 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">💡 Tips</h3>
            <ul className="text-sm text-blue-700 text-left space-y-1">
              <li>Reset links expire after 30 minutes.</li>
              <li>Each link can only be used once.</li>
              <li>If you don't receive an email, check your spam folder.</li>
              <li>If the problem persists, please contact support.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
