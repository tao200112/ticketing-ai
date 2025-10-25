'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function RidiculousChickenTestPage() {
  const [eventData, setEventData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        setLoading(true)
        
        // 测试不同的 Ridiculous Chicken 事件 ID
        const testIds = [
          'ridiculous-chicken',
          'ridiculous-chicken-night-event',
          'default-aa-1761363423786'
        ]
        
        const results = []
        
        for (const id of testIds) {
          try {
            const response = await fetch(`/api/events/${id}`)
            if (response.ok) {
              const data = await response.json()
              results.push({
                id,
                success: true,
                data: data,
                hasStartTime: !!data.start_time,
                hasEndTime: !!data.end_time,
                startTime: data.start_time,
                endTime: data.end_time,
                hasPrices: data.prices && data.prices.length > 0,
                priceCount: data.prices ? data.prices.length : 0
              })
            } else {
              results.push({
                id,
                success: false,
                error: `HTTP ${response.status}`,
                hasStartTime: false,
                hasEndTime: false,
                hasPrices: false,
                priceCount: 0
              })
            }
          } catch (err) {
            results.push({
              id,
              success: false,
              error: err.message,
              hasStartTime: false,
              hasEndTime: false,
              hasPrices: false,
              priceCount: 0
            })
          }
        }
        
        setEventData(results)
      } catch (error) {
        setError(error.message)
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
          <p style={{ color: '#cbd5e1' }}>检查 Ridiculous Chicken 活动数据</p>
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
            🐔 Ridiculous Chicken 活动测试
          </h1>
          
          <p style={{
            color: '#cbd5e1',
            fontSize: '1.1rem',
            marginBottom: '24px'
          }}>
            测试不同格式的 Ridiculous Chicken 活动 ID 和日期显示
          </p>

          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <h3 style={{ color: '#6ee7b7', marginBottom: '8px' }}>🔍 测试目标</h3>
            <ul style={{ color: '#94a3b8', textAlign: 'left', fontSize: '0.9rem' }}>
              <li>验证 Ridiculous Chicken 活动数据是否正确加载</li>
              <li>检查活动时间信息是否完整</li>
              <li>确认票种信息是否正确</li>
              <li>测试不同 ID 格式的兼容性</li>
            </ul>
          </div>
        </div>

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
              {eventData.map((result, index) => (
                <div key={index} style={{
                  padding: '20px',
                  backgroundColor: result.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: result.success ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '12px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <h3 style={{
                      color: result.success ? '#6ee7b7' : '#ef4444',
                      margin: 0,
                      fontSize: '1.125rem'
                    }}>
                      {result.id}
                    </h3>
                    <div style={{
                      color: result.success ? '#6ee7b7' : '#ef4444',
                      fontSize: '1.5rem'
                    }}>
                      {result.success ? '✅' : '❌'}
                    </div>
                  </div>

                  {result.success ? (
                    <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <strong>活动标题:</strong> {result.data.title}
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <strong>开始时间:</strong> {result.hasStartTime ? result.startTime : '❌ 缺失'}
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <strong>结束时间:</strong> {result.hasEndTime ? result.endTime : '❌ 缺失'}
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <strong>票种数量:</strong> {result.priceCount} 个
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <strong>地点:</strong> {result.data.venue || result.data.location || '未设置'}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#fca5a5', fontSize: '0.9rem' }}>
                      <strong>错误:</strong> {result.error}
                    </div>
                  )}

                  {result.success && (
                    <div style={{ marginTop: '12px' }}>
                      <Link
                        href={`/events/${result.id}`}
                        style={{
                          display: 'inline-block',
                          padding: '8px 16px',
                          backgroundColor: '#7c3aed',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontWeight: '500'
                        }}
                      >
                        查看活动详情
                      </Link>
                    </div>
                  )}
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
                如果所有测试都显示 ✅，说明 Ridiculous Chicken 活动数据正常。
                如果显示 ❌，说明该 ID 格式不被支持或数据有问题。
                点击"查看活动详情"可以访问实际的活动页面。
              </p>
            </div>
          </div>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Link 
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
          </Link>
        </div>
      </div>
    </div>
  )
}
