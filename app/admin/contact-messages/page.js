'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NavbarPartyTix from '@/components/NavbarPartyTix'

export default function AdminContactMessages() {
  const router = useRouter()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [filter, setFilter] = useState('all') // all, pending, read, replied

  useEffect(() => {
    // Check admin login
    const adminToken = localStorage.getItem('adminToken')
    if (!adminToken) {
      router.push('/admin/login')
      return
    }

    loadMessages()
  }, [router])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/contact-messages')
      
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateMessageStatus = async (id, status) => {
    try {
      const response = await fetch('/api/admin/contact-messages', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status })
      })

      if (response.ok) {
        loadMessages() // Reload messages
        if (selectedMessage && selectedMessage.id === id) {
          setSelectedMessage({ ...selectedMessage, status })
        }
      }
    } catch (error) {
      console.error('Error updating message status:', error)
    }
  }

  const filteredMessages = messages.filter(msg => {
    if (filter === 'all') return true
    return msg.status === filter
  })

  const pendingCount = messages.filter(m => m.status === 'pending').length

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      paddingTop: '80px',
      paddingBottom: '40px'
    }}>
      <NavbarPartyTix />
      
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '30px'
        }}>
          联系表单消息
        </h1>

        {/* 过滤按钮 */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          {['all', 'pending', 'read', 'replied'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: filter === status ? '#7c3aed' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                cursor: 'pointer',
                fontWeight: filter === status ? 'bold' : 'normal'
              }}
            >
              {status === 'all' ? '全部' : status === 'pending' ? `待处理 (${pendingCount})` : status === 'read' ? '已读' : '已回复'}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* 消息列表 */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '12px',
            padding: '20px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p>加载中...</p>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p>暂无消息</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredMessages.map(message => (
                  <div
                    key={message.id}
                    onClick={() => setSelectedMessage(message)}
                    style={{
                      padding: '15px',
                      borderRadius: '8px',
                      border: selectedMessage?.id === message.id ? '2px solid #7c3aed' : '1px solid #ddd',
                      backgroundColor: message.status === 'pending' ? '#fef3c7' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                        {message.first_name} {message.last_name}
                      </h3>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: message.status === 'pending' ? '#fbbf24' : message.status === 'read' ? '#3b82f6' : '#10b981',
                        color: 'white'
                      }}>
                        {message.status === 'pending' ? '待处理' : message.status === 'read' ? '已读' : '已回复'}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0', color: '#666', fontSize: '14px' }}>{message.email}</p>
                    <p style={{ margin: '4px 0', color: '#999', fontSize: '12px' }}>
                      {new Date(message.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 消息详情 */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '12px',
            padding: '20px'
          }}>
            {selectedMessage ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0 }}>消息详情</h2>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => updateMessageStatus(selectedMessage.id, 'read')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #3b82f6',
                        backgroundColor: 'white',
                        color: '#3b82f6',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      标记为已读
                    </button>
                    <button
                      onClick={() => updateMessageStatus(selectedMessage.id, 'replied')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#10b981',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      标记为已回复
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <strong>姓名:</strong> {selectedMessage.first_name} {selectedMessage.last_name}
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <strong>邮箱:</strong> {selectedMessage.email}
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <strong>电话:</strong> {selectedMessage.phone}
                </div>
                {selectedMessage.address && (
                  <div style={{ marginBottom: '15px' }}>
                    <strong>地址:</strong> {selectedMessage.address}
                  </div>
                )}
                {(selectedMessage.city || selectedMessage.state || selectedMessage.zip) && (
                  <div style={{ marginBottom: '15px' }}>
                    <strong>城市/州/邮编:</strong> {selectedMessage.city || ''} {selectedMessage.state || ''} {selectedMessage.zip || ''}
                  </div>
                )}
                <div style={{ marginBottom: '15px' }}>
                  <strong>消息:</strong>
                  <div style={{
                    marginTop: '8px',
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedMessage.message}
                  </div>
                </div>
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ddd', fontSize: '12px', color: '#666' }}>
                  <div>提交时间: {new Date(selectedMessage.created_at).toLocaleString('zh-CN')}</div>
                  {selectedMessage.updated_at && (
                    <div>更新时间: {new Date(selectedMessage.updated_at).toLocaleString('zh-CN')}</div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                选择一个消息查看详情
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
