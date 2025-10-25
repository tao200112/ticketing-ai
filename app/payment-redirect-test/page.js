'use client'

import { useState } from 'react'

export default function PaymentRedirectTestPage() {
  const [testResults, setTestResults] = useState(null)

  const testRedirectUrls = () => {
    const results = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      tests: []
    }

    // 测试不同的 URL 配置
    const testUrls = [
      {
        name: '生产环境 URL',
        url: 'https://ticketing-ai-ypyj.vercel.app/success?session_id=test_123',
        expected: '应该重定向到生产环境的成功页面'
      },
      {
        name: '本地开发 URL',
        url: 'http://localhost:3000/success?session_id=test_123',
        expected: '应该重定向到本地开发环境的成功页面'
      },
      {
        name: '当前页面 URL',
        url: window.location.origin + '/success?session_id=test_123',
        expected: '应该重定向到当前域名的成功页面'
      }
    ]

    testUrls.forEach((test, index) => {
      results.tests.push({
        id: index + 1,
        name: test.name,
        url: test.url,
        expected: test.expected,
        status: 'ready'
      })
    })

    setTestResults(results)
  }

  const testUrl = (url) => {
    // 在新窗口中打开测试 URL
    window.open(url, '_blank')
  }

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
            🔄 支付重定向测试
          </h1>
          
          <p style={{
            color: '#cbd5e1',
            fontSize: '1.1rem',
            marginBottom: '24px'
          }}>
            测试 Stripe 支付完成后的重定向配置是否正确
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
              <li>修复了 Stripe 重定向 URL 配置问题</li>
              <li>添加了智能环境检测</li>
              <li>支持生产环境和开发环境自动切换</li>
              <li>添加了环境变量配置支持</li>
            </ul>
          </div>

          <button
            onClick={testRedirectUrls}
            style={{
              padding: '12px 24px',
              backgroundColor: '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '24px'
            }}
          >
            开始测试重定向 URL
          </button>
        </div>

        {testResults && (
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

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ color: '#22d3ee', marginBottom: '12px' }}>环境信息</h3>
              <div style={{
                backgroundColor: 'rgba(55, 65, 81, 0.3)',
                borderRadius: '8px',
                padding: '16px',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                color: '#cbd5e1'
              }}>
                <div>环境: {testResults.environment}</div>
                <div>测试时间: {testResults.timestamp}</div>
                <div>当前域名: {window.location.origin}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              {testResults.tests.map((test) => (
                <div key={test.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  backgroundColor: 'rgba(55, 65, 81, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: '600', marginBottom: '4px' }}>
                      {test.name}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '4px' }}>
                      {test.url}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                      {test.expected}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => testUrl(test.url)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    测试链接
                  </button>
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
              <h3 style={{ color: '#60a5fa', marginBottom: '8px' }}>💡 测试说明</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                点击"测试链接"按钮会在新窗口中打开对应的 URL。
                如果重定向配置正确，应该能够正常访问成功页面。
                如果出现连接错误，说明重定向 URL 配置有问题。
              </p>
            </div>
          </div>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <a 
            href="/events"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
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
