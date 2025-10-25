'use client'

import { useState } from 'react'

export default function FixProductionDataPage() {
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const createDefaultEvent = async () => {
    setLoading(true)
    setStatus('正在创建默认活动...')
    
    try {
      // 创建默认的 Ridiculous Chicken 活动
      const defaultEvent = {
        id: 'ridiculous-chicken',
        title: 'Ridiculous Chicken Night Event',
        description: 'Join us for an unforgettable night of ridiculous fun!',
        date: '2024-12-31',
        time: '20:00',
        location: 'PartyTix Venue',
        image: '/api/placeholder/400/300',
        prices: [
          {
            id: 'regular',
            name: 'Regular Ticket (21+)',
            amount_cents: 1500,
            description: 'General admission ticket'
          }
        ],
        created_at: new Date().toISOString()
      }

      // 保存到 localStorage
      const existingEvents = JSON.parse(localStorage.getItem('merchantEvents') || '[]')
      const updatedEvents = [...existingEvents, defaultEvent]
      localStorage.setItem('merchantEvents', JSON.stringify(updatedEvents))
      
      setStatus('✅ 默认活动创建成功！')
      
      // 等待一下再检查
      setTimeout(() => {
        setStatus('✅ 默认活动创建成功！现在可以访问活动了。')
      }, 1000)
      
    } catch (error) {
      setStatus(`❌ 创建失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const createTestUser = async () => {
    setLoading(true)
    setStatus('正在创建测试用户...')
    
    try {
      const testUser = {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        created_at: new Date().toISOString()
      }
      
      localStorage.setItem('userData', JSON.stringify(testUser))
      setStatus('✅ 测试用户创建成功！')
      
    } catch (error) {
      setStatus(`❌ 用户创建失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const checkData = () => {
    setLoading(true)
    setStatus('正在检查数据...')
    
    try {
      const merchantEvents = JSON.parse(localStorage.getItem('merchantEvents') || '[]')
      const userData = JSON.parse(localStorage.getItem('userData') || '{}')
      
      let statusMsg = '数据检查结果:\n'
      statusMsg += `活动数量: ${merchantEvents.length}\n`
      statusMsg += `用户数据: ${userData.id ? '已设置' : '未设置'}\n`
      
      if (merchantEvents.length > 0) {
        statusMsg += `\n活动列表:\n`
        merchantEvents.forEach((event, index) => {
          statusMsg += `${index + 1}. ${event.title} (${event.id})\n`
        })
      }
      
      setStatus(statusMsg)
      
    } catch (error) {
      setStatus(`❌ 检查失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const clearData = () => {
    setLoading(true)
    setStatus('正在清除数据...')
    
    try {
      localStorage.removeItem('merchantEvents')
      localStorage.removeItem('userData')
      setStatus('✅ 数据已清除！')
      
    } catch (error) {
      setStatus(`❌ 清除失败: ${error.message}`)
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
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(124, 58, 237, 0.3)',
        borderRadius: '16px',
        padding: '2rem'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          🔧 生产环境数据修复
        </h1>
        
        <p style={{
          color: '#94a3b8',
          marginBottom: '2rem',
          textAlign: 'center',
          lineHeight: '1.6'
        }}>
          修复部署后的活动数据问题
        </p>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <button
            onClick={checkData}
            disabled={loading}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            🔍 检查数据
          </button>
          
          <button
            onClick={createDefaultEvent}
            disabled={loading}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            🎉 创建默认活动
          </button>
          
          <button
            onClick={createTestUser}
            disabled={loading}
            style={{
              backgroundColor: '#8b5cf6',
              color: 'white',
              padding: '1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            👤 创建测试用户
          </button>
          
          <button
            onClick={clearData}
            disabled={loading}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              padding: '1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            🗑️ 清除数据
          </button>
        </div>
        
        {status && (
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(124, 58, 237, 0.2)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <h3 style={{
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              状态信息:
            </h3>
            <pre style={{
              color: '#94a3b8',
              whiteSpace: 'pre-wrap',
              fontSize: '0.875rem',
              margin: '0'
            }}>
              {status}
            </pre>
          </div>
        )}
        
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <a
            href="/events"
            style={{
              backgroundColor: '#7c3aed',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontWeight: '500',
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            查看活动列表
          </a>
          
          <a
            href="/events/ridiculous-chicken-night-event"
            style={{
              backgroundColor: 'rgba(55, 65, 81, 0.5)',
              color: '#d1d5db',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontWeight: '500',
              textDecoration: 'none',
              display: 'inline-block',
              border: '1px solid rgba(124, 58, 237, 0.2)'
            }}
          >
            测试默认活动
          </a>
        </div>
      </div>
    </div>
  )
}
