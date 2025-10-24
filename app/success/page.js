'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

export default function SuccessPage() {
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qrCodeDataURL, setQrCodeDataURL] = useState('')
  const [verificationCode, setVerificationCode] = useState('')

  useEffect(() => {
    // 从 URL 参数获取会话信息
    const urlParams = new URLSearchParams(window.location.search)
    const sessionId = urlParams.get('session_id')
    
    if (sessionId) {
      // 从localStorage获取最近的购买信息
      const recentPurchase = JSON.parse(localStorage.getItem('recentPurchase') || '{}')
      
      if (recentPurchase.eventId && recentPurchase.ticketType) {
        // 从商家事件中获取活动时间信息
        const merchantEvents = JSON.parse(localStorage.getItem('merchantEvents') || '[]')
        const event = merchantEvents.find(e => e.id === recentPurchase.eventId)
        
        // 创建票券信息
        const ticket = {
          id: `ticket_${Date.now()}`,
          eventName: recentPurchase.eventTitle || 'Event',
          ticketType: recentPurchase.ticketType,
          quantity: recentPurchase.quantity || 1,
          price: recentPurchase.totalAmount ? (recentPurchase.totalAmount / 100).toFixed(2) : '0.00',
          purchaseDate: new Date().toLocaleDateString('en-US'),
          ticketValidityDate: recentPurchase.ticketValidityDate || null, // 票券有效期日期
          ticketValidityStart: recentPurchase.ticketValidityStart || null, // 票券有效期开始时间
          ticketValidityEnd: recentPurchase.ticketValidityEnd || null, // 票券有效期结束时间
          status: 'valid',
          sessionId: sessionId,
          customerEmail: recentPurchase.customerEmail,
          customerName: recentPurchase.customerName
        }
        
        setTicket(ticket)
        
        // 生成验证码
        const verificationCode = generateVerificationCode()
        setVerificationCode(verificationCode)
        
        // 生成二维码
        generateQRCode(ticket, verificationCode).then(qrDataURL => {
          if (qrDataURL) {
            setQrCodeDataURL(qrDataURL)
          }
        })
        
        // 保存到 localStorage 以便在账户页面显示
        const existingTickets = JSON.parse(localStorage.getItem('userTickets') || '[]')
        existingTickets.push(ticket)
        localStorage.setItem('userTickets', JSON.stringify(existingTickets))
        
        // 更新商家事件统计
        updateEventStats(recentPurchase)
        
        // 清除临时购买信息
        localStorage.removeItem('recentPurchase')
      } else {
        // 如果没有购买信息，显示通用成功消息
        setTicket({
          id: `ticket_${Date.now()}`,
          eventName: 'Event',
          ticketType: 'Ticket',
          quantity: 1,
          price: '0.00',
          purchaseDate: new Date().toLocaleDateString('en-US'),
          status: 'valid',
          sessionId: sessionId
        })
      }
    }
    
    setLoading(false)
  }, [])

  const updateEventStats = (purchaseData) => {
    try {
      // 更新商家事件统计
      const merchantEvents = JSON.parse(localStorage.getItem('merchantEvents') || '[]')
      const eventIndex = merchantEvents.findIndex(e => e.id === purchaseData.eventId)
      
      if (eventIndex !== -1) {
        const event = merchantEvents[eventIndex]
        const ticketInfo = event.prices.find(p => p.name === purchaseData.ticketType)
        
        if (ticketInfo) {
          // 更新售票数量
          event.ticketsSold = (event.ticketsSold || 0) + purchaseData.quantity
          
          // 更新收入
          const ticketPrice = ticketInfo.amount_cents * purchaseData.quantity
          event.revenue = (event.revenue || 0) + ticketPrice
          
          // 更新库存
          ticketInfo.inventory = ticketInfo.inventory - purchaseData.quantity
          
          // 保存更新后的事件
          merchantEvents[eventIndex] = event
          localStorage.setItem('merchantEvents', JSON.stringify(merchantEvents))
          
          // 保存购买记录
          const purchaseRecord = {
            id: `purchase_${Date.now()}`,
            eventId: purchaseData.eventId,
            eventName: purchaseData.eventTitle,
            ticketType: purchaseData.ticketType,
            quantity: purchaseData.quantity,
            totalAmount: ticketPrice,
            customerEmail: purchaseData.customerEmail,
            customerName: purchaseData.customerName,
            purchaseDate: new Date().toISOString(),
            status: 'completed',
            orderId: `order_${Date.now()}`,
            merchantId: event.merchantId
          }
          
          const existingPurchases = JSON.parse(localStorage.getItem('purchaseRecords') || '[]')
          existingPurchases.push(purchaseRecord)
          localStorage.setItem('purchaseRecords', JSON.stringify(existingPurchases))
        }
      }
    } catch (error) {
      console.error('Error updating event stats:', error)
    }
  }

  // 生成验证码
  const generateVerificationCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

         // 生成二维码
         const generateQRCode = async (ticket, verificationCode) => {
           try {
        const qrData = {
          ticketId: ticket.id,
          verificationCode: verificationCode,
          eventName: ticket.eventName,
          ticketType: ticket.ticketType,
          purchaseDate: ticket.purchaseDate,
          ticketValidityDate: ticket.ticketValidityDate, // 票券有效期日期
          ticketValidityStart: ticket.ticketValidityStart, // 票券有效期开始时间
          ticketValidityEnd: ticket.ticketValidityEnd, // 票券有效期结束时间
          price: ticket.price,
          customerEmail: ticket.customerEmail,
          customerName: ticket.customerName
        }
      
      const qrString = JSON.stringify(qrData)
      const qrDataURL = await QRCode.toDataURL(qrString, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      return qrDataURL
    } catch (error) {
      console.error('Error generating QR code:', error)
      return null
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '3rem',
          height: '3rem',
          border: '4px solid #f3f4f6',
          borderTopColor: '#7c3aed',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Payment Not Found
          </h1>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
            We couldn't find your payment information.
          </p>
          <a
            href="/events"
            style={{
              backgroundColor: '#7c3aed',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              fontWeight: '500',
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#6d28d9'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#7c3aed'}
          >
            Browse Events
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="success-page" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      padding: '2rem 1rem'
    }}>
      <div style={{
        maxWidth: '42rem',
        margin: '0 auto'
      }}>
        {/* Success Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="success-icon" style={{
            width: '4rem',
            height: '4rem',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto'
          }}>
            <svg style={{ width: '2rem', height: '2rem', color: '#22c55e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
            Payment Successful!
          </h1>
          <p style={{ color: '#94a3b8' }}>Your ticket has been generated and saved to your account.</p>
        </div>

        {/* Ticket Display */}
        <div className="success-card" style={{
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(124, 58, 237, 0.3)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'white', marginBottom: '0.25rem' }}>
                {ticket.eventName}
              </h2>
              <p style={{ color: '#94a3b8' }}>{ticket.ticketType}</p>
            </div>
            <span style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '500',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              color: '#22c55e',
              border: '1px solid rgba(34, 197, 94, 0.2)'
            }}>
              Valid
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
              <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span style={{ fontSize: '0.875rem' }}>${ticket.price}</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
              <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span style={{ fontSize: '0.875rem' }}>{ticket.purchaseDate}</span>
            </div>
          </div>

          {/* QR Code Display */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '500', color: 'white', marginBottom: '1rem' }}>
              Entry QR Code
            </h3>
            <div style={{
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{
                width: '12rem',
                height: '12rem',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '2px solid rgba(124, 58, 237, 0.2)',
                margin: '0 auto 1rem auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem'
              }}>
                {qrCodeDataURL ? (
                  <img 
                    src={qrCodeDataURL} 
                    alt="QR Code" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain' 
                    }} 
                  />
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#6b7280',
                    fontSize: '0.875rem'
                  }}>
                    Loading QR Code...
                  </div>
                )}
              </div>
              
              {/* 验证码显示 */}
              <div style={{
                backgroundColor: 'white',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '2px solid #7c3aed',
                marginBottom: '1rem'
              }}>
                <p style={{ 
                  fontSize: '0.875rem', 
                  color: '#374151', 
                  margin: '0 0 0.25rem 0',
                  fontWeight: '500'
                }}>
                  Verification Code:
                </p>
                <p style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#7c3aed',
                  margin: '0',
                  fontFamily: 'monospace',
                  letterSpacing: '0.1em'
                }}>
                  {verificationCode || 'Generating...'}
                </p>
              </div>
              
              <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                Show this QR code and verification code at the event entrance
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <a
              href="/account"
              style={{
                backgroundColor: '#7c3aed',
                color: 'white',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontWeight: '500',
                textAlign: 'center',
                textDecoration: 'none',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#6d28d9'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#7c3aed'}
            >
              View All Tickets
            </a>
            <button style={{
              backgroundColor: 'rgba(55, 65, 81, 0.5)',
              color: '#d1d5db',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontWeight: '500',
              border: '1px solid rgba(124, 58, 237, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.7)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.5)'}
            >
              Download PDF
            </button>
          </div>
        </div>

        {/* Additional Information */}
        <div style={{
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '500', color: '#3b82f6', marginBottom: '0.5rem' }}>
            Important Information
          </h3>
          <ul style={{ fontSize: '0.875rem', color: '#60a5fa', listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '0.25rem' }}>• Your ticket has been saved to your account</li>
            <li style={{ marginBottom: '0.25rem' }}>• Bring a valid ID to the event for age verification</li>
            <li style={{ marginBottom: '0.25rem' }}>• The QR code is valid for entry at the venue</li>
            <li style={{ marginBottom: '0.25rem' }}>• Keep this ticket safe for event entry</li>
          </ul>
        </div>

        {/* Navigation */}
        <div style={{ textAlign: 'center' }}>
          <a
            href="/events"
            style={{
              color: '#7c3aed',
              fontWeight: '500',
              textDecoration: 'none',
              transition: 'color 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.color = '#6d28d9'}
            onMouseLeave={(e) => e.target.style.color = '#7c3aed'}
          >
            ← Back to Events
          </a>
        </div>
      </div>
    </div>
  )
}