'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import jsQR from 'jsqr'

export default function QRScannerPage() {
  const router = useRouter()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scannedCode, setScannedCode] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState('')
  const [stream, setStream] = useState(null)

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const startScanning = async () => {
    try {
      setError('')
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
      }
      
      setIsScanning(true)
    } catch (err) {
      setError('无法访问摄像头，请检查权限设置')
      console.error('摄像头访问错误:', err)
    }
  }

  const stopScanning = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsScanning(false)
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // 使用jsQR扫描二维码
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)

    if (code) {
      setScannedCode(code.data)
      verifyTicketFromQR(code.data)
    } else {
      setError('未检测到二维码，请确保二维码清晰可见')
    }
  }

  const handleManualInput = (e) => {
    setScannedCode(e.target.value)
  }

        const verifyTicketFromQR = async (qrData) => {
          try {
            // 解析二维码数据
            const ticketData = JSON.parse(qrData)
            
            // 验证票券有效期
            const now = new Date()
            let validityStartTime, validityEndTime
            
            if (ticketData.ticketValidityStart && ticketData.ticketValidityEnd) {
              // 使用票券中的具体有效期时间
              validityStartTime = new Date(ticketData.ticketValidityStart)
              validityEndTime = new Date(ticketData.ticketValidityEnd)
            } else {
              // 使用默认时间（16:00-次日2:00）
              const validityDate = new Date(ticketData.ticketValidityDate || ticketData.purchaseDate)
              validityStartTime = new Date(validityDate)
              validityStartTime.setHours(16, 0, 0, 0) // 16:00
              validityEndTime = new Date(validityDate)
              validityEndTime.setDate(validityEndTime.getDate() + 1)
              validityEndTime.setHours(2, 0, 0, 0) // 次日 2:00
            }

            let status = 'valid'
            let errorMessage = ''

            if (now < validityStartTime) {
              status = 'invalid'
              errorMessage = '票券尚未生效，请在有效期内验票'
            } else if (now > validityEndTime) {
              status = 'invalid'
              errorMessage = '票券已过期，无法使用'
            }

            setScanResult({
              ticketId: ticketData.ticketId,
              eventName: ticketData.eventName,
              attendeeName: ticketData.customerName || 'Unknown',
              ticketType: ticketData.ticketType,
              ticketValidityDate: ticketData.ticketValidityDate || ticketData.purchaseDate,
              validityStartTime: validityStartTime.toISOString(),
              validityEndTime: validityEndTime.toISOString(),
              currentTime: now.toISOString(),
              status: status,
              errorMessage: errorMessage,
              scannedAt: new Date().toISOString()
            })
            
            setError('')
            stopScanning()
          } catch (err) {
            setError('二维码格式无效，请扫描正确的票券二维码')
            console.error('验证错误:', err)
          }
        }

        const verifyTicket = async () => {
          if (!scannedCode) {
            setError('请输入或扫描票务代码')
            return
          }

          try {
            // 尝试解析JSON格式的二维码数据
            const ticketData = JSON.parse(scannedCode)
            
            // 验证票券有效期
            const now = new Date()
            let validityStartTime, validityEndTime
            
            if (ticketData.ticketValidityStart && ticketData.ticketValidityEnd) {
              // 使用票券中的具体有效期时间
              validityStartTime = new Date(ticketData.ticketValidityStart)
              validityEndTime = new Date(ticketData.ticketValidityEnd)
            } else {
              // 使用默认时间（16:00-次日2:00）
              const validityDate = new Date(ticketData.ticketValidityDate || ticketData.purchaseDate)
              validityStartTime = new Date(validityDate)
              validityStartTime.setHours(16, 0, 0, 0) // 16:00
              validityEndTime = new Date(validityDate)
              validityEndTime.setDate(validityEndTime.getDate() + 1)
              validityEndTime.setHours(2, 0, 0, 0) // 次日 2:00
            }

            let status = 'valid'
            let errorMessage = ''

            if (now < validityStartTime) {
              status = 'invalid'
              errorMessage = '票券尚未生效，请在有效期内验票'
            } else if (now > validityEndTime) {
              status = 'invalid'
              errorMessage = '票券已过期，无法使用'
            }

            setScanResult({
              ticketId: ticketData.ticketId,
              eventName: ticketData.eventName,
              attendeeName: ticketData.customerName || 'Unknown',
              ticketType: ticketData.ticketType,
              ticketValidityDate: ticketData.ticketValidityDate || ticketData.purchaseDate,
              validityStartTime: validityStartTime.toISOString(),
              validityEndTime: validityEndTime.toISOString(),
              currentTime: now.toISOString(),
              status: status,
              errorMessage: errorMessage,
              scannedAt: new Date().toISOString()
            })
            setError('')
          } catch (err) {
            setError('票务验证失败，请重试')
            console.error('验证错误:', err)
          }
        }

  const resetScanner = () => {
    setScannedCode('')
    setScanResult(null)
    setError('')
    stopScanning()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* 头部 */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <button
              onClick={() => router.back()}
              style={{
                padding: '0.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: 'rgba(55, 65, 81, 0.5)',
                color: 'white',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.7)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.5)'}
            >
              <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: 'white',
              margin: 0
            }}>
              扫码验票
            </h1>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '1rem' }}>
            扫描二维码或手动输入票务代码进行验证
          </p>
        </div>

        {/* 扫描区域 */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '1.5rem'
          }}>
            扫描二维码
          </h2>

          {/* 摄像头预览 */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '400px',
            margin: '0 auto 1.5rem auto',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: '#1f2937'
          }}>
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: '300px',
                objectFit: 'cover',
                display: isScanning ? 'block' : 'none'
              }}
            />
            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
            />
            {!isScanning && (
              <div style={{
                width: '100%',
                height: '300px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280',
                fontSize: '1rem'
              }}>
                点击开始扫描
              </div>
            )}
          </div>

          {/* 扫描控制按钮 */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            {!isScanning ? (
              <button
                onClick={startScanning}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.02)'
                  e.target.style.boxShadow = '0 10px 25px rgba(124, 58, 237, 0.3)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = 'none'
                }}
              >
                <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                开始扫描
              </button>
            ) : (
              <>
                <button
                  onClick={captureFrame}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.02)'
                    e.target.style.boxShadow = '0 10px 25px rgba(16, 185, 129, 0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)'
                    e.target.style.boxShadow = 'none'
                  }}
                >
                  扫描当前画面
                </button>
                <button
                  onClick={stopScanning}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'rgba(239, 68, 68, 0.8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(239, 68, 68, 1)'
                    e.target.style.transform = 'scale(1.02)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.8)'
                    e.target.style.transform = 'scale(1)'
                  }}
                >
                  停止扫描
                </button>
              </>
            )}
          </div>
        </div>

        {/* 手动输入区域 */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '1.5rem'
          }}>
            手动输入
          </h2>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <input
              type="text"
              value={scannedCode}
              onChange={handleManualInput}
              placeholder="输入票务代码"
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(55, 65, 81, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.5rem',
                color: 'white',
                fontSize: '1rem',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#7c3aed'
                e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                e.target.style.boxShadow = 'none'
              }}
            />
            <button
              onClick={verifyTicket}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.02)'
                e.target.style.boxShadow = '0 10px 25px rgba(124, 58, 237, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = 'none'
              }}
            >
              验证
            </button>
          </div>
        </div>

        {/* 错误信息 */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            borderRadius: '0.5rem',
            padding: '1rem',
            color: '#fca5a5',
            fontSize: '0.875rem',
            marginBottom: '2rem'
          }}>
            {error}
          </div>
        )}

        {/* 扫描结果 */}
        {scanResult && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: 'white',
                margin: 0
              }}>
                验证结果
              </h2>
              <button
                onClick={resetScanner}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(55, 65, 81, 0.5)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.7)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.5)'}
              >
                重新扫描
              </button>
            </div>

            <div style={{
              backgroundColor: scanResult.status === 'valid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${scanResult.status === 'valid' ? '#10b981' : '#ef4444'}`,
              borderRadius: '0.5rem',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{
                  width: '0.5rem',
                  height: '0.5rem',
                  borderRadius: '50%',
                  backgroundColor: scanResult.status === 'valid' ? '#10b981' : '#ef4444'
                }}></div>
                <span style={{
                  color: scanResult.status === 'valid' ? '#10b981' : '#ef4444',
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}>
                  {scanResult.status === 'valid' ? '票务有效' : '票务无效'}
                </span>
              </div>
              {scanResult.errorMessage && (
                <div style={{
                  color: '#ef4444',
                  fontSize: '0.875rem',
                  marginTop: '0.5rem'
                }}>
                  {scanResult.errorMessage}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>票务代码</div>
                <div style={{ color: 'white', fontWeight: '500' }}>{scanResult.ticketId}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>活动名称</div>
                <div style={{ color: 'white', fontWeight: '500' }}>{scanResult.eventName}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>持票人</div>
                <div style={{ color: 'white', fontWeight: '500' }}>{scanResult.attendeeName}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>票种</div>
                <div style={{ color: 'white', fontWeight: '500' }}>{scanResult.ticketType}</div>
              </div>
               <div>
                 <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>票券日期</div>
                 <div style={{ color: 'white', fontWeight: '500' }}>
                   {scanResult.ticketValidityDate ? new Date(scanResult.ticketValidityDate).toLocaleDateString('zh-CN') : 'N/A'}
                 </div>
               </div>
               <div>
                 <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>有效期开始</div>
                 <div style={{ color: 'white', fontWeight: '500' }}>
                   {scanResult.validityStartTime ? new Date(scanResult.validityStartTime).toLocaleString('zh-CN') : 'N/A'}
                 </div>
               </div>
               <div>
                 <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>有效期结束</div>
                 <div style={{ color: 'white', fontWeight: '500' }}>
                   {scanResult.validityEndTime ? new Date(scanResult.validityEndTime).toLocaleString('zh-CN') : 'N/A'}
                 </div>
               </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>当前时间</div>
                <div style={{ color: 'white', fontWeight: '500' }}>
                  {scanResult.currentTime ? new Date(scanResult.currentTime).toLocaleString('zh-CN') : 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>扫描时间</div>
                <div style={{ color: 'white', fontWeight: '500' }}>
                  {new Date(scanResult.scannedAt).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

