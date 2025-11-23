"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const STATUS_LOADING = "loading";
const STATUS_SUCCESS = "success";
const STATUS_ERROR = "error";

function parseHashParams() {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }

  const hash = window.location.hash?.replace(/^#/, "");
  return new URLSearchParams(hash);
}

function VerifyEmailContent() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [status, setStatus] = useState(STATUS_LOADING);
  const [message, setMessage] = useState("Verifying your email...");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setStatus(STATUS_ERROR);
      setMessage("Authentication service is not configured.");
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const params = parseHashParams();
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (!accessToken || !refreshToken || !type) {
      setStatus(STATUS_ERROR);
      setMessage("Verification link is invalid or has expired.");
      return;
    }

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(async ({ error }) => {
        if (error) {
          setStatus(STATUS_ERROR);
          setMessage(error.message || "Verification link is invalid or has expired.");
          return;
        }

        const { data, error: userError } = await supabase.auth.getUser();
        if (userError || !data?.user) {
          setStatus(STATUS_ERROR);
          setMessage(userError?.message || "Unable to load user information.");
          return;
        }

        const verifiedAt = data.user.email_confirmed_at || new Date().toISOString();
        setStatus(STATUS_SUCCESS);
        setUserEmail(data.user.email || "");
        setUserName(
          data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            data.user.email ||
            ""
        );
        setMessage(
          `Email verified successfully! Verified at: ${new Date(verifiedAt).toLocaleString("en-US")}`
        );
      })
      .catch((error) => {
        console.error("Failed to verify email", error);
        setStatus(STATUS_ERROR);
        setMessage("Verification link is invalid or has expired.");
      });
  }, [supabase]);

  const resendVerification = async () => {
    if (!supabase || !userEmail) {
      return;
    }

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: userEmail });
      if (error) {
        setMessage(error.message || "Resend failed, please try again later.");
        return;
      }
      setMessage("Verification email has been resent. Please check your inbox.");
    } catch (error) {
      console.error("Failed to resend verification email", error);
      setMessage("Network error, please try again later.");
    } finally {
      setIsResending(false);
    }
  };

  const renderIcon = () => {
    switch (status) {
      case STATUS_SUCCESS:
        return "✅";
      case STATUS_ERROR:
        return "❌";
      default:
        return "⏳";
    }
  };

  const statusColor =
    status === STATUS_SUCCESS
      ? "text-green-600"
      : status === STATUS_ERROR
      ? "text-red-600"
      : "text-blue-600";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {renderIcon()} Email Verification
          </h1>
          <p className="text-gray-600">
            {status === STATUS_LOADING && "Verifying your email..."}
            {status === STATUS_SUCCESS && "Verification successful!"}
            {status === STATUS_ERROR && "Verification failed"}
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className={`text-lg font-medium ${statusColor} mb-4`}>{message}</div>

            {status === STATUS_SUCCESS && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <p className="text-sm text-green-800">
                    <strong>{userName}</strong>, your email <strong>{userEmail}</strong> has been successfully verified!
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
                    href="/blacksburg"
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Back to Home
                  </Link>
                </div>
              </div>
            )}

            {status === STATUS_ERROR && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-800">Possible reasons:</p>
                  <ul className="text-sm text-red-700 mt-2 list-disc list-inside text-left">
                    <li>Verification link has expired</li>
                    <li>Verification link has been used</li>
                    <li>Verification link is invalid</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={resendVerification}
                    disabled={isResending || !userEmail}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResending ? "Sending..." : "Resend Verification Email"}
                  </button>
                  <Link
                    href="/auth/login"
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Back to Login
                  </Link>
                </div>
              </div>
            )}

            {status === STATUS_LOADING && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                </div>
                <p className="text-sm text-gray-600">Please wait, we are verifying your email...</p>
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
