'use client'

import { useState, useEffect } from 'react'

export default function DebugProductionPage() {
  const [debugInfo, setDebugInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        setLoading(true)
        setError(null)

        const diagnostics = {
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV,
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A',
          url: typeof window !== 'undefined' ? window.location.href : 'N/A',
          
          // 检查环境变量
          envVars: {
            hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            hasStripePublishableKey: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
            hasSiteUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
            siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'Not set'
          },

          // 检查库依赖
          libraries: {
            qrcode: 'Checking...',
            stripe: 'Checking...',
            supabase: 'Checking...'
          },

          // 检查API端点
          apiEndpoints: {
            events: 'Checking...',
            ridiculousChicken: 'Checking...',
            checkoutSessions: 'Checking...'
          },

          // 检查本地存储
          localStorage: {
            merchantEvents: 'Checking...',
            recentPurchase: 'Checking...',
            userTickets: 'Checking...'
          }
        }

        // 检查库是否可用
        try {
          const QRCode = await import('qrcode')
          diagnostics.libraries.qrcode = 'Available'
        } catch (err) {
          diagnostics.libraries.qrcode = `Error: ${err.message}`
        }

        try {
          const { loadStripe } = await import('@stripe/stripe-js')
          diagnostics.libraries.stripe = 'Available'
        } catch (err) {
          diagnostics.libraries.stripe = `Error: ${err.message}`
        }

        try {
          const { createClient } = await import('@supabase/supabase-js')
          diagnostics.libraries.supabase = 'Available'
        } catch (err) {
          diagnostics.libraries.supabase = `Error: ${err.message}`
        }

        // 检查API端点
        try {
          const eventsResponse = await fetch('/api/events')
          diagnostics.apiEndpoints.events = `Status: ${eventsResponse.status}`
        } catch (err) {
          diagnostics.apiEndpoints.events = `Error: ${err.message}`
        }

        try {
          const ridiculousChickenResponse = await fetch('/events/ridiculous-chicken')
          diagnostics.apiEndpoints.ridiculousChicken = `Status: ${ridiculousChickenResponse.status}`
        } catch (err) {
          diagnostics.apiEndpoints.ridiculousChicken = `Error: ${err.message}`
        }

        try {
          const checkoutResponse = await fetch('/api/checkout_sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true })
          })
          diagnostics.apiEndpoints.checkoutSessions = `Status: ${checkoutResponse.status}`
        } catch (err) {
          diagnostics.apiEndpoints.checkoutSessions = `Error: ${err.message}`
        }

        // 检查本地存储
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            const merchantEvents = localStorage.getItem('merchantEvents')
            diagnostics.localStorage.merchantEvents = merchantEvents ? `Found ${JSON.parse(merchantEvents).length} events` : 'Empty'
          } catch (err) {
            diagnostics.localStorage.merchantEvents = `Error: ${err.message}`
          }

          try {
            const recentPurchase = localStorage.getItem('recentPurchase')
            diagnostics.localStorage.recentPurchase = recentPurchase ? 'Found' : 'Empty'
          } catch (err) {
            diagnostics.localStorage.recentPurchase = `Error: ${err.message}`
          }

          try {
            const userTickets = localStorage.getItem('userTickets')
            diagnostics.localStorage.userTickets = userTickets ? `Found ${JSON.parse(userTickets).length} tickets` : 'Empty'
          } catch (err) {
            diagnostics.localStorage.userTickets = `Error: ${err.message}`
          }
        } else {
          diagnostics.localStorage = 'localStorage not available (SSR)'
        }

        setDebugInfo(diagnostics)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    runDiagnostics()
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
          <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🔍</div>
          <h2 style={{ color: 'white', marginBottom: '8px' }}>正在诊断...</h2>
          <p style={{ color: '#cbd5e1' }}>检查线上部署环境</p>
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
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center', color: 'white' }}>
          🚀 线上部署问题诊断
        </h1>
        
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <h3 style={{ color: '#ef4444', marginBottom: '8px' }}>❌ 诊断错误</h3>
            <p style={{ color: '#fca5a5', margin: 0 }}>{error}</p>
          </div>
        )}

        {debugInfo && (
          <div style={{ display: 'grid', gap: '24px' }}>
            {/* 基本信息 */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: 'white' }}>
                📊 基本信息
              </h2>
              
              <div style={{ display: 'grid', gap: '12px', color: '#cbd5e1', fontSize: '0.9rem' }}>
                <div><strong>时间戳:</strong> {debugInfo.timestamp}</div>
                <div><strong>环境:</strong> {debugInfo.environment}</div>
                <div><strong>URL:</strong> {debugInfo.url}</div>
                <div><strong>User Agent:</strong> {debugInfo.userAgent.substring(0, 100)}...</div>
              </div>
            </div>

            {/* 环境变量检查 */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: 'white' }}>
                🔧 环境变量检查
              </h2>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{
                  padding: '12px',
                  backgroundColor: debugInfo.envVars.hasSupabaseUrl ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${debugInfo.envVars.hasSupabaseUrl ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: debugInfo.envVars.hasSupabaseUrl ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    Supabase URL: {debugInfo.envVars.hasSupabaseUrl ? '✅ 已设置' : '❌ 未设置'}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: debugInfo.envVars.hasSupabaseAnonKey ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${debugInfo.envVars.hasSupabaseAnonKey ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: debugInfo.envVars.hasSupabaseAnonKey ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    Supabase Anon Key: {debugInfo.envVars.hasSupabaseAnonKey ? '✅ 已设置' : '❌ 未设置'}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: debugInfo.envVars.hasStripePublishableKey ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${debugInfo.envVars.hasStripePublishableKey ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: debugInfo.envVars.hasStripePublishableKey ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    Stripe Publishable Key: {debugInfo.envVars.hasStripePublishableKey ? '✅ 已设置' : '❌ 未设置'}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: debugInfo.envVars.hasSiteUrl ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${debugInfo.envVars.hasSiteUrl ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: debugInfo.envVars.hasSiteUrl ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    Site URL: {debugInfo.envVars.hasSiteUrl ? `✅ ${debugInfo.envVars.siteUrl}` : '❌ 未设置'}
                  </div>
                </div>
              </div>
            </div>

            {/* 库依赖检查 */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: 'white' }}>
                📚 库依赖检查
              </h2>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{
                  padding: '12px',
                  backgroundColor: debugInfo.libraries.qrcode.includes('Available') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${debugInfo.libraries.qrcode.includes('Available') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: debugInfo.libraries.qrcode.includes('Available') ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    QRCode: {debugInfo.libraries.qrcode}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: debugInfo.libraries.stripe.includes('Available') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${debugInfo.libraries.stripe.includes('Available') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: debugInfo.libraries.stripe.includes('Available') ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    Stripe: {debugInfo.libraries.stripe}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: debugInfo.libraries.supabase.includes('Available') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${debugInfo.libraries.supabase.includes('Available') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: debugInfo.libraries.supabase.includes('Available') ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    Supabase: {debugInfo.libraries.supabase}
                  </div>
                </div>
              </div>
            </div>

            {/* API端点检查 */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: 'white' }}>
                🌐 API端点检查
              </h2>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{
                  padding: '12px',
                  backgroundColor: debugInfo.apiEndpoints.events.includes('Status: 200') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${debugInfo.apiEndpoints.events.includes('Status: 200') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: debugInfo.apiEndpoints.events.includes('Status: 200') ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    /api/events: {debugInfo.apiEndpoints.events}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: debugInfo.apiEndpoints.ridiculousChicken.includes('Status: 200') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${debugInfo.apiEndpoints.ridiculousChicken.includes('Status: 200') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: debugInfo.apiEndpoints.ridiculousChicken.includes('Status: 200') ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    /events/ridiculous-chicken: {debugInfo.apiEndpoints.ridiculousChicken}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: debugInfo.apiEndpoints.checkoutSessions.includes('Status: 200') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${debugInfo.apiEndpoints.checkoutSessions.includes('Status: 200') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: debugInfo.apiEndpoints.checkoutSessions.includes('Status: 200') ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    /api/checkout_sessions: {debugInfo.apiEndpoints.checkoutSessions}
                  </div>
                </div>
              </div>
            </div>

            {/* 本地存储检查 */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: 'white' }}>
                💾 本地存储检查
              </h2>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{
                  padding: '12px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '8px'
                }}>
                  <div style={{ color: '#60a5fa', fontWeight: '500' }}>
                    Merchant Events: {debugInfo.localStorage.merchantEvents}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '8px'
                }}>
                  <div style={{ color: '#60a5fa', fontWeight: '500' }}>
                    Recent Purchase: {debugInfo.localStorage.recentPurchase}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '8px'
                }}>
                  <div style={{ color: '#60a5fa', fontWeight: '500' }}>
                    User Tickets: {debugInfo.localStorage.userTickets}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '32px' }}>
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
            测试 Ridiculous Chicken 页面
          </a>
          
          <a 
            href="/debug-qr"
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
            测试二维码生成
          </a>
        </div>
      </div>
    </div>
  )
}
