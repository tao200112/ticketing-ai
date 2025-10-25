'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function EventDiagnosePage() {
  const [diagnosis, setDiagnosis] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const runDiagnosis = async () => {
      const results = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        userAgent: navigator.userAgent,
        tests: []
      }

      // 测试 1: 检查路由解析
      try {
        const testRoutes = [
          '/events/ridiculous-chicken',
          '/events/ridiculous-chicken-night-event',
          '/events/test-event-1',
          '/events/aa',
          '/events/default-aa-1761363423786'
        ]

        for (const route of testRoutes) {
          try {
            const response = await fetch(route, { method: 'HEAD' })
            results.tests.push({
              route,
              status: response.status,
              success: response.ok,
              error: response.ok ? null : `HTTP ${response.status}`
            })
          } catch (error) {
            results.tests.push({
              route,
              status: 'ERROR',
              success: false,
              error: error.message
            })
          }
        }
      } catch (error) {
        results.tests.push({
          test: 'Route parsing',
          success: false,
          error: error.message
        })
      }

      // 测试 2: 检查环境变量
      results.environmentVariables = {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
        NEXT_PUBLIC_GIT_SHA: process.env.NEXT_PUBLIC_GIT_SHA
      }

      // 测试 3: 检查浏览器兼容性
      results.browserCompatibility = {
        localStorage: typeof localStorage !== 'undefined',
        window: typeof window !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        url: window.location.href
      }

      setDiagnosis(results)
      setLoading(false)
    }

    runDiagnosis()
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
          <p style={{ color: '#cbd5e1' }}>请稍候，我们正在检查系统状态</p>
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
            🔧 线上部署诊断报告
          </h1>
          
          <p style={{
            color: '#cbd5e1',
            fontSize: '1.1rem',
            marginBottom: '24px'
          }}>
            诊断时间: {diagnosis.timestamp}
          </p>

          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <h3 style={{ color: '#6ee7b7', marginBottom: '8px' }}>🎯 诊断目标</h3>
            <ul style={{ color: '#94a3b8', textAlign: 'left', fontSize: '0.9rem' }}>
              <li>检查事件路由是否正常工作</li>
              <li>验证环境变量配置</li>
              <li>测试浏览器兼容性</li>
              <li>识别线上部署问题</li>
            </ul>
          </div>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '24px'
          }}>
            🧪 路由测试结果
          </h2>

          <div style={{ display: 'grid', gap: '12px' }}>
            {diagnosis.tests.map((test, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                backgroundColor: test.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: test.success ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px'
              }}>
                <div>
                  <div style={{ 
                    color: 'white', 
                    fontWeight: '600', 
                    marginBottom: '4px',
                    fontFamily: 'monospace'
                  }}>
                    {test.route}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                    状态: {test.status} {test.error && `- ${test.error}`}
                  </div>
                </div>
                
                <div style={{
                  color: test.success ? '#6ee7b7' : '#ef4444',
                  fontSize: '1.5rem'
                }}>
                  {test.success ? '✅' : '❌'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '24px'
          }}>
            🌍 环境信息
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            <div>
              <h3 style={{ color: '#22d3ee', marginBottom: '12px' }}>环境变量</h3>
              <div style={{
                backgroundColor: 'rgba(55, 65, 81, 0.3)',
                borderRadius: '8px',
                padding: '16px',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                color: '#cbd5e1'
              }}>
                {Object.entries(diagnosis.environmentVariables).map(([key, value]) => (
                  <div key={key} style={{ marginBottom: '4px' }}>
                    {key}: {value || 'undefined'}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 style={{ color: '#22d3ee', marginBottom: '12px' }}>浏览器兼容性</h3>
              <div style={{
                backgroundColor: 'rgba(55, 65, 81, 0.3)',
                borderRadius: '8px',
                padding: '16px',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                color: '#cbd5e1'
              }}>
                {Object.entries(diagnosis.browserCompatibility).map(([key, value]) => (
                  <div key={key} style={{ marginBottom: '4px' }}>
                    {key}: {typeof value === 'boolean' ? (value ? '✅' : '❌') : value}
                  </div>
                ))}
              </div>
            </div>
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
            🚀 快速修复建议
          </h2>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <h3 style={{ color: '#60a5fa', marginBottom: '8px' }}>1. 清除缓存</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                尝试硬刷新页面 (Ctrl+F5) 或清除浏览器缓存
              </p>
            </div>

            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <h3 style={{ color: '#6ee7b7', marginBottom: '8px' }}>2. 检查部署状态</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                确认最新代码已成功部署到生产环境
              </p>
            </div>

            <div style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <h3 style={{ color: '#fbbf24', marginBottom: '8px' }}>3. 联系技术支持</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                如果问题持续存在，请提供此诊断报告给技术支持团队
              </p>
            </div>
          </div>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <Link 
              href="/events"
              style={{
                display: 'inline-block',
                padding: '16px 32px',
                background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '1.1rem'
              }}
            >
              返回事件列表
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
