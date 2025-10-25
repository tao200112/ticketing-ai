'use client'

import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'

// 4 种 UI 状态
const UI_STATES = {
  LOADING: 'loading',      // "Generating QR Code..."
  SUCCESS: 'success',      // 显示票据和二维码
  TIMEOUT: 'timeout',      // "Taking longer than usual. Please retry."
  ERROR: 'error'           // "Failed to load tickets."
}

export default function SuccessPage() {
  const [uiState, setUiState] = useState(UI_STATES.LOADING)
  const [order, setOrder] = useState(null)
  const [tickets, setTickets] = useState([])
  const [retryCount, setRetryCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  
  const abortControllerRef = useRef(null)
  const timeoutRef = useRef(null)

  // 获取 session_id 从 URL
  const getSessionId = () => {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('session_id')
  }

  // 获取订单和票据数据（带超时和重试）
  const fetchOrderData = async (sessionId, attempt = 1) => {
    const maxRetries = 3
    const timeoutMs = 30000 // 30秒超时
    
    console.log(`[SuccessPage] Fetching order data, attempt ${attempt}/${maxRetries}`)
    
    // 创建 AbortController
    abortControllerRef.current = new AbortController()
    
    // 设置超时
    timeoutRef.current = setTimeout(() => {
      console.log(`[SuccessPage] Request timeout after ${timeoutMs}ms`)
      abortControllerRef.current?.abort()
    }, timeoutMs)
    
    try {
      const response = await fetch(`/api/orders/by-session?session_id=${sessionId}`, {
        signal: abortControllerRef.current.signal
      })
      
      clearTimeout(timeoutRef.current)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.ok) {
        throw new Error(data.message || 'Failed to load order data')
      }
      
      console.log(`[SuccessPage] Successfully loaded order data:`, {
        orderId: data.order.id,
        ticketCount: data.tickets.length,
        attempt
      })
      
      return data
      
    } catch (error) {
      clearTimeout(timeoutRef.current)
      
      if (error.name === 'AbortError') {
        console.log(`[SuccessPage] Request aborted (timeout)`)
        throw new Error('Request timeout')
      }
      
      console.error(`[SuccessPage] Fetch error (attempt ${attempt}):`, error.message)
      
      if (attempt < maxRetries) {
        // 退避重试：5s, 10s, 15s
        const delay = attempt * 5000
        console.log(`[SuccessPage] Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return fetchOrderData(sessionId, attempt + 1)
      }
      
      throw error
    }
  }

  // 生成二维码（从服务端 qr_payload）
  const generateQRCodeFromPayload = async (qrPayload) => {
    try {
      console.log('[SuccessPage] Generating QR code from payload')
      
      const qrDataURL = await QRCode.toDataURL(qrPayload, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      })
      
      console.log('[SuccessPage] QR code generated successfully')
      return qrDataURL
    } catch (error) {
      console.error('[SuccessPage] QR code generation error:', error)
      return null
    }
  }

  // 重试函数
  const handleRetry = async () => {
    const sessionId = getSessionId()
    if (!sessionId) {
      setUiState(UI_STATES.ERROR)
      setErrorMessage('No session ID found in URL')
      return
    }
    
    setUiState(UI_STATES.LOADING)
    setRetryCount(prev => prev + 1)
    
    try {
      const data = await fetchOrderData(sessionId)
      
      // 为每个票据生成二维码
      const ticketsWithQR = await Promise.all(
        data.tickets.map(async (ticket) => {
          const qrDataURL = await generateQRCodeFromPayload(ticket.qrPayload)
          return { ...ticket, qrDataURL }
        })
      )
      
      setOrder(data.order)
      setTickets(ticketsWithQR)
      setUiState(UI_STATES.SUCCESS)
      
          } catch (error) {
      console.error('[SuccessPage] Retry failed:', error)
      setUiState(UI_STATES.ERROR)
      setErrorMessage(error.message)
    }
  }

  // 主加载逻辑
  useEffect(() => {
    const loadData = async () => {
      const sessionId = getSessionId()
      
      if (!sessionId) {
        console.error('[SuccessPage] No session_id in URL')
        setUiState(UI_STATES.ERROR)
        setErrorMessage('No session ID found in URL')
        return
      }
      
      try {
        const data = await fetchOrderData(sessionId)
        
        // 为每个票据生成二维码
        const ticketsWithQR = await Promise.all(
          data.tickets.map(async (ticket) => {
            const qrDataURL = await generateQRCodeFromPayload(ticket.qrPayload)
            return { ...ticket, qrDataURL }
          })
        )
        
        setOrder(data.order)
        setTickets(ticketsWithQR)
        setUiState(UI_STATES.SUCCESS)
        
      } catch (error) {
        console.error('[SuccessPage] Load failed:', error)
        
        if (error.message.includes('timeout')) {
          setUiState(UI_STATES.TIMEOUT)
            } else {
          setUiState(UI_STATES.ERROR)
          setErrorMessage(error.message)
        }
      }
    }
    
    loadData()
    
    // 清理函数
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // 渲染加载状态
  const renderLoading = () => (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column'
    }}>
      <div style={{
        width: '60px',
        height: '60px',
        border: '4px solid rgba(124, 58, 237, 0.3)',
        borderTop: '4px solid #7c3aed',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '1rem'
      }} />
      <div style={{ color: 'white', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
        Generating QR Code...
      </div>
      <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
        Please wait while we prepare your tickets
      </div>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )

  // 渲染超时状态
  const renderTimeout = () => (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      padding: '2rem'
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        backgroundColor: '#f59e0b',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.5rem'
      }}>
        <span style={{ color: 'white', fontSize: '2rem' }}>⏱️</span>
      </div>
      <h1 style={{ 
        fontSize: '2rem', 
        fontWeight: 'bold', 
        color: 'white', 
        marginBottom: '0.5rem',
        textAlign: 'center'
      }}>
        Taking longer than usual
      </h1>
      <p style={{ 
        fontSize: '1rem', 
        color: '#94a3b8',
        marginBottom: '2rem',
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        We're experiencing some delays. Please try again or contact support if the issue persists.
      </p>
      <button
        onClick={handleRetry}
        style={{
          backgroundColor: '#7c3aed',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '0.75rem 2rem',
          fontSize: '1rem',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'background-color 0.3s'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#6d28d9'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#7c3aed'}
      >
        Retry ({retryCount}/3)
      </button>
    </div>
  )

  // 渲染错误状态
  const renderError = () => (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      padding: '2rem'
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        backgroundColor: '#ef4444',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.5rem'
      }}>
        <span style={{ color: 'white', fontSize: '2rem' }}>❌</span>
      </div>
      <h1 style={{ 
        fontSize: '2rem', 
        fontWeight: 'bold', 
        color: 'white', 
        marginBottom: '0.5rem',
        textAlign: 'center'
      }}>
        Failed to load tickets
      </h1>
      <p style={{ 
        fontSize: '1rem', 
        color: '#94a3b8',
        marginBottom: '2rem',
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        {errorMessage || 'Something went wrong while loading your tickets.'}
      </p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={handleRetry}
          style={{
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem 2rem',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.3s'
          }}
        >
          Try Again
        </button>
        <a
          href="mailto:support@partytix.com"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            color: '#94a3b8',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            borderRadius: '8px',
            padding: '0.75rem 2rem',
            fontSize: '1rem',
            fontWeight: '500',
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
        >
          Contact Support
        </a>
      </div>
      </div>
    )

  // 渲染成功状态
  const renderSuccess = () => (
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
            Your {tickets.length} ticket{tickets.length > 1 ? 's have' : ' has'} been generated and saved to your account.
          </p>
        </div>

        {/* Tickets List */}
        {tickets.map((ticket, index) => (
          <div key={ticket.id} style={{
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
                  Ticket #{index + 1}
              </h2>
              <p style={{ 
                fontSize: '1rem', 
                color: '#94a3b8', 
                margin: 0 
              }}>
                  {ticket.tier}
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
                {ticket.status === 'unused' ? 'Valid' : 'Used'}
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
                  {ticket.qrDataURL ? (
                  <img 
                      src={ticket.qrDataURL} 
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
              
                <p style={{ 
                  fontSize: '0.875rem', 
                  color: '#94a3b8', 
                  margin: 0 
                }}>
                  Show this QR code at the event entrance
                </p>
              </div>
            </div>
          </div>
        ))}

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

  // 主渲染逻辑
  switch (uiState) {
    case UI_STATES.LOADING:
      return renderLoading()
    case UI_STATES.SUCCESS:
      return renderSuccess()
    case UI_STATES.TIMEOUT:
      return renderTimeout()
    case UI_STATES.ERROR:
      return renderError()
    default:
      return renderLoading()
  }
}
