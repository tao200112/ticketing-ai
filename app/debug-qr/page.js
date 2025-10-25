'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

export default function DebugQRPage() {
  const [qrCodeDataURL, setQrCodeDataURL] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [testData, setTestData] = useState({
    ticketId: 'test_ticket_123',
    eventName: 'Test Event',
    ticketType: 'General Admission',
    price: '15.00',
    customerName: 'Test Customer',
    customerEmail: 'test@example.com'
  })

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
      console.log('QR data string:', qrString)

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

  const testQRGeneration = async () => {
    setLoading(true)
    setError(null)
    setQrCodeDataURL('')

    try {
      const verificationCode = generateVerificationCode()
      console.log('Generated verification code:', verificationCode)

      const ticket = {
        id: testData.ticketId,
        eventName: testData.eventName,
        ticketType: testData.ticketType,
        price: testData.price,
        customerName: testData.customerName,
        customerEmail: testData.customerEmail,
        purchaseDate: new Date().toLocaleDateString('en-US'),
        ticketValidityDate: new Date().toISOString().split('T')[0],
        ticketValidityStart: new Date().toISOString(),
        ticketValidityEnd: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }

      console.log('Test ticket data:', ticket)

      const qrDataURL = await generateQRCode(ticket, verificationCode)
      
      if (qrDataURL) {
        setQrCodeDataURL(qrDataURL)
        console.log('QR Code generated successfully')
      } else {
        setError('Failed to generate QR code')
        console.error('QR code generation returned null')
      }
    } catch (err) {
      setError(err.message)
      console.error('QR generation error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      padding: '32px',
      color: 'white'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center' }}>
          QR Code Generation Debug
        </h1>
        
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Test Data
          </h2>
          
          <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Ticket ID:
              </label>
              <input
                type="text"
                value={testData.ticketId}
                onChange={(e) => setTestData({...testData, ticketId: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #374151',
                  backgroundColor: 'rgba(55, 65, 81, 0.5)',
                  color: 'white'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Event Name:
              </label>
              <input
                type="text"
                value={testData.eventName}
                onChange={(e) => setTestData({...testData, eventName: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #374151',
                  backgroundColor: 'rgba(55, 65, 81, 0.5)',
                  color: 'white'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Ticket Type:
              </label>
              <input
                type="text"
                value={testData.ticketType}
                onChange={(e) => setTestData({...testData, ticketType: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #374151',
                  backgroundColor: 'rgba(55, 65, 81, 0.5)',
                  color: 'white'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Customer Name:
              </label>
              <input
                type="text"
                value={testData.customerName}
                onChange={(e) => setTestData({...testData, customerName: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #374151',
                  backgroundColor: 'rgba(55, 65, 81, 0.5)',
                  color: 'white'
                }}
              />
            </div>
          </div>
          
          <button
            onClick={testQRGeneration}
            disabled={loading}
            style={{
              backgroundColor: loading ? '#6b7280' : '#7c3aed',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1rem'
            }}
          >
            {loading ? 'Generating...' : 'Generate QR Code'}
          </button>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: '#fca5a5'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {qrCodeDataURL && (
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            borderRadius: '16px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Generated QR Code
            </h2>
            
            <div style={{
              width: '256px',
              height: '256px',
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '2px solid rgba(124, 58, 237, 0.2)',
              margin: '0 auto 1rem auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.5rem'
            }}>
              <img
                src={qrCodeDataURL}
                alt="QR Code"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            </div>
            
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
              QR Code generated successfully! Check the browser console for detailed logs.
            </p>
          </div>
        )}

        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          borderRadius: '16px',
          padding: '2rem',
          marginTop: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Debug Information
          </h2>
          <p style={{ color: '#cbd5e1', marginBottom: '1rem' }}>
            This page helps debug QR code generation issues. Check the browser console for detailed logs.
          </p>
          <ul style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
            <li>QR code generation uses the 'qrcode' library</li>
            <li>Data is JSON stringified before encoding</li>
            <li>Error correction level is set to 'M' (Medium)</li>
            <li>QR code size is 256x256 pixels</li>
            <li>Check console for generation logs</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
