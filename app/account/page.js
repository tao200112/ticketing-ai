'use client'

import { useState, useEffect } from 'react'
import { hasSupabase } from '../../lib/safeEnv'

export default function AccountPage() {
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      if (hasSupabase()) {
        // 从 Supabase 获取用户数据
        // 注意：这里需要用户认证，暂时使用示例数据
        // 在实际应用中，应该从认证状态或 token 中获取用户 ID
        setUserData({
          source: 'supabase',
          message: 'Supabase 连接正常，但需要用户认证才能获取具体数据'
        })
      } else {
        // 从 localStorage 获取用户数据
        const storedData = localStorage.getItem('partyTix_user')
        if (storedData) {
          const parsedData = JSON.parse(storedData)
          setUserData({
            ...parsedData,
            source: 'localStorage'
          })
        } else {
          setUserData(null)
        }
      }
    } catch (err) {
      setError('加载用户数据时出错')
      console.error('加载用户数据错误:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="bg-partytix-card backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-slate-400">加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-partytix-card backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">加载失败</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button 
            onClick={loadUserData}
            className="btn-partytix-gradient"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-partytix-card backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="text-purple-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">欢迎来到 PartyTix</h2>
          <p className="text-slate-400 mb-6">您还没有账户，请先注册</p>
          <a 
            href="/auth/register"
            className="btn-partytix-gradient"
          >
            立即注册
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-partytix-card backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-partytix-gradient w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl font-bold">
              {userData.name ? userData.name.charAt(0).toUpperCase() : 'U'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">账户信息</h1>
          <p className="text-slate-400">您的 PartyTix 账户详情</p>
        </div>

        <div className="space-y-4">
          {userData.email && (
            <div className="bg-slate-800/30 rounded-lg p-4">
              <label className="block text-sm font-medium text-slate-400 mb-1">邮箱</label>
              <p className="text-white">{userData.email}</p>
            </div>
          )}

          {userData.name && (
            <div className="bg-slate-800/30 rounded-lg p-4">
              <label className="block text-sm font-medium text-slate-400 mb-1">姓名</label>
              <p className="text-white">{userData.name}</p>
            </div>
          )}

          {userData.age && (
            <div className="bg-slate-800/30 rounded-lg p-4">
              <label className="block text-sm font-medium text-slate-400 mb-1">年龄</label>
              <p className="text-white">{userData.age} 岁</p>
            </div>
          )}

          {userData.registered_at && (
            <div className="bg-slate-800/30 rounded-lg p-4">
              <label className="block text-sm font-medium text-slate-400 mb-1">注册时间</label>
              <p className="text-white">{new Date(userData.registered_at).toLocaleString('zh-CN')}</p>
            </div>
          )}

          <div className="bg-slate-800/30 rounded-lg p-4">
            <label className="block text-sm font-medium text-slate-400 mb-1">数据来源</label>
            <p className="text-white capitalize">{userData.source}</p>
          </div>

          {userData.message && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-blue-400 text-sm">{userData.message}</p>
            </div>
          )}
        </div>

        <div className="mt-8 space-y-3">
          <a 
            href="/"
            className="block w-full text-center px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            返回首页
          </a>
          
          {userData.source === 'localStorage' && (
            <button 
              onClick={() => {
                localStorage.removeItem('partyTix_user')
                setUserData(null)
              }}
              className="block w-full text-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              清除本地数据
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
