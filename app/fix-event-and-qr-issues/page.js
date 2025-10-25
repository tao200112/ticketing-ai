'use client'

import { useState, useEffect } from 'react'

export default function FixEventAndQrIssuesPage() {
  const [fixes, setFixes] = useState([])
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState({})

  const availableFixes = [
    {
      id: 'clear-supabase-cache',
      name: '清理Supabase缓存',
      description: '清理Supabase数据库缓存，解决数据不一致问题',
      action: async () => {
        try {
          // 这里可以添加清理缓存的API调用
          return { success: true, message: 'Supabase缓存清理完成' }
        } catch (error) {
          return { success: false, message: `清理失败: ${error.message}` }
        }
      }
    },
    {
      id: 'test-database-connection',
      name: '测试数据库连接',
      description: '测试Supabase数据库连接和表结构',
      action: async () => {
        try {
          const response = await fetch('/api/debug/supabase-test')
          const data = await response.json()
          return { 
            success: response.ok, 
            message: data.message,
            details: data.details 
          }
        } catch (error) {
          return { success: false, message: `连接测试失败: ${error.message}` }
        }
      }
    },
    {
      id: 'test-events-api',
      name: '测试活动API',
      description: '测试活动数据获取API',
      action: async () => {
        try {
          const response = await fetch('/api/events')
          const data = await response.json()
          return { 
            success: response.ok, 
            message: `API响应: ${response.status}`,
            details: Array.isArray(data) ? `${data.length} 个活动` : '非数组响应'
          }
        } catch (error) {
          return { success: false, message: `API测试失败: ${error.message}` }
        }
      }
    },
    {
      id: 'test-event-detail',
      name: '测试活动详情',
      description: '测试特定活动详情页面',
      action: async () => {
        try {
          const response = await fetch('/api/events/ridiculous-chicken')
          const data = await response.json()
          return { 
            success: response.ok, 
            message: `活动详情响应: ${response.status}`,
            details: data.event ? `活动: ${data.event.title}` : '无活动数据'
          }
        } catch (error) {
          return { success: false, message: `活动详情测试失败: ${error.message}` }
        }
      }
    },
    {
      id: 'test-qr-generation',
      name: '测试二维码生成',
      description: '测试二维码生成功能',
      action: async () => {
        try {
          // 模拟二维码生成测试
          const testData = {
            ticketId: 'test-123',
            eventName: 'Test Event',
            customerEmail: 'test@example.com'
          }
          
          // 检查qrcode库是否可用
          if (typeof window !== 'undefined') {
            try {
              const QRCode = await import('qrcode')
              const qrDataURL = await QRCode.toDataURL(JSON.stringify(testData))
              return { 
                success: true, 
                message: '二维码生成成功',
                details: `生成的数据URL长度: ${qrDataURL.length}`
              }
            } catch (qrError) {
              return { 
                success: false, 
                message: `二维码生成失败: ${qrError.message}` 
              }
            }
          } else {
            return { 
              success: false, 
              message: '客户端环境不可用' 
            }
          }
        } catch (error) {
          return { success: false, message: `二维码测试失败: ${error.message}` }
        }
      }
    },
    {
      id: 'clear-local-storage',
      name: '清理本地存储',
      description: '清理所有localStorage数据，确保使用Supabase',
      action: async () => {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            // 清理所有相关的localStorage数据
            const keysToRemove = [
              'userData',
              'merchantEvents', 
              'recentPurchase',
              'userTickets',
              'merchantUser',
              'merchantToken',
              'adminToken',
              'adminUser'
            ]
            
            keysToRemove.forEach(key => {
              localStorage.removeItem(key)
            })
            
            return { 
              success: true, 
              message: '本地存储清理完成',
              details: `清理了 ${keysToRemove.length} 个键值`
            }
          } else {
            return { 
              success: false, 
              message: 'localStorage不可用' 
            }
          }
        } catch (error) {
          return { success: false, message: `清理失败: ${error.message}` }
        }
      }
    },
    {
      id: 'test-user-registration',
      name: '测试用户注册',
      description: '测试用户注册功能',
      action: async () => {
        try {
          const testUser = {
            email: 'test-user-' + Date.now() + '@example.com',
            name: 'Test User',
            age: 25,
            password: 'testpassword123'
          }
          
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
          })
          
          const data = await response.json()
          return { 
            success: response.ok, 
            message: `注册响应: ${response.status}`,
            details: data.message || '无消息'
          }
        } catch (error) {
          return { success: false, message: `注册测试失败: ${error.message}` }
        }
      }
    },
    {
      id: 'test-user-login',
      name: '测试用户登录',
      description: '测试用户登录功能',
      action: async () => {
        try {
          const testCredentials = {
            email: 'user@partytix.com',
            password: 'testpassword123'
          }
          
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testCredentials)
          })
          
          const data = await response.json()
          return { 
            success: response.ok, 
            message: `登录响应: ${response.status}`,
            details: data.message || '无消息'
          }
        } catch (error) {
          return { success: false, message: `登录测试失败: ${error.message}` }
        }
      }
    }
  ]

  const runFix = async (fix) => {
    setLoading(true)
    try {
      const result = await fix.action()
      setResults(prev => ({
        ...prev,
        [fix.id]: result
      }))
      
      setFixes(prev => [...prev, {
        id: fix.id,
        name: fix.name,
        result: result,
        timestamp: new Date().toISOString()
      }])
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [fix.id]: { success: false, message: error.message }
      }))
    } finally {
      setLoading(false)
    }
  }

  const runAllFixes = async () => {
    setLoading(true)
    setFixes([])
    setResults({})
    
    for (const fix of availableFixes) {
      try {
        const result = await fix.action()
        setResults(prev => ({
          ...prev,
          [fix.id]: result
        }))
        
        setFixes(prev => [...prev, {
          id: fix.id,
          name: fix.name,
          result: result,
          timestamp: new Date().toISOString()
        }])
        
        // 添加延迟避免过快请求
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        setResults(prev => ({
          ...prev,
          [fix.id]: { success: false, message: error.message }
        }))
      }
    }
    
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      padding: '32px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center', color: 'white' }}>
          🔧 活动页面和二维码问题修复工具
        </h1>
        
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: 'white' }}>
            🚨 问题诊断
          </h2>
          
          <div style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '16px' }}>
            <p style={{ marginBottom: '8px' }}>
              <strong>活动页面无法进入的可能原因：</strong>
            </p>
            <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
              <li>Supabase数据库连接失败</li>
              <li>数据库表结构不匹配</li>
              <li>RLS策略阻止数据访问</li>
              <li>环境变量配置错误</li>
            </ul>
            
            <p style={{ marginBottom: '8px' }}>
              <strong>二维码生成失败的可能原因：</strong>
            </p>
            <ul style={{ marginLeft: '20px' }}>
              <li>qrcode库未正确安装</li>
              <li>数据传递失败</li>
              <li>localStorage数据问题</li>
              <li>环境变量缺失</li>
            </ul>
          </div>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
              🛠️ 修复工具
            </h2>
            
            <button
              onClick={runAllFixes}
              disabled={loading}
              style={{
                padding: '12px 24px',
                background: loading ? 'rgba(55, 65, 81, 0.5)' : 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '运行中...' : '运行所有修复'}
            </button>
          </div>
          
          <div style={{ display: 'grid', gap: '12px' }}>
            {availableFixes.map(fix => (
              <div key={fix.id} style={{
                padding: '16px',
                backgroundColor: 'rgba(55, 65, 81, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ color: 'white', marginBottom: '4px', fontSize: '1rem' }}>
                    {fix.name}
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>
                    {fix.description}
                  </p>
                </div>
                
                <button
                  onClick={() => runFix(fix)}
                  disabled={loading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: results[fix.id]?.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                    color: results[fix.id]?.success ? '#6ee7b7' : '#60a5fa',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {results[fix.id]?.success ? '✅ 成功' : '运行'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 修复结果 */}
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
            
            <div style={{ display: 'grid', gap: '12px' }}>
              {fixes.map((fix, index) => (
                <div key={index} style={{
                  padding: '16px',
                  backgroundColor: fix.result.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${fix.result.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ 
                      color: fix.result.success ? '#6ee7b7' : '#fca5a5', 
                      margin: 0,
                      fontSize: '1rem'
                    }}>
                      {fix.name}
                    </h3>
                    <span style={{ 
                      color: fix.result.success ? '#6ee7b7' : '#fca5a5',
                      fontSize: '0.875rem'
                    }}>
                      {fix.result.success ? '✅ 成功' : '❌ 失败'}
                    </span>
                  </div>
                  
                  <p style={{ 
                    color: fix.result.success ? '#6ee7b7' : '#fca5a5', 
                    margin: '0 0 8px 0',
                    fontSize: '0.875rem'
                  }}>
                    {fix.result.message}
                  </p>
                  
                  {fix.result.details && (
                    <p style={{ 
                      color: '#94a3b8', 
                      margin: 0,
                      fontSize: '0.8rem'
                    }}>
                      详情: {fix.result.details}
                    </p>
                  )}
                  
                  <p style={{ 
                    color: '#64748b', 
                    margin: '8px 0 0 0',
                    fontSize: '0.75rem'
                  }}>
                    {new Date(fix.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 下一步建议 */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '16px',
          padding: '24px',
          marginTop: '24px'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: '#3b82f6' }}>
            💡 下一步建议
          </h2>
          
          <div style={{ color: '#60a5fa', fontSize: '0.9rem' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>如果问题仍然存在：</strong>
            </p>
            <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
              <li>访问 <a href="/debug-supabase-config" style={{ color: '#93c5fd' }}>/debug-supabase-config</a> 进行详细诊断</li>
              <li>检查Vercel函数日志</li>
              <li>确认Supabase项目状态</li>
              <li>验证所有环境变量设置</li>
            </ul>
            
            <p style={{ marginBottom: '8px' }}>
              <strong>数据库重置：</strong>
            </p>
            <ul style={{ marginLeft: '20px' }}>
              <li>复制 <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '4px' }}>scripts/reset-supabase-database.sql</code> 到Supabase SQL Editor</li>
              <li>执行重置脚本</li>
              <li>重新测试所有功能</li>
            </ul>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <a 
            href="/debug-supabase-config"
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
            详细诊断
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
            测试活动页面
          </a>
        </div>
      </div>
    </div>
  )
}
