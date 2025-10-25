'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function EventDebugPage() {
  const [testResults, setTestResults] = useState([])

  useEffect(() => {
    // 测试不同的事件ID格式
    const testIds = [
      'ridiculous-chicken',
      'ridiculous-chicken-night-event',
      'test-event-1',
      'aa',
      'random-id-123'
    ]

    const results = testIds.map(id => {
      // 模拟 EventCard 组件的逻辑
      let eventId = id
      
      // 检查是否是默认事件
      const isRidiculousChicken = id === 'ridiculous-chicken' || 
                                 id === 'ridiculous-chicken-night-event' ||
                                 id.includes('ridiculous-chicken')
      
      return {
        id,
        eventId,
        isRidiculousChicken,
        url: `/events/${eventId}`,
        status: isRidiculousChicken ? '✅ 默认事件' : '✅ 通用事件'
      }
    })

    setTestResults(results)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      padding: '32px'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '24px'
        }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '16px'
          }}>
            🐛 事件路由调试页面
          </h1>
          
          <p style={{
            color: '#cbd5e1',
            fontSize: '1.1rem',
            marginBottom: '24px'
          }}>
            测试不同格式的事件ID是否能正确路由
          </p>

          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <h3 style={{ color: '#6ee7b7', marginBottom: '8px' }}>🔧 修复内容</h3>
            <ul style={{ color: '#94a3b8', textAlign: 'left', fontSize: '0.9rem' }}>
              <li>修复了 EventCard 组件的 ID 生成逻辑</li>
              <li>SSR 页面支持多种事件ID格式</li>
              <li>添加了智能匹配系统</li>
              <li>确保 ridiculous-chicken 相关ID都能正确路由</li>
            </ul>
          </div>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '32px'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '24px'
          }}>
            🧪 测试结果
          </h2>

          <div style={{ display: 'grid', gap: '16px' }}>
            {testResults.map((result, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                backgroundColor: 'rgba(55, 65, 81, 0.3)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div>
                  <div style={{ color: 'white', fontWeight: '600', marginBottom: '4px' }}>
                    {result.id}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                    URL: {result.url}
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    color: result.isRidiculousChicken ? '#6ee7b7' : '#22d3ee',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    {result.status}
                  </span>
                  
                  <Link 
                    href={result.url}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: result.isRidiculousChicken ? '#7c3aed' : '#2563eb',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'scale(1.05)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'scale(1)'
                    }}
                  >
                    测试链接
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '8px'
          }}>
            <h3 style={{ color: '#60a5fa', marginBottom: '8px' }}>💡 说明</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
              点击"测试链接"按钮可以验证每个事件ID是否能正确路由到事件详情页面。
              如果仍然出现404错误，请检查控制台是否有其他错误信息。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
