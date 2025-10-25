'use client'

import { useState, useEffect } from 'react'

export default function RidiculousChickenTestSimplePage() {
  const [eventData, setEventData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // 直接访问事件详情页面
        const response = await fetch('/events/ridiculous-chicken')
        
        if (response.ok) {
          // 获取页面内容
          const html = await response.text()
          console.log('Page HTML length:', html.length)
          
          // 检查是否包含购票相关的关键词
          const hasTicketSection = html.includes('选择票种')
          const hasDateSection = html.includes('票券有效期选择')
          const hasPriceSection = html.includes('Regular Ticket')
          
          setEventData({
            hasTicketSection,
            hasDateSection,
            hasPriceSection,
            htmlLength: html.length,
            status: 'success'
          })
        } else {
          setError(`HTTP ${response.status}: ${response.statusText}`)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchEventData()
  }, [])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px'
      }}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🔄</div>
          <h2 style={{ color: 'white', marginBottom: '8px' }}>正在测试...</h2>
          <p style={{ color: '#cbd5e1' }}>检查 Ridiculous Chicken 活动页面</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      padding: '32px'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center', color: 'white' }}>
          🐔 Ridiculous Chicken 简单测试
        </h1>
        
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <h3 style={{ color: '#ef4444', marginBottom: '8px' }}>❌ 错误</h3>
            <p style={{ color: '#fca5a5', margin: 0 }}>{error}</p>
          </div>
        )}

        {eventData && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '32px',
            marginBottom: '24px'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: 'white' }}>
              📊 页面内容检查结果
            </h2>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{
                padding: '16px',
                backgroundColor: eventData.hasTicketSection ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${eventData.hasTicketSection ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>
                    {eventData.hasTicketSection ? '✅' : '❌'}
                  </span>
                  <strong style={{ color: eventData.hasTicketSection ? '#6ee7b7' : '#fca5a5' }}>
                    票种选择区域
                  </strong>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                  {eventData.hasTicketSection ? '页面包含"选择票种"内容' : '页面缺少"选择票种"内容'}
                </p>
              </div>

              <div style={{
                padding: '16px',
                backgroundColor: eventData.hasDateSection ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${eventData.hasDateSection ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>
                    {eventData.hasDateSection ? '✅' : '❌'}
                  </span>
                  <strong style={{ color: eventData.hasDateSection ? '#6ee7b7' : '#fca5a5' }}>
                    购票日期选择
                  </strong>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                  {eventData.hasDateSection ? '页面包含"票券有效期选择"内容' : '页面缺少"票券有效期选择"内容'}
                </p>
              </div>

              <div style={{
                padding: '16px',
                backgroundColor: eventData.hasPriceSection ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${eventData.hasPriceSection ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>
                    {eventData.hasPriceSection ? '✅' : '❌'}
                  </span>
                  <strong style={{ color: eventData.hasPriceSection ? '#6ee7b7' : '#fca5a5' }}>
                    票种信息
                  </strong>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                  {eventData.hasPriceSection ? '页面包含"Regular Ticket"内容' : '页面缺少"Regular Ticket"内容'}
                </p>
              </div>

              <div style={{
                padding: '16px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>📄</span>
                  <strong style={{ color: '#60a5fa' }}>页面信息</strong>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                  页面HTML长度: {eventData.htmlLength} 字符
                </p>
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <a 
            href="/events/ridiculous-chicken"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              marginRight: '16px'
            }}
          >
            访问活动页面
          </a>
          
          <a 
            href="/events"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: 'rgba(55, 65, 81, 0.5)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '600'
            }}
          >
            返回事件列表
          </a>
        </div>
      </div>
    </div>
  )
}
