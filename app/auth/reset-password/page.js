"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase-client";

const STATUS_LOADING = "loading";
const STATUS_READY = "ready";
const STATUS_SUCCESS = "success";
const STATUS_ERROR = "error";

function parseHashParams() {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }

  const hash = window.location.hash?.replace(/^#/, "");
  return new URLSearchParams(hash);
}

function ResetPasswordContent() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState(STATUS_LOADING);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

    if (!accessToken || !refreshToken || type !== "recovery") {
      setStatus(STATUS_ERROR);
      setMessage("Reset link is invalid or has expired.");
      return;
    }

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          setStatus(STATUS_ERROR);
          setMessage(error.message || "Unable to validate reset link.");
          return;
        }

        setStatus(STATUS_READY);
        setMessage("");
      })
      .catch((error) => {
        console.error("Failed to set recovery session", error);
        setStatus(STATUS_ERROR);
        setMessage("Unable to validate reset link.");
      });
  }, [supabase]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!supabase) {
      setStatus(STATUS_ERROR);
      setMessage("Authentication service is not configured.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("涓ゆ杈撳叆鐨勫瘑鐮佷笉涓€鑷淬€?);
      return;
    }

    if (password.length < 6) {
      setMessage("瀵嗙爜闀垮害鑷冲皯 6 涓瓧绗︺€?);
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setStatus(STATUS_ERROR);
        setMessage(error.message || "閲嶇疆澶辫触锛岃绋嶅悗閲嶈瘯銆?);
        return;
      }

      setStatus(STATUS_SUCCESS);
      setMessage("瀵嗙爜閲嶇疆鎴愬姛锛? 绉掑悗璺宠浆鍒扮櫥褰曢〉銆?);
      setTimeout(() => {
        router.push("/auth/login");
      }, 3000);
    } catch (error) {
      console.error("Failed to reset password", error);
      setStatus(STATUS_ERROR);
      setMessage("缃戠粶閿欒锛岃绋嶅悗閲嶈瘯銆?);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === STATUS_LOADING) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
            <p className="mt-4 text-gray-600">姝ｅ湪楠岃瘉閲嶇疆浠ょ墝...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === STATUS_ERROR) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="text-6xl mb-4">鈿狅笍</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">閲嶇疆澶辫触</h1>
            <p className="text-red-600 mb-6">{message}</p>
            <div className="space-y-2">
              <Link
                href="/auth/forgot-password"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                閲嶆柊鐢宠閲嶇疆
              </Link>
              <Link
                href="/auth/login"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                杩斿洖鐧诲綍
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === STATUS_SUCCESS) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="text-6xl mb-4">鉁?/div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">瀵嗙爜閲嶇疆鎴愬姛</h1>
            <p className="text-green-600 mb-6">{message}</p>
            <p className="text-gray-600 mb-6">3 绉掑悗鑷姩璺宠浆鍒扮櫥褰曢〉...</p>
            <Link
              href="/auth/login"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              绔嬪嵆鐧诲綍
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">馃敀 閲嶇疆瀵嗙爜</h1>
          <p className="text-gray-600">璇疯緭鍏ユ偍鐨勬柊瀵嗙爜</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                鏂板瘑鐮?              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="璇疯緭鍏ユ柊瀵嗙爜锛堣嚦灏?6 涓瓧绗︼級"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                纭鏂板瘑鐮?              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="璇峰啀娆¤緭鍏ユ柊瀵嗙爜"
                />
              </div>
            </div>

            {message && status !== STATUS_SUCCESS && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-sm text-yellow-800">{message}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "閲嶇疆涓?.." : "閲嶇疆瀵嗙爜"}
              </button>
            </div>

            <div className="text-center">
              <Link href="/auth/login" className="text-sm text-indigo-600 hover:text-indigo-500">
                杩斿洖鐧诲綍
              </Link>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">鈿狅笍 瀹夊叏鎻愮ず</h3>
            <ul className="text-sm text-yellow-700 text-left space-y-1">
              <li>璇蜂娇鐢ㄥ己瀵嗙爜锛屽寘鍚瓧姣嶃€佹暟瀛楀拰鐗规畩瀛楃</li>
              <li>涓嶈浣跨敤涓庡叾浠栫綉绔欑浉鍚岀殑瀵嗙爜</li>
              <li>瀹氭湡鏇存崲瀵嗙爜浠ヤ繚闅滆处鎴峰畨鍏?/li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
              <p className="mt-4 text-gray-600">鍔犺浇涓?..</p>
            </div>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}