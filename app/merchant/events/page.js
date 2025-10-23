'use client'

import { useState, useEffect } from 'react'
import { hasSupabase } from '../../../lib/safeEnv'

export default function MerchantEventsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      setLoading(true)
      
      if (hasSupabase()) {
        // 尝试从 Supabase 获取真实数据
        try {
          // 这里可以添加真实的 Supabase 查询
          // 暂时使用模拟数据
          await new Promise(resolve => setTimeout(resolve, 1000))
          setEvents([
            {
              id: 1,
              name: 'Ridiculous Chicken 夜场',
              status: 'active',
              sold: 45,
              total: 100,
              revenue: 2340,
              start_date: '2025-10-25T20:00:00Z',
              created_at: '2025-10-20T10:00:00Z'
            },
            {
              id: 2,
              name: '周末特别活动',
              status: 'draft',
              sold: 0,
              total: 50,
              revenue: 0,
              start_date: '2025-11-01T19:00:00Z',
              created_at: '2025-10-22T14:30:00Z'
            }
          ])
        } catch (dbError) {
          console.log('Supabase 查询失败，使用模拟数据:', dbError)
          setEvents([])
        }
      } else {
        // 从 localStorage 获取本地数据
        const storedEvents = localStorage.getItem('merchant_events')
        if (storedEvents) {
          setEvents(JSON.parse(storedEvents))
        } else {
          setEvents([])
        }
      }
    } catch (err) {
      setError('加载活动列表失败')
      console.error('加载活动列表错误:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      draft: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      ended: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30'
    }
    return badges[status] || badges.draft
  }

  const getStatusText = (status) => {
    const texts = {
      active: '进行中',
      draft: '草稿',
      ended: '已结束',
      cancelled: '已取消'
    }
    return texts[status] || '未知'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 bg-slate-700 rounded w-48 animate-pulse mb-2"></div>
            <div className="h-4 bg-slate-700 rounded w-96 animate-pulse"></div>
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-partytix-card rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-6 bg-slate-700 rounded w-64 animate-pulse mb-2"></div>
                    <div className="h-4 bg-slate-700 rounded w-48 animate-pulse"></div>
                  </div>
                  <div className="h-8 bg-slate-700 rounded w-20 animate-pulse"></div>
                </div>
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
            onClick={loadEvents}
            className="btn-partytix-gradient"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">我的活动</h1>
            <p className="text-slate-400">管理您的所有活动</p>
          </div>
          <a 
            href="/merchant/events/new"
            className="btn-partytix-gradient"
          >
            新建活动
          </a>
        </div>

        {/* 活动列表 */}
        {events.length === 0 ? (
          <div className="bg-partytix-card rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-white mb-2">暂无活动</h3>
            <p className="text-slate-400 mb-6">开始创建您的第一个活动</p>
            <a 
              href="/merchant/events/new"
              className="btn-partytix-gradient"
            >
              发布活动
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="bg-partytix-card rounded-xl p-6 hover:bg-slate-800/70 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-xl font-bold text-white">{event.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(event.status)}`}>
                        {getStatusText(event.status)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">开始时间:</span>
                        <div className="text-white">{new Date(event.start_date).toLocaleString('zh-CN')}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">售票情况:</span>
                        <div className="text-white">{event.sold}/{event.total}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">收入:</span>
                        <div className="text-white">¥{event.revenue.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">创建时间:</span>
                        <div className="text-white">{new Date(event.created_at).toLocaleDateString('zh-CN')}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-6">
                    <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">
                      编辑
                    </button>
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
                      查看
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 返回按钮 */}
        <div className="mt-8">
          <a 
            href="/merchant"
            className="inline-flex items-center text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回控制台
          </a>
        </div>
      </div>
    </div>
  )
}
