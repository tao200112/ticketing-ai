'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

export default function TestSuccessPage() {
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qrCodeDataURL, setQrCodeDataURL] = useState('')
  const [verificationCode, setVerificationCode] = useState('')

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
      return null
    }
  }

  useEffect(() => {
    // 创建测试票券
    const testTicket = {
      id: `test_ticket_${Date.now()}`,
      eventName: 'Test Event',
      ticketType: 'Test Ticket',
      quantity: 1,
      price: '0.00',
      purchaseDate: new Date().toLocaleDateString('en-US'),
      ticketValidityDate: new Date().toISOString().split('T')[0],
      ticketValidityStart: new Date().toISOString(),
      ticketValidityEnd: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: 'valid',
      customerEmail: 'test@example.com',
      customerName: 'Test User'
    }
    
    setTicket(testTicket)
    
    // 生成验证码
    const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    setVerificationCode(verificationCode)
    
    // 生成二维码
    generateQRCode(testTicket, verificationCode).then(qrDataURL => {
      if (qrDataURL) {
        setQrCodeDataURL(qrDataURL)
        console.log('Test QR Code generated successfully')
      } else {
        console.error('Failed to generate test QR code')
      }
    }).catch(error => {
      console.error('Test QR Code generation error:', error)
    })
    
    setLoading(false)
  }, [])

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
        <h1 style={{ color: 'white', textAlign: 'center', marginBottom: '2rem' }}>
          Test QR Code Generation
        </h1>
        
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          borderRadius: '16px',
          padding: '2rem',
          border: '1px solid rgba(124, 58, 237, 0.3)'
        }}>
          <h2 style={{ color: 'white', marginBottom: '1rem' }}>Test Ticket</h2>
          
          {/* QR Code Display */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ color: 'white', marginBottom: '1rem' }}>QR Code</h3>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '1rem',
              textAlign: 'center',
              width: '256px',
              height: '256px',
              margin: '0 auto'
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
                  fontSize: '0.875rem',
                  height: '100%'
                }}>
                  Loading QR Code...
                </div>
              )}
            </div>
          </div>
          
          {/* Verification Code */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ color: 'white', marginBottom: '1rem' }}>Verification Code</h3>
            <div style={{
              backgroundColor: 'rgba(124, 58, 237, 0.2)',
              borderRadius: '8px',
              padding: '1rem',
              border: '1px solid rgba(124, 58, 237, 0.3)',
              textAlign: 'center'
            }}>
              <span style={{ 
                color: '#7c3aed', 
                fontSize: '1.5rem', 
                fontWeight: 'bold',
                fontFamily: 'monospace'
              }}>
                {verificationCode || 'Generating...'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

