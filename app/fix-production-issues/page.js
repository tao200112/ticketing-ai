'use client'

import { useState, useEffect } from 'react'

export default function FixProductionIssuesPage() {
  const [fixes, setFixes] = useState([])
  const [loading, setLoading] = useState(false)

  const applyFixes = async () => {
    setLoading(true)
    const appliedFixes = []

    try {
      // 修复1: 检查并修复二维码生成问题
      try {
        const QRCode = await import('qrcode')
        console.log('QRCode library loaded successfully')
        appliedFixes.push({
          id: 'qrcode-check',
          name: '二维码库检查',
          status: 'success',
          message: 'QRCode库加载成功'
        })
      } catch (error) {
        console.error('QRCode library failed to load:', error)
        appliedFixes.push({
          id: 'qrcode-check',
          name: '二维码库检查',
          status: 'error',
          message: `QRCode库加载失败: ${error.message}`
        })
      }

      // 修复2: 检查环境变量
      const envCheck = {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasStripePublishableKey: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        hasSiteUrl: !!process.env.NEXT_PUBLIC_SITE_URL
      }

      appliedFixes.push({
        id: 'env-check',
        name: '环境变量检查',
        status: Object.values(envCheck).every(Boolean) ? 'success' : 'warning',
        message: `环境变量状态: ${JSON.stringify(envCheck)}`
      })

      // 修复3: 测试API端点
      try {
        const eventsResponse = await fetch('/api/events')
        appliedFixes.push({
          id: 'api-events',
          name: '事件API测试',
          status: eventsResponse.ok ? 'success' : 'error',
          message: `状态: ${eventsResponse.status}`
        })
      } catch (error) {
        appliedFixes.push({
          id: 'api-events',
          name: '事件API测试',
          status: 'error',
          message: `错误: ${error.message}`
        })
      }

      // 修复4: 测试Ridiculous Chicken页面
      try {
        const ridiculousChickenResponse = await fetch('/events/ridiculous-chicken')
        appliedFixes.push({
          id: 'ridiculous-chicken',
          name: 'Ridiculous Chicken页面测试',
          status: ridiculousChickenResponse.ok ? 'success' : 'error',
          message: `状态: ${ridiculousChickenResponse.status}`
        })
      } catch (error) {
        appliedFixes.push({
          id: 'ridiculous-chicken',
          name: 'Ridiculous Chicken页面测试',
          status: 'error',
          message: `错误: ${error.message}`
        })
      }

      // 修复5: 清理localStorage中的问题数据
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const merchantEvents = JSON.parse(localStorage.getItem('merchantEvents') || '[]')
          const cleanedEvents = merchantEvents.filter(event => {
            const isAAEvent = event.title === 'aa' ||
                             event.id.includes('aa') ||
                             event.id.startsWith('default-aa-')
            return !isAAEvent
          })

          if (cleanedEvents.length !== merchantEvents.length) {
            localStorage.setItem('merchantEvents', JSON.stringify(cleanedEvents))
            appliedFixes.push({
              id: 'localstorage-cleanup',
              name: 'localStorage清理',
              status: 'success',
              message: `清理了 ${merchantEvents.length - cleanedEvents.length} 个问题事件`
            })
          } else {
            appliedFixes.push({
              id: 'localstorage-cleanup',
              name: 'localStorage清理',
              status: 'success',
              message: '没有发现需要清理的数据'
            })
          }
        } catch (error) {
          appliedFixes.push({
            id: 'localstorage-cleanup',
            name: 'localStorage清理',
            status: 'error',
            message: `错误: ${error.message}`
          })
        }
      }

      // 修复6: 测试二维码生成
      try {
        const QRCode = await import('qrcode')
        const testData = {
          ticketId: 'test_ticket_123',
          eventName: 'Test Event',
          ticketType: 'General Admission',
          price: '15.00',
          customerName: 'Test Customer',
          customerEmail: 'test@example.com',
          purchaseDate: new Date().toLocaleDateString('en-US'),
          ticketValidityDate: new Date().toISOString().split('T')[0],
          ticketValidityStart: new Date().toISOString(),
          ticketValidityEnd: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }

        const qrString = JSON.stringify(testData)
        const qrDataURL = await QRCode.toDataURL(qrString, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        })

        appliedFixes.push({
          id: 'qrcode-test',
          name: '二维码生成测试',
          status: qrDataURL ? 'success' : 'error',
          message: qrDataURL ? '二维码生成成功' : '二维码生成失败'
        })
      } catch (error) {
        appliedFixes.push({
          id: 'qrcode-test',
          name: '二维码生成测试',
          status: 'error',
          message: `错误: ${error.message}`
        })
      }

      setFixes(appliedFixes)
    } catch (error) {
      console.error('Fix application failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      padding: '32px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center', color: 'white' }}>
          🔧 线上部署问题修复
        </h1>
        
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: 'white' }}>
            🚀 自动修复工具
          </h2>
          
          <p style={{ color: '#cbd5e1', marginBottom: '24px' }}>
            此工具将自动检测和修复常见的线上部署问题，包括环境变量、库依赖、API端点和数据清理。
          </p>

          <button
            onClick={applyFixes}
            disabled={loading}
            style={{
              backgroundColor: loading ? '#6b7280' : '#7c3aed',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1rem'
            }}
          >
            {loading ? '正在修复...' : '开始自动修复'}
          </button>
        </div>

        {fixes.length > 0 && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: 'white' }}>
              📊 修复结果
            </h2>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              {fixes.map((fix, index) => (
                <div key={index} style={{
                  padding: '16px',
                  backgroundColor: fix.status === 'success' ? 'rgba(16, 185, 129, 0.1)' : 
                                  fix.status === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${fix.status === 'success' ? 'rgba(16, 185, 129, 0.2)' : 
                                  fix.status === 'warning' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>
                      {fix.status === 'success' ? '✅' : fix.status === 'warning' ? '⚠️' : '❌'}
                    </span>
                    <strong style={{ 
                      color: fix.status === 'success' ? '#6ee7b7' : 
                             fix.status === 'warning' ? '#fbbf24' : '#fca5a5'
                    }}>
                      {fix.name}
                    </strong>
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                    {fix.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <a 
            href="/debug-production"
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
            查看详细诊断
          </a>
          
          <a 
            href="/events/ridiculous-chicken"
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
            测试 Ridiculous Chicken 页面
          </a>
        </div>
      </div>
    </div>
  )
}
