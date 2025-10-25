'use client'

import { useState, useEffect } from 'react'

export default function RidiculousChickenDebugPage() {
  const [eventData, setEventData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        setLoading(true)
        
        // 直接访问事件详情页面
        const response = await fetch('/api/events/ridiculous-chicken')
        
        if (response.ok) {
          const data = await response.json()
          setEventData(data)
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
          <h2 style={{ color: 'white', marginBottom: '8px' }}>正在加载...</h2>
          <p style={{ color: '#cbd5e1' }}>获取 Ridiculous Chicken 活动数据</p>
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
            🐔 Ridiculous Chicken 活动调试
          </h1>
          
          <p style={{
            color: '#cbd5e1',
            fontSize: '1.1rem',
            marginBottom: '24px'
          }}>
            检查 Ridiculous Chicken 活动的数据结构和购票功能
          </p>

          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <h3 style={{ color: '#6ee7b7', marginBottom: '8px' }}>🔍 调试目标</h3>
            <ul style={{ color: '#94a3b8', textAlign: 'left', fontSize: '0.9rem' }}>
              <li>检查活动数据是否正确加载</li>
              <li>验证票种信息是否完整</li>
              <li>确认购票日期选择功能是否显示</li>
              <li>检查数据传递到客户端组件</li>
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
            padding: '32px',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '24px'
            }}>
              📊 活动数据
            </h2>

            <div style={{ display: 'grid', gap: '20px' }}>
              {/* 基本信息 */}
              <div style={{
                padding: '20px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '12px'
              }}>
                <h3 style={{ color: '#60a5fa', marginBottom: '16px', fontSize: '1.125rem' }}>
                  📝 基本信息
                </h3>
                
                <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>ID:</strong> {eventData.id}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>标题:</strong> {eventData.title}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>描述:</strong> {eventData.description}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>开始时间:</strong> {eventData.start_time}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>结束时间:</strong> {eventData.end_time || 'N/A'}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>地点:</strong> {eventData.venue || eventData.location || 'N/A'}
                  </div>
                </div>
              </div>

              {/* 票种信息 */}
              <div style={{
                padding: '20px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '12px'
              }}>
                <h3 style={{ color: '#6ee7b7', marginBottom: '16px', fontSize: '1.125rem' }}>
                  🎫 票种信息 ({eventData.prices?.length || 0} 个)
                </h3>
                
                {eventData.prices && eventData.prices.length > 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                    {eventData.prices.map((price, index) => (
                      <div key={index} style={{ 
                        marginBottom: '12px', 
                        padding: '12px', 
                        backgroundColor: 'rgba(55, 65, 81, 0.3)', 
                        borderRadius: '8px' 
                      }}>
                        <div><strong>ID:</strong> {price.id}</div>
                        <div><strong>标签:</strong> {price.label}</div>
                        <div><strong>价格:</strong> ${(price.amount / 100).toFixed(2)}</div>
                        <div><strong>货币:</strong> {price.currency}</div>
                        <div><strong>库存:</strong> {price.inventory}</div>
                        <div><strong>限购:</strong> {price.limit_per_user} 张/人</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#fca5a5', fontSize: '0.9rem' }}>
                    没有找到票种信息
                  </div>
                )}
              </div>

              {/* 购票功能检查 */}
              <div style={{
                padding: '20px',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '12px'
              }}>
                <h3 style={{ color: '#fbbf24', marginBottom: '16px', fontSize: '1.125rem' }}>
                  🛒 购票功能检查
                </h3>
                
                <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>有票种数据:</strong> {eventData.prices && eventData.prices.length > 0 ? '✅ 是' : '❌ 否'}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>票种数量:</strong> {eventData.prices?.length || 0}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>应该显示购票区域:</strong> {eventData.prices && eventData.prices.length > 0 ? '✅ 是' : '❌ 否'}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>应该显示日期选择:</strong> {eventData.prices && eventData.prices.length > 0 ? '✅ 是' : '❌ 否'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '8px'
            }}>
              <h3 style={{ color: '#60a5fa', marginBottom: '8px' }}>💡 调试说明</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                如果票种信息完整，但购票区域不显示，可能是客户端组件渲染问题。
                如果票种信息为空，说明服务端数据获取有问题。
                点击下面的链接访问实际的活动页面进行测试。
              </p>
            </div>
          </div>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
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
