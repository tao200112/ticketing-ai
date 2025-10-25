'use client'

import { useState, useEffect } from 'react'

export default function DebugSupabaseConfigPage() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const checkSupabaseConfig = async () => {
      try {
        setLoading(true)
        setError(null)

        const configData = {
          timestamp: new Date().toISOString(),
          
          // 环境变量检查
          environment: {
            nodeEnv: process.env.NODE_ENV,
            hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set',
            supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set (hidden)' : 'Not set'
          },

          // 数据库连接测试
          connections: {
            supabase: 'Testing...',
            tables: 'Testing...',
            rls: 'Testing...'
          },

          // 数据存储检查
          storage: {
            localStorage: 'Checking...',
            supabase: 'Testing...',
            conflicts: 'Analyzing...'
          },

          // 问题诊断
          issues: [],
          recommendations: []
        }

        // 测试Supabase连接
        try {
          const supabaseResponse = await fetch('/api/debug/supabase-test')
          if (supabaseResponse.ok) {
            const supabaseData = await supabaseResponse.json()
            configData.connections.supabase = `✅ Success: ${supabaseData.message}`
          } else {
            configData.connections.supabase = `❌ Error: ${supabaseResponse.status}`
            configData.issues.push('Supabase连接失败')
          }
        } catch (err) {
          configData.connections.supabase = `❌ Error: ${err.message}`
          configData.issues.push('Supabase连接异常')
        }

        // 测试数据库表
        try {
          const tablesResponse = await fetch('/api/debug/supabase-tables')
          if (tablesResponse.ok) {
            const tablesData = await tablesResponse.json()
            configData.connections.tables = `✅ Success: ${tablesData.tables?.length || 0} tables found`
          } else {
            configData.connections.tables = `❌ Error: ${tablesResponse.status}`
            configData.issues.push('数据库表查询失败')
          }
        } catch (err) {
          configData.connections.tables = `❌ Error: ${err.message}`
          configData.issues.push('数据库表查询异常')
        }

        // 检查localStorage使用
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            const localStorageKeys = Object.keys(localStorage)
            const relevantKeys = localStorageKeys.filter(key => 
              key.includes('user') || 
              key.includes('event') || 
              key.includes('ticket') || 
              key.includes('purchase') ||
              key.includes('merchant') ||
              key.includes('admin')
            )
            
            configData.storage.localStorage = `⚠️ Found ${relevantKeys.length} relevant keys: ${relevantKeys.join(', ')}`
            
            if (relevantKeys.length > 0) {
              configData.issues.push('发现本地存储数据，不符合完全线上部署要求')
              configData.recommendations.push('移除所有localStorage使用，改为Supabase存储')
            }
          } catch (err) {
            configData.storage.localStorage = `❌ Error: ${err.message}`
          }
        } else {
          configData.storage.localStorage = 'localStorage not available (SSR)'
        }

        // 检查Supabase数据
        try {
          const supabaseDataResponse = await fetch('/api/debug/supabase-data')
          if (supabaseDataResponse.ok) {
            const supabaseData = await supabaseDataResponse.json()
            configData.storage.supabase = `✅ Success: ${supabaseData.summary}`
          } else {
            configData.storage.supabase = `❌ Error: ${supabaseDataResponse.status}`
            configData.issues.push('Supabase数据查询失败')
          }
        } catch (err) {
          configData.storage.supabase = `❌ Error: ${err.message}`
          configData.issues.push('Supabase数据查询异常')
        }

        // 分析冲突
        const hasLocalStorage = configData.storage.localStorage.includes('Found')
        const hasSupabase = configData.storage.supabase.includes('Success')
        
        if (hasLocalStorage && hasSupabase) {
          configData.storage.conflicts = '⚠️ 发现混合存储：同时使用localStorage和Supabase'
          configData.issues.push('混合存储系统导致数据不一致')
          configData.recommendations.push('统一使用Supabase，移除所有localStorage')
        } else if (hasLocalStorage && !hasSupabase) {
          configData.storage.conflicts = '❌ 仅使用本地存储，不符合线上部署要求'
          configData.issues.push('完全依赖本地存储，无法支持多用户')
          configData.recommendations.push('立即配置Supabase，迁移所有数据')
        } else if (!hasLocalStorage && hasSupabase) {
          configData.storage.conflicts = '✅ 仅使用Supabase，符合线上部署要求'
        } else {
          configData.storage.conflicts = '❌ 无数据存储系统'
          configData.issues.push('没有可用的数据存储系统')
          configData.recommendations.push('配置Supabase数据库')
        }

        // 添加更多建议
        if (configData.environment.hasSupabaseUrl && configData.environment.hasSupabaseAnonKey) {
          configData.recommendations.push('环境变量已配置，检查数据库连接')
        } else {
          configData.recommendations.push('配置Supabase环境变量')
        }

        if (configData.issues.length === 0) {
          configData.recommendations.push('配置正常，可以开始测试功能')
        }

        setConfig(configData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    checkSupabaseConfig()
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
          <h2 style={{ color: 'white', marginBottom: '8px' }}>正在检查Supabase配置...</h2>
          <p style={{ color: '#cbd5e1' }}>分析数据库配置和存储策略</p>
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
          🗄️ Supabase配置审计
        </h1>
        
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <h3 style={{ color: '#ef4444', marginBottom: '8px' }}>❌ 检查错误</h3>
            <p style={{ color: '#fca5a5', margin: 0 }}>{error}</p>
          </div>
        )}

        {config && (
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
                  backgroundColor: config.environment.hasSupabaseUrl ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${config.environment.hasSupabaseUrl ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: config.environment.hasSupabaseUrl ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    Supabase URL: {config.environment.hasSupabaseUrl ? '✅ 已设置' : '❌ 未设置'}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '4px' }}>
                    {config.environment.supabaseUrl}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: config.environment.hasSupabaseAnonKey ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${config.environment.hasSupabaseAnonKey ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: config.environment.hasSupabaseAnonKey ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    Supabase Anon Key: {config.environment.hasSupabaseAnonKey ? '✅ 已设置' : '❌ 未设置'}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '4px' }}>
                    {config.environment.supabaseAnonKey}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '8px'
                }}>
                  <div style={{ color: '#60a5fa', fontWeight: '500' }}>
                    Node Environment: {config.environment.nodeEnv}
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
                  backgroundColor: config.connections.supabase.includes('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${config.connections.supabase.includes('✅') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: config.connections.supabase.includes('✅') ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    Supabase连接: {config.connections.supabase}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: config.connections.tables.includes('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${config.connections.tables.includes('✅') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: config.connections.tables.includes('✅') ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    数据库表: {config.connections.tables}
                  </div>
                </div>
              </div>
            </div>

            {/* 数据存储检查 */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: 'white' }}>
                💾 数据存储检查
              </h2>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{
                  padding: '12px',
                  backgroundColor: config.storage.localStorage.includes('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${config.storage.localStorage.includes('✅') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: config.storage.localStorage.includes('✅') ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    本地存储: {config.storage.localStorage}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: config.storage.supabase.includes('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${config.storage.supabase.includes('✅') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: config.storage.supabase.includes('✅') ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    Supabase存储: {config.storage.supabase}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  backgroundColor: config.storage.conflicts.includes('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${config.storage.conflicts.includes('✅') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ color: config.storage.conflicts.includes('✅') ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
                    存储冲突: {config.storage.conflicts}
                  </div>
                </div>
              </div>
            </div>

            {/* 问题诊断 */}
            {config.issues.length > 0 && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '16px',
                padding: '24px'
              }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: '#ef4444' }}>
                  ❌ 发现的问题
                </h2>
                
                <ul style={{ color: '#fca5a5', margin: 0, paddingLeft: '20px' }}>
                  {config.issues.map((issue, index) => (
                    <li key={index} style={{ marginBottom: '8px' }}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 修复建议 */}
            {config.recommendations.length > 0 && (
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '16px',
                padding: '24px'
              }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: '#3b82f6' }}>
                  💡 修复建议
                </h2>
                
                <ul style={{ color: '#60a5fa', margin: 0, paddingLeft: '20px' }}>
                  {config.recommendations.map((rec, index) => (
                    <li key={index} style={{ marginBottom: '8px' }}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 完全线上部署检查清单 */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: 'white' }}>
                ✅ 完全线上部署检查清单
              </h2>
              
              <div style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong>必需配置：</strong>
                </p>
                <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
                  <li>✅ Supabase URL环境变量</li>
                  <li>✅ Supabase Anon Key环境变量</li>
                  <li>✅ Supabase Service Key环境变量</li>
                  <li>✅ 数据库表结构正确</li>
                  <li>✅ RLS策略配置</li>
                </ul>
                
                <p style={{ marginBottom: '12px' }}>
                  <strong>禁止使用：</strong>
                </p>
                <ul style={{ marginLeft: '20px' }}>
                  <li>❌ localStorage存储</li>
                  <li>❌ sessionStorage存储</li>
                  <li>❌ 本地文件存储</li>
                  <li>❌ Prisma + SQLite</li>
                  <li>❌ localUserStorage</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <a 
            href="/debug-db-status"
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
            查看数据库状态
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
