'use client'

import Link from "next/link"
import { useState, useEffect } from "react"
import NavbarPartyTix from "../components/NavbarPartyTix"
import EventCard from "../components/EventCard"
import { SkeletonGrid } from "../components/SkeletonCard"
import { hasSupabase } from "../lib/safeEnv"

export default function Home() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

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
              description: '享受美味的鸡肉和精彩的夜晚',
              start_date: '2025-10-25T20:00:00Z',
              location: '201 N Main St SUITE A, Blacksburg, VA',
              poster_url: null,
              starting_price: 5000, // 50元
              status: 'active'
            },
            {
              id: 2,
              name: '周末特别活动',
              description: '周末限时活动，不容错过',
              start_date: '2025-11-01T19:00:00Z',
              location: '市中心广场',
              poster_url: null,
              starting_price: 3000, // 30元
              status: 'active'
            }
          ])
        } catch (dbError) {
          console.log('Supabase 查询失败，使用模拟数据:', dbError)
          setEvents([])
        }
      } else {
        // 使用模拟数据
        setEvents([
          {
            id: 1,
            name: 'Ridiculous Chicken 夜场',
            description: '享受美味的鸡肉和精彩的夜晚',
            start_date: '2025-10-25T20:00:00Z',
            location: '201 N Main St SUITE A, Blacksburg, VA',
            poster_url: null,
            starting_price: 5000,
            status: 'active'
          }
        ])
      }
    } catch (err) {
      console.error('加载活动数据错误:', err)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <NavbarPartyTix />
      
      {/* Hero Section */}
      <div className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Welcome to <span className="text-partytix-gradient">PartyTix</span>
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
            发现精彩活动，购买门票，享受难忘体验。从音乐会到美食节，一切尽在 PartyTix。
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/events" className="btn-partytix-gradient">
              浏览活动
            </Link>
            <Link href="/auth/register" className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors">
              注册账户
            </Link>
          </div>
        </div>
      </div>

      {/* 热门活动 */}
      <div className="pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">热门活动</h2>
          
          {loading ? (
            <SkeletonGrid count={3} type="event" />
          ) : events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎪</div>
              <h3 className="text-xl font-bold text-white mb-2">暂无活动</h3>
              <p className="text-slate-400">敬请期待更多精彩活动</p>
            </div>
          )}
          
          <div className="text-center mt-8">
            <Link href="/events" className="btn-partytix-gradient">
              查看所有活动
            </Link>
          </div>
        </div>
      </div>

      {/* 原始首页入口 */}
      <div className="bg-slate-800/30 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-white mb-2">传统版本</h3>
            <p className="text-slate-400">访问原始页面</p>
          </div>
          
          <div style={{
            padding: '2rem',
            maxWidth: '1200px',
            margin: '0 auto',
            textAlign: 'center',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            border: '1px solid #e9ecef'
          }}>
            <h1 style={{
              fontSize: '3rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
              color: '#333'
            }}>
              Ridiculous Chicken
            </h1>
            
            <div style={{
              marginBottom: '2rem',
              padding: '1.5rem',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e9ecef'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                marginBottom: '1rem',
                color: '#333'
              }}>
                Location & Hours
              </h2>
              <p style={{
                fontSize: '1.1rem',
                color: '#666',
                marginBottom: '0.5rem',
                fontWeight: '500'
              }}>
                📍 201 N Main St SUITE A, Blacksburg, VA 24060
              </p>
              <p style={{
                fontSize: '1.1rem',
                color: '#666',
                fontWeight: '500'
              }}>
                🕕 Open: 6:00 PM - 3:00 AM
              </p>
            </div>
            
            <p style={{
              fontSize: '1.2rem',
              color: '#666',
              marginBottom: '3rem',
              lineHeight: '1.6'
            }}>
              Welcome to our ticketing platform. Browse events, manage your tickets, and more.
            </p>

            <div style={{
              display: 'flex',
              gap: '2rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <Link href="/buy-ticket" style={{
                display: 'inline-block',
                padding: '1rem 2rem',
                backgroundColor: '#007bff',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                transition: 'background-color 0.3s'
              }}>
                Buy Ticket
              </Link>
              
              <Link href="/events/ridiculous-chicken" style={{
                display: 'inline-block',
                padding: '1rem 2rem',
                backgroundColor: '#28a745',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                transition: 'background-color 0.3s'
              }}>
                View Event
              </Link>
              
              <Link href="/admin" style={{
                display: 'inline-block',
                padding: '1rem 2rem',
                backgroundColor: '#6c757d',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                transition: 'background-color 0.3s'
              }}>
                Admin Panel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

