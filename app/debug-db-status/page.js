'use client'

import { useState, useEffect } from 'react'

export default function DebugDBStatusPage() {
  const [dbStatus, setDbStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const checkDatabaseStatus = async () => {
      try {
        setLoading(true)
        setError(null)

        const status = {
          timestamp: new Date().toISOString(),
          
          // 环境变量检查
          environment: {
            nodeEnv: process.env.NODE_ENV,
            hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            hasServiceKey: false, // 客户端无法检查服务端环境变量
            hasDatabaseUrl: !!process.env.DATABASE_URL
          },

          // 数据库连接测试
          connections: {
            supabase: 'Testing...',
            prisma: 'Testing...',
            api: 'Testing...'
          },

          // 用户数据测试
          userData: {
            registration: 'Testing...',
            login: 'Testing...',
            storage: 'Testing...'
          }
        }

        // 测试Supabase连接
        try {
          const supabaseResponse = await fetch('/api/debug/supabase-test')
          if (supabaseResponse.ok) {
            const supabaseData = await supabaseResponse.json()
            status.connections.supabase = `Success: ${supabaseData.message}`
          } else {
            status.connections.supabase = `Error: ${supabaseResponse.status}`
          }
        } catch (err) {
          status.connections.supabase = `Error: ${err.message}`
        }

        // 测试Prisma连接
        try {
          const prismaResponse = await fetch('/api/debug/prisma-test')
          if (prismaResponse.ok) {
            const prismaData = await prismaResponse.json()
            status.connections.prisma = `Success: ${prismaData.message}`
          } else {
            status.connections.prisma = `Error: ${prismaResponse.status}`
          }
        } catch (err) {
          status.connections.prisma = `Error: ${err.message}`
        }

        // 测试API端点
        try {
          const apiResponse = await fetch('/api/events')
          if (apiResponse.ok) {
            const apiData = await apiResponse.json()
            status.connections.api = `Success: ${Array.isArray(apiData) ? apiData.length : 0} events`
          } else {
            status.connections.api = `Error: ${apiResponse.status}`
          }
        } catch (err) {
          status.connections.api = `Error: ${err.message}`
        }

        // 测试用户注册
        try {
          const registerResponse = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'test@example.com',
              name: 'Test User',
              age: 18,
              password: 'testpassword123'
            })
          })
          status.userData.registration = `Status: ${registerResponse.status}`
        } catch (err) {
          status.userData.registration = `Error: ${err.message}`
        }

        // 测试用户登录
        try {
          const loginResponse = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'testpassword123'
            })
          })
          status.userData.login = `Status: ${loginResponse.status}`
        } catch (err) {
          status.userData.login = `Error: ${err.message}`
        }

        // 检查本地存储
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            const users = localStorage.getItem('users')
            const userCount = users ? JSON.parse(users).length : 0
            status.userData.storage = `Found ${userCount} users in localStorage`
          } catch (err) {
            status.userData.storage = `Error: ${err.message}`
          }
        } else {
          status.userData.storage = 'localStorage not available (SSR)'
        }

        setDbStatus(status)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    checkDatabaseStatus()
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
          <h2 style={{ color: 'white', marginBottom: '8px' }}>正在检查数据库状态...</h2>
          <p style={{ color: '#cbd5e1' }}>诊断数据库连接和配置问题</p>
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
          🗄️ 数据库状态诊断
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
                  backgroundColor: dbStatus.environment.hasSupabaseUrl ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${dbStatus.environment.hasSupabaseUrl ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: dbStatus.environment.hasSupabaseUrl ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    Supabase URL: {dbStatus.environment.hasSupabaseUrl ? '✅ 已设置' : '❌ 未设置'}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: dbStatus.environment.hasSupabaseAnonKey ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${dbStatus.environment.hasSupabaseAnonKey ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: dbStatus.environment.hasSupabaseAnonKey ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    Supabase Anon Key: {dbStatus.environment.hasSupabaseAnonKey ? '✅ 已设置' : '❌ 未设置'}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: dbStatus.environment.hasDatabaseUrl ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${dbStatus.environment.hasDatabaseUrl ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: dbStatus.environment.hasDatabaseUrl ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    Database URL: {dbStatus.environment.hasDatabaseUrl ? '✅ 已设置' : '❌ 未设置'}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '8px'
                }}>
                  <div style={{ color: '#60a5fa', fontWeight: '500' }}>
                    Node Environment: {dbStatus.environment.nodeEnv}
                  </div>
                </div>
              </div>
            </div>

            {/* 数据库连接测试 */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: 'white' }}>
                🔗 数据库连接测试
              </h2>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{
                  padding: '12px',
                  backgroundColor: dbStatus.connections.supabase.includes('Success') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${dbStatus.connections.supabase.includes('Success') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: dbStatus.connections.supabase.includes('Success') ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    Supabase: {dbStatus.connections.supabase}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: dbStatus.connections.prisma.includes('Success') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${dbStatus.connections.prisma.includes('Success') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: dbStatus.connections.prisma.includes('Success') ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    Prisma: {dbStatus.connections.prisma}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: dbStatus.connections.api.includes('Success') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${dbStatus.connections.api.includes('Success') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: dbStatus.connections.api.includes('Success') ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    Events API: {dbStatus.connections.api}
                  </div>
                </div>
              </div>
            </div>

            {/* 用户数据测试 */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: 'white' }}>
                👤 用户数据测试
              </h2>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{
                  padding: '12px',
                  backgroundColor: dbStatus.userData.registration.includes('Status: 200') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${dbStatus.userData.registration.includes('Status: 200') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: dbStatus.userData.registration.includes('Status: 200') ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    用户注册: {dbStatus.userData.registration}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: dbStatus.userData.login.includes('Status: 200') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${dbStatus.userData.login.includes('Status: 200') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: dbStatus.userData.login.includes('Status: 200') ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    用户登录: {dbStatus.userData.login}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '8px'
                }}>
                  <div style={{ color: '#60a5fa', fontWeight: '500' }}>
                    本地存储: {dbStatus.userData.storage}
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
                  <strong>如果所有连接都失败，可能的原因：</strong>
                </p>
                <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
                  <li>Supabase环境变量未正确设置</li>
                  <li>数据库表不存在或结构不匹配</li>
                  <li>RLS策略阻止访问</li>
                  <li>网络连接问题</li>
                </ul>
                
                <p style={{ marginBottom: '12px' }}>
                  <strong>如果注册成功但登录失败：</strong>
                </p>
                <ul style={{ marginLeft: '20px' }}>
                  <li>数据保存到了不同的数据库</li>
                  <li>密码加密方式不匹配</li>
                  <li>用户数据格式不一致</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <a 
            href="/debug-database"
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
            href="/debug-production"
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
            查看生产环境诊断
          </a>
        </div>
      </div>
    </div>
  )
}
