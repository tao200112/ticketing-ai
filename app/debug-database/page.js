'use client'

import { useState, useEffect } from 'react'

export default function DebugDatabasePage() {
  const [dbStatus, setDbStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const testDatabaseConnection = async () => {
      try {
        setLoading(true)
        setError(null)

        const testResults = {
          timestamp: new Date().toISOString(),
          
          // 环境变量检查
          envVars: {
            hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            hasServiceRoleKey: false, // 客户端无法访问服务端环境变量
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'
          },

          // API测试
          apiTests: {
            events: 'Testing...',
            createEvent: 'Testing...',
            checkoutSession: 'Testing...'
          },

          // 数据库操作测试
          dbOperations: {
            readEvents: 'Testing...',
            createEvent: 'Testing...',
            updateEvent: 'Testing...'
          }
        }

        // 测试事件API
        try {
          const eventsResponse = await fetch('/api/events')
          const eventsData = await eventsResponse.json()
          testResults.apiTests.events = `Status: ${eventsResponse.status}, Data: ${eventsData?.length || 0} events`
        } catch (err) {
          testResults.apiTests.events = `Error: ${err.message}`
        }

        // 测试创建事件API
        try {
          const createEventResponse = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Test Event',
              description: 'Test Description',
              start_time: new Date().toISOString(),
              end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              venue: 'Test Venue',
              location: 'Test Location',
              max_attendees: 100,
              prices: [{
                id: 'test-price',
                label: 'Test Price',
                amount: 1500,
                currency: 'USD',
                inventory: 50,
                limit_per_user: 2
              }]
            })
          })
          testResults.apiTests.createEvent = `Status: ${createEventResponse.status}`
        } catch (err) {
          testResults.apiTests.createEvent = `Error: ${err.message}`
        }

        // 测试支付会话API
        try {
          const checkoutResponse = await fetch('/api/checkout_sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventId: 'test-event',
              ticketType: 'test-price',
              quantity: 1,
              customerEmail: 'test@example.com',
              customerName: 'Test Customer'
            })
          })
          testResults.apiTests.checkoutSession = `Status: ${checkoutResponse.status}`
        } catch (err) {
          testResults.apiTests.checkoutSession = `Error: ${err.message}`
        }

        // 测试数据库读取
        try {
          const dbTestResponse = await fetch('/api/debug/database-test')
          if (dbTestResponse.ok) {
            const dbTestData = await dbTestResponse.json()
            testResults.dbOperations.readEvents = `Success: ${dbTestData.message}`
          } else {
            testResults.dbOperations.readEvents = `Error: ${dbTestResponse.status}`
          }
        } catch (err) {
          testResults.dbOperations.readEvents = `Error: ${err.message}`
        }

        setDbStatus(testResults)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    testDatabaseConnection()
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
          <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🗄️</div>
          <h2 style={{ color: 'white', marginBottom: '8px' }}>正在测试数据库...</h2>
          <p style={{ color: '#cbd5e1' }}>检查数据库连接和操作</p>
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
          🗄️ 数据库连接诊断
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

        {dbStatus && (
          <div style={{ display: 'grid', gap: '24px' }}>
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
                  backgroundColor: dbStatus.envVars.hasSupabaseUrl ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${dbStatus.envVars.hasSupabaseUrl ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: dbStatus.envVars.hasSupabaseUrl ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    Supabase URL: {dbStatus.envVars.hasSupabaseUrl ? '✅ 已设置' : '❌ 未设置'}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '4px' }}>
                    {dbStatus.envVars.supabaseUrl}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: dbStatus.envVars.hasSupabaseAnonKey ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${dbStatus.envVars.hasSupabaseAnonKey ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: dbStatus.envVars.hasSupabaseAnonKey ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    Supabase Anon Key: {dbStatus.envVars.hasSupabaseAnonKey ? '✅ 已设置' : '❌ 未设置'}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  borderRadius: '8px'
                }}>
                  <div style={{ color: '#fbbf24', fontWeight: '500' }}>
                    Service Role Key: ⚠️ 客户端无法检查（需要服务端检查）
                  </div>
                </div>
              </div>
            </div>

            {/* API测试结果 */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: 'white' }}>
                🌐 API端点测试
              </h2>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{
                  padding: '12px',
                  backgroundColor: dbStatus.apiTests.events.includes('Status: 200') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${dbStatus.apiTests.events.includes('Status: 200') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: dbStatus.apiTests.events.includes('Status: 200') ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    /api/events: {dbStatus.apiTests.events}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: dbStatus.apiTests.createEvent.includes('Status: 200') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${dbStatus.apiTests.createEvent.includes('Status: 200') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: dbStatus.apiTests.createEvent.includes('Status: 200') ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    /api/events (POST): {dbStatus.apiTests.createEvent}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: dbStatus.apiTests.checkoutSession.includes('Status: 200') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${dbStatus.apiTests.checkoutSession.includes('Status: 200') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: dbStatus.apiTests.checkoutSession.includes('Status: 200') ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    /api/checkout_sessions: {dbStatus.apiTests.checkoutSession}
                  </div>
                </div>
              </div>
            </div>

            {/* 数据库操作测试 */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: 'white' }}>
                🗄️ 数据库操作测试
              </h2>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{
                  padding: '12px',
                  backgroundColor: dbStatus.dbOperations.readEvents.includes('Success') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${dbStatus.dbOperations.readEvents.includes('Success') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: dbStatus.dbOperations.readEvents.includes('Success') ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    数据库读取: {dbStatus.dbOperations.readEvents}
                  </div>
                </div>
              </div>
            </div>

            {/* 问题诊断 */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: 'white' }}>
                🔍 问题诊断
              </h2>
              
              <div style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong>如果所有测试都失败，可能的原因：</strong>
                </p>
                <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
                  <li>Supabase环境变量未正确设置</li>
                  <li>数据库连接失败</li>
                  <li>RLS策略阻止访问</li>
                  <li>数据库表不存在</li>
                </ul>
                
                <p style={{ marginBottom: '12px' }}>
                  <strong>解决方案：</strong>
                </p>
                <ul style={{ marginLeft: '20px' }}>
                  <li>检查Vercel环境变量配置</li>
                  <li>确认Supabase项目状态</li>
                  <li>检查数据库表结构</li>
                  <li>验证RLS策略设置</li>
                </ul>
              </div>
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
            查看完整诊断
          </a>
          
          <a 
            href="/fix-production-issues"
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
            运行自动修复
          </a>
        </div>
      </div>
    </div>
  )
}
