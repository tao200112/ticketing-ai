'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

export default function SuccessPage() {
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qrCodeDataURL, setQrCodeDataURL] = useState('')
  const [verificationCode, setVerificationCode] = useState('')

  // 生成验证码函数
  const generateVerificationCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  // 生成二维码函数
  const generateQRCode = async (ticket, verificationCode) => {
    try {
      console.log('Generating QR code for ticket:', ticket.id)
      
      const qrData = {
        ticketId: ticket.id,
        verificationCode: verificationCode,
        eventName: ticket.eventName,
        ticketType: ticket.ticketType,
        purchaseDate: ticket.purchaseDate,
        ticketValidityDate: ticket.ticketValidityDate,
        ticketValidityStart: ticket.ticketValidityStart,
        ticketValidityEnd: ticket.ticketValidityEnd,
        price: ticket.price,
        customerEmail: ticket.customerEmail,
        customerName: ticket.customerName
      }
    
      const qrString = JSON.stringify(qrData)
      console.log('QR data string length:', qrString.length)
      
      const qrDataURL = await QRCode.toDataURL(qrString, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      })
      
      console.log('QR code generated successfully, length:', qrDataURL.length)
      return qrDataURL
    } catch (error) {
      console.error('Error generating QR code:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        ticket: ticket,
        verificationCode: verificationCode
      })
      return null
    }
  }

  useEffect(() => {
    // 从 URL 参数获取会话信息
    const urlParams = new URLSearchParams(window.location.search)
    const sessionId = urlParams.get('session_id')
    
    if (sessionId) {
      // 检查是否是演示模式
      const isDemoMode = sessionId.startsWith('demo_session_')
      
      if (isDemoMode) {
        console.log('Demo mode detected, creating demo ticket')
        // 创建演示票券
        const demoTicket = {
          id: `demo_ticket_${Date.now()}`,
          eventName: 'Demo Event',
          ticketType: 'Demo Ticket',
          quantity: 1,
          price: '0.00',
          purchaseDate: new Date().toLocaleDateString('en-US'),
          ticketValidityDate: new Date().toISOString().split('T')[0],
          ticketValidityStart: new Date().toISOString(),
          ticketValidityEnd: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: 'valid',
          sessionId: sessionId,
          customerEmail: 'demo@example.com',
          customerName: 'Demo User'
        }
        
        setTicket(demoTicket)
        
        // 生成验证码
        const verificationCode = generateVerificationCode()
        setVerificationCode(verificationCode)
        
        // 生成二维码
        generateQRCode(demoTicket, verificationCode).then(qrDataURL => {
          if (qrDataURL) {
            setQrCodeDataURL(qrDataURL)
            console.log('Demo QR Code generated successfully')
          } else {
            console.error('Failed to generate demo QR code')
            // 设置一个默认的二维码占位符
            setQrCodeDataURL('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgdmlld0JveD0iMCAwIDI1NiAyNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjEyOCIgeT0iMTI4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2QjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIFFSIGNvZGUgYXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4=')
          }
        }).catch(error => {
          console.error('Demo QR Code generation error:', error)
          // 设置一个默认的二维码占位符
          setQrCodeDataURL('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgdmlld0JveD0iMCAwIDI1NiAyNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjEyOCIgeT0iMTI4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2QjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIFFSIGNvZGUgYXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4=')
        })
        
        setLoading(false)
        return
      }
      
      // 从localStorage获取最近的购买信息
      const recentPurchase = JSON.parse(localStorage.getItem('recentPurchase') || '{}')
      
      if (recentPurchase.eventId && recentPurchase.ticketType) {
        console.log('Found recent purchase data:', recentPurchase)
        
        // 创建票券对象
        const ticket = {
          id: `ticket_${Date.now()}`,
          eventName: recentPurchase.eventTitle || 'Event',
          ticketType: recentPurchase.ticketType,
          quantity: recentPurchase.quantity || 1,
          price: recentPurchase.price || '0.00',
          purchaseDate: new Date().toLocaleDateString('en-US'),
          ticketValidityDate: new Date().toISOString().split('T')[0],
          ticketValidityStart: new Date().toISOString(),
          ticketValidityEnd: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: 'valid',
          sessionId: sessionId,
          customerEmail: recentPurchase.customerEmail || 'customer@example.com',
          customerName: recentPurchase.customerName || 'Customer'
        }
        
        setTicket(ticket)
        
        // 生成验证码
        const verificationCode = generateVerificationCode()
        setVerificationCode(verificationCode)
        
        // 生成二维码
        generateQRCode(ticket, verificationCode).then(qrDataURL => {
          if (qrDataURL) {
            setQrCodeDataURL(qrDataURL)
            console.log('QR Code generated successfully')
          } else {
            console.error('Failed to generate QR code')
            // 设置一个默认的二维码占位符
            setQrCodeDataURL('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgdmlld0JveD0iMCAwIDI1NiAyNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjEyOCIgeT0iMTI4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2QjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIFFSIGNvZGUgYXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4=')
          }
        }).catch(error => {
          console.error('QR Code generation error:', error)
          // 设置一个默认的二维码占位符
          setQrCodeDataURL('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgdmlld0JveD0iMCAwIDI1NiAyNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjEyOCIgeT0iMTI4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2QjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIFFSIGNvZGUgYXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4=')
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
          // 更新票务统计
          if (!ticketInfo.sold) ticketInfo.sold = 0
          ticketInfo.sold += purchaseData.quantity || 1
          
          // 更新总收入
          if (!event.totalRevenue) event.totalRevenue = 0
          event.totalRevenue += (ticketInfo.amount_cents / 100) * (purchaseData.quantity || 1)
          
          // 保存更新后的事件
          merchantEvents[eventIndex] = event
          localStorage.setItem('merchantEvents', JSON.stringify(merchantEvents))
          
          console.log('Event stats updated:', {
            eventId: purchaseData.eventId,
            ticketType: purchaseData.ticketType,
            sold: ticketInfo.sold,
            totalRevenue: event.totalRevenue
          })
        }
      }
    } catch (error) {
      console.error('Error updating event stats:', error)
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
        <div style={{ color: 'white', fontSize: '1.5rem' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Success Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: '#10b981',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto'
          }}>
            <span style={{ color: 'white', fontSize: '2rem' }}>✓</span>
          </div>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            color: 'white', 
            marginBottom: '0.5rem' 
          }}>
            Payment Successful!
          </h1>
          <p style={{ 
            fontSize: '1.125rem', 
            color: '#94a3b8',
            margin: 0 
          }}>
            Your ticket has been generated and saved to your account.
          </p>
        </div>

        {/* Ticket Card */}
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          borderRadius: '16px',
          padding: '2rem',
          border: '1px solid rgba(124, 58, 237, 0.3)',
          marginBottom: '2rem'
        }}>
          {/* Ticket Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            marginBottom: '1.5rem'
          }}>
            <div>
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                color: 'white', 
                margin: '0 0 0.25rem 0' 
              }}>
                {ticket?.eventName || 'Event'}
              </h2>
              <p style={{ 
                fontSize: '1rem', 
                color: '#94a3b8', 
                margin: 0 
              }}>
                {ticket?.ticketType || 'Ticket'}
              </p>
            </div>
            <div style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              Valid
            </div>
          </div>

          {/* Ticket Details */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1.5rem',
            padding: '1rem',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(59, 130, 246, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                color: '#3b82f6' 
              }}>
                ${ticket?.price || '0.00'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', color: '#60a5fa' }}>
              <span style={{ marginRight: '0.5rem' }}>📅</span>
              <span>{ticket?.ticketValidityDate || new Date().toISOString().split('T')[0]}</span>
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
              
              {/* Verification Code */}
              <div style={{
                backgroundColor: 'rgba(124, 58, 237, 0.2)',
                borderRadius: '8px',
                padding: '1rem',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                marginBottom: '1rem'
              }}>
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: '#a78bfa', 
                  marginBottom: '0.5rem' 
                }}>
                  Verification Code:
                </div>
                <div style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: 'bold', 
                  color: '#7c3aed',
                  fontFamily: 'monospace'
                }}>
                  {verificationCode || 'Generating...'}
                </div>
              </div>
              
              <p style={{ 
                fontSize: '0.875rem', 
                color: '#94a3b8', 
                margin: 0 
              }}>
                Show this QR code and verification code at the event entrance
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button style={{
            flex: 1,
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.3s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#6d28d9'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#7c3aed'}
          onClick={() => window.location.href = '/account'}>
            View All Tickets
          </button>
          
          <button style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            color: '#94a3b8',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            borderRadius: '8px',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'rgba(15, 23, 42, 1)'
            e.target.style.color = 'white'
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'rgba(15, 23, 42, 0.8)'
            e.target.style.color = '#94a3b8'
          }}>
            Download PDF
          </button>
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
