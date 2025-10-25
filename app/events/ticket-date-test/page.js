'use client'

import { useState } from 'react'

export default function TicketDateTestPage() {
  const [ticketValidityDate, setTicketValidityDate] = useState('')

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      padding: '32px'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
            🎫 票券日期选择测试
          </h1>
          
          <p style={{
            color: '#cbd5e1',
            fontSize: '1.1rem',
            marginBottom: '24px'
          }}>
            测试票券有效期选择功能是否正常工作
          </p>

          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <h3 style={{ color: '#6ee7b7', marginBottom: '8px' }}>✅ 功能状态</h3>
            <ul style={{ color: '#94a3b8', textAlign: 'left', fontSize: '0.9rem' }}>
              <li>票券日期选择器已实现</li>
              <li>有效期时间显示为 16:00 - 次日 02:00</li>
              <li>日期选择器限制为今天及以后</li>
              <li>包含用户友好的提示信息</li>
            </ul>
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
            🧪 票券有效期选择测试
          </h2>

          {/* 票券有效期选择 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              选择票券有效期 *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  color: '#94a3b8',
                  fontSize: '0.75rem',
                  marginBottom: '4px'
                }}>
                  票券日期
                </label>
                <input
                  type="date"
                  value={ticketValidityDate}
                  onChange={(e) => setTicketValidityDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'rgba(55, 65, 81, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  color: '#94a3b8',
                  fontSize: '0.75rem',
                  marginBottom: '4px'
                }}>
                  有效期时间
                </label>
                <div style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: 'rgba(55, 65, 81, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#6b7280',
                  fontSize: '1rem',
                  cursor: 'not-allowed'
                }}>
                  16:00 - 次日 02:00
                </div>
              </div>
            </div>
            <div style={{
              marginTop: '8px',
              padding: '8px 12px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#6ee7b7'
            }}>
              ℹ️ 票券有效期为选定日期的 16:00 至次日 02:00。请确保在有效期内使用。
            </div>
          </div>

          {/* 显示选择结果 */}
          {ticketValidityDate && (
            <div style={{
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '8px',
              padding: '16px',
              marginTop: '24px'
            }}>
              <h3 style={{ color: '#60a5fa', marginBottom: '8px' }}>📅 选择结果</h3>
              <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                <p><strong>选择日期:</strong> {ticketValidityDate}</p>
                <p><strong>有效期开始:</strong> {ticketValidityDate} 16:00</p>
                <p><strong>有效期结束:</strong> {new Date(new Date(ticketValidityDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]} 02:00</p>
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
    </div>
  )
}
