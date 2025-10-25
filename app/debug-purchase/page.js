'use client'

import { useState, useEffect } from 'react'

export default function DebugPurchasePage() {
  const [purchaseData, setPurchaseData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 检查 localStorage 中的购买数据
    const recentPurchase = JSON.parse(localStorage.getItem('recentPurchase') || '{}')
    const userTickets = JSON.parse(localStorage.getItem('userTickets') || '[]')
    const userData = JSON.parse(localStorage.getItem('userData') || '{}')
    
    setPurchaseData({
      recentPurchase,
      userTickets,
      userData,
      timestamp: new Date().toISOString()
    })
    
    setLoading(false)
  }, [])

  const clearPurchaseData = () => {
    localStorage.removeItem('recentPurchase')
    localStorage.removeItem('userTickets')
    setPurchaseData({
      recentPurchase: {},
      userTickets: [],
      userData: JSON.parse(localStorage.getItem('userData') || '{}'),
      timestamp: new Date().toISOString()
    })
  }

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
          <h2 style={{ color: 'white', marginBottom: '8px' }}>正在检查数据...</h2>
          <p style={{ color: '#cbd5e1' }}>分析购买信息存储</p>
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
            🔍 购买数据调试
          </h1>
          
          <p style={{
            color: '#cbd5e1',
            fontSize: '1.1rem',
            marginBottom: '24px'
          }}>
            检查 localStorage 中的购买信息和数据传递
          </p>

          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <h3 style={{ color: '#6ee7b7', marginBottom: '8px' }}>🔧 调试目标</h3>
            <ul style={{ color: '#94a3b8', textAlign: 'left', fontSize: '0.9rem' }}>
              <li>检查 recentPurchase 数据是否正确保存</li>
              <li>验证价格信息 (totalAmount) 是否正确</li>
              <li>确认客户信息 (customerName, customerEmail) 是否完整</li>
              <li>检查票券有效期信息是否正确</li>
            </ul>
          </div>

          <button
            onClick={clearPurchaseData}
            style={{
              padding: '12px 24px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            清除购买数据
          </button>
        </div>

        {purchaseData && (
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
              📊 数据状态
            </h2>

            <div style={{ display: 'grid', gap: '24px' }}>
              {/* Recent Purchase Data */}
              <div style={{
                padding: '20px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '12px'
              }}>
                <h3 style={{ color: '#60a5fa', marginBottom: '16px', fontSize: '1.125rem' }}>
                  🛒 Recent Purchase Data
                </h3>
                
                {Object.keys(purchaseData.recentPurchase).length > 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Event ID:</strong> {purchaseData.recentPurchase.eventId || 'N/A'}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Event Title:</strong> {purchaseData.recentPurchase.eventTitle || 'N/A'}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Ticket Type:</strong> {purchaseData.recentPurchase.ticketType || 'N/A'}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Quantity:</strong> {purchaseData.recentPurchase.quantity || 'N/A'}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Total Amount (cents):</strong> {purchaseData.recentPurchase.totalAmount || 'N/A'}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Price (calculated):</strong> ${purchaseData.recentPurchase.totalAmount ? (purchaseData.recentPurchase.totalAmount / 100).toFixed(2) : 'N/A'}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Customer Name:</strong> {purchaseData.recentPurchase.customerName || 'N/A'}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Customer Email:</strong> {purchaseData.recentPurchase.customerEmail || 'N/A'}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Ticket Validity Date:</strong> {purchaseData.recentPurchase.ticketValidityDate || 'N/A'}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#fca5a5', fontSize: '0.9rem' }}>
                    没有找到 recentPurchase 数据
                  </div>
                )}
              </div>

              {/* User Tickets */}
              <div style={{
                padding: '20px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '12px'
              }}>
                <h3 style={{ color: '#6ee7b7', marginBottom: '16px', fontSize: '1.125rem' }}>
                  🎫 User Tickets ({purchaseData.userTickets.length})
                </h3>
                
                {purchaseData.userTickets.length > 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                    {purchaseData.userTickets.map((ticket, index) => (
                      <div key={index} style={{ marginBottom: '12px', padding: '12px', backgroundColor: 'rgba(55, 65, 81, 0.3)', borderRadius: '8px' }}>
                        <div><strong>Ticket ID:</strong> {ticket.id}</div>
                        <div><strong>Event:</strong> {ticket.eventName}</div>
                        <div><strong>Type:</strong> {ticket.ticketType}</div>
                        <div><strong>Price:</strong> ${ticket.price}</div>
                        <div><strong>Customer:</strong> {ticket.customerName}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#fca5a5', fontSize: '0.9rem' }}>
                    没有找到用户票券数据
                  </div>
                )}
              </div>

              {/* User Data */}
              <div style={{
                padding: '20px',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '12px'
              }}>
                <h3 style={{ color: '#fbbf24', marginBottom: '16px', fontSize: '1.125rem' }}>
                  👤 User Data
                </h3>
                
                <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Name:</strong> {purchaseData.userData.name || 'N/A'}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Email:</strong> {purchaseData.userData.email || 'N/A'}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Logged In:</strong> {purchaseData.userData.isLoggedIn ? 'Yes' : 'No'}
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
                如果 recentPurchase 数据为空，说明购买信息没有正确保存。
                如果 totalAmount 为 0 或 undefined，说明价格计算有问题。
                如果 customerName 为空，说明客户信息没有正确传递。
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
