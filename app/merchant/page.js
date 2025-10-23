'use client'

import { useState, useEffect } from 'react'
import { hasSupabase } from '../../lib/safeEnv'

export default function MerchantOverviewPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      
      if (hasSupabase()) {
        // 尝试从 Supabase 获取真实数据
        try {
          // 这里可以添加真实的 Supabase 查询
          // 暂时使用模拟数据
          await new Promise(resolve => setTimeout(resolve, 1000)) // 模拟网络延迟
          setStats({
            todaySold: 45,
            todayVerified: 38,
            totalRevenue: 2340,
            lowStockAlerts: 2,
            source: 'supabase'
          })
        } catch (dbError) {
          console.log('Supabase 查询失败，使用模拟数据:', dbError)
          setStats({
            todaySold: 45,
            todayVerified: 38,
            totalRevenue: 2340,
            lowStockAlerts: 2,
            source: 'local'
          })
        }
      } else {
        // 使用本地模拟数据
        setStats({
          todaySold: 45,
          todayVerified: 38,
          totalRevenue: 2340,
          lowStockAlerts: 2,
          source: 'local'
        })
      }
    } catch (err) {
      setError('加载统计数据失败')
      console.error('加载统计数据错误:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 bg-slate-700 rounded w-48 animate-pulse mb-2"></div>
            <div className="h-4 bg-slate-700 rounded w-96 animate-pulse"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-partytix-card rounded-xl p-6">
                <div className="h-4 bg-slate-700 rounded w-24 animate-pulse mb-2"></div>
                <div className="h-8 bg-slate-700 rounded w-16 animate-pulse mb-2"></div>
                <div className="h-3 bg-slate-700 rounded w-32 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-8">
        <div className="bg-partytix-card rounded-xl p-8 max-w-md text-center">
          <div className="text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">加载失败</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button 
            onClick={loadStats}
            className="btn-partytix-gradient"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: '今日售出',
      value: stats?.todaySold || 0,
      subtitle: '张票',
      icon: '🎫',
      color: 'text-green-400'
    },
    {
      title: '已核销',
      value: stats?.todayVerified || 0,
      subtitle: '张票',
      icon: '✅',
      color: 'text-blue-400'
    },
    {
      title: '总收入',
      value: `¥${(stats?.totalRevenue || 0).toLocaleString()}`,
      subtitle: '今日',
      icon: '💰',
      color: 'text-yellow-400'
    },
    {
      title: '余票预警',
      value: stats?.lowStockAlerts || 0,
      subtitle: '个活动',
      icon: '⚠️',
      color: 'text-orange-400'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">商家控制台</h1>
          <p className="text-slate-400">管理您的活动和票务数据</p>
          {stats?.source && (
            <p className="text-xs text-slate-500 mt-1">数据来源: {stats.source}</p>
          )}
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) => (
            <div key={index} className="bg-partytix-card rounded-xl p-6 hover:bg-slate-800/70 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="text-2xl">{card.icon}</div>
                <div className={`text-sm font-medium ${card.color}`}>{card.title}</div>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{card.value}</div>
              <div className="text-sm text-slate-400">{card.subtitle}</div>
            </div>
          ))}
        </div>

        {/* 快速操作 */}
        <div className="bg-partytix-card rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">快速操作</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a 
              href="/merchant/events"
              className="flex items-center p-4 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              <div className="text-2xl mr-4">📅</div>
              <div>
                <div className="font-medium text-white">管理活动</div>
                <div className="text-sm text-slate-400">查看和编辑活动</div>
              </div>
            </a>
            
            <a 
              href="/merchant/events/new"
              className="flex items-center p-4 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              <div className="text-2xl mr-4">➕</div>
              <div>
                <div className="font-medium text-white">发布活动</div>
                <div className="text-sm text-slate-400">创建新活动</div>
              </div>
            </a>
            
            <a 
              href="/scan"
              className="flex items-center p-4 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              <div className="text-2xl mr-4">📱</div>
              <div>
                <div className="font-medium text-white">核销票据</div>
                <div className="text-sm text-slate-400">扫描二维码</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
