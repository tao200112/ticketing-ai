'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MerchantNavbar from '@/components/MerchantNavbar'
import jsQR from 'jsqr'

export default function MerchantScanPage() {
  const router = useRouter()
  const [isScanning, setIsScanning] = useState(false)
  const [hasCameraPermission, setHasCameraPermission] = useState(null)
  const [qrCode, setQrCode] = useState('')
  const [manualInput, setManualInput] = useState('')
  const [toast, setToast] = useState(null)
  const [scanResult, setScanResult] = useState(null)
  const [scanHistory, setScanHistory] = useState([])
  const [userRole, setUserRole] = useState(null)
  const [debugInfo, setDebugInfo] = useState([])
  const [showDebug, setShowDebug] = useState(false)
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const scanIntervalRef = useRef(null)
  const toastTimeoutRef = useRef(null)
  
  // 添加调试日志函数（同时显示在UI和控制台）
  const addDebugLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = { timestamp, message, type }
    console.log(`[${timestamp}] ${message}`)
    setDebugInfo(prev => [...prev.slice(-19), logEntry]) // 保留最近20条
  }

  useEffect(() => {
    // 检查商家登录状态
    const checkMerchantAuth = () => {
      const token = localStorage.getItem('merchantToken')
      const user = localStorage.getItem('merchantUser')
      
      if (!token || !user) {
        router.push('/merchant/auth/login')
        return
      }
      
      const parsedUser = JSON.parse(user)
      const role = parsedUser.merchant_role || 'boss'
      setUserRole(role)
    }
    
    checkMerchantAuth()
    checkCameraPermission()
    
    return () => {
      stopScanning()
      // 清理toast定时器
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [router])

  const checkCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }
      })
      setHasCameraPermission(true)
      stream.getTracks().forEach(track => track.stop())
    } catch (error) {
      console.log('Camera permission check failed:', error)
      setHasCameraPermission(false)
    }
  }

  const startScanning = async () => {
    try {
      addDebugLog('🎥 Starting camera...', 'info')
      setDebugInfo([]) // 清空之前的日志
      
      // 检查媒体设备支持
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        addDebugLog('❌ Camera API not supported', 'error')
        showToast('Camera not supported in this browser', 'error')
        return
      }
      
      addDebugLog('✅ Camera API available', 'success')
      addDebugLog('📱 Requesting camera permission...', 'info')
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }
      })
      
      addDebugLog('✅ Camera permission granted', 'success')
      addDebugLog('📹 Setting up video stream...', 'info')
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        
        addDebugLog('⏳ Waiting for video metadata...', 'info')
        
        // 等待视频元数据加载完成
        await new Promise((resolve) => {
          if (videoRef.current.readyState >= 2) {
            resolve()
          } else {
            videoRef.current.onloadedmetadata = () => resolve()
          }
        })
        
        addDebugLog('✅ Video metadata loaded', 'success')
        addDebugLog('▶️ Starting video playback...', 'info')
        
        await videoRef.current.play()
        
        addDebugLog(`✅ Video playing: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`, 'success')
        setIsScanning(true)
        showToast('Camera started successfully', 'success')
        
        // 延迟一点启动检测，确保视频已经开始播放
        addDebugLog('⏳ Will start QR detection in 300ms...', 'info')
        setTimeout(() => {
          startQRDetection()
        }, 300)
      } else {
        addDebugLog('❌ Video element not found', 'error')
      }
    } catch (error) {
      const errorMsg = error.message || 'Unknown error'
      addDebugLog(`❌ Failed to start camera: ${errorMsg}`, 'error')
      console.error('❌ Failed to start camera:', error)
      showToast('Unable to access camera, please check permissions', 'error')
    }
  }

  const startQRDetection = () => {
    // Clear any existing interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      addDebugLog('🔄 Clearing previous detection interval', 'info')
    }

    const hasVideo = !!videoRef.current
    const hasCanvas = !!canvasRef.current
    const videoWidth = videoRef.current?.videoWidth
    const videoHeight = videoRef.current?.videoHeight
    const readyState = videoRef.current?.readyState

    addDebugLog('🔍 Starting QR detection...', 'info')
    addDebugLog(`📊 Status: Video=${hasVideo}, Canvas=${hasCanvas}`, 'info')
    
    if (videoRef.current) {
      addDebugLog(`📐 Video size: ${videoWidth}x${videoHeight}, ReadyState: ${readyState}`, 'info')
    }
    
    if (!hasVideo) {
      addDebugLog('❌ Video element not available', 'error')
      return
    }
    
    if (!hasCanvas) {
      addDebugLog('❌ Canvas element not available', 'error')
      return
    }
    
    // 移动端性能优化：限制检测频率
    let frameCount = 0
    
    addDebugLog('✅ Starting detection loop (every 200ms)...', 'success')

    scanIntervalRef.current = setInterval(() => {
      // 不依赖 isScanning 状态，因为状态更新是异步的
      // 直接检查 video 和 canvas 是否存在
      if (videoRef.current && canvasRef.current) {
        try {
          const video = videoRef.current
          const canvas = canvasRef.current
          
          // Check if video is ready
          if (video.readyState !== video.HAVE_ENOUGH_DATA) {
            return
          }
          
          // 确保视频有有效的尺寸
          if (video.videoWidth === 0 || video.videoHeight === 0) {
            return
          }
          
          frameCount++
          // 每50帧（约10秒）输出一次调试信息
          if (frameCount % 50 === 0) {
            const statusMsg = `📊 Frame ${frameCount}: ${video.videoWidth}x${video.videoHeight}, ReadyState: ${video.readyState}`
            addDebugLog(statusMsg, 'info')
          }
          
          // 每10帧输出一次简单状态（确认循环在运行）
          if (frameCount % 10 === 0 && frameCount <= 50) {
            addDebugLog(`🔍 Detection loop running (frame ${frameCount})`, 'info')
          }
          
          const context = canvas.getContext('2d')
          
          // Set canvas size to match video
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          
          // Draw video frame to canvas
          context.drawImage(video, 0, 0, canvas.width, canvas.height)
          
          // Get image data and scan for QR code
          // 限制canvas尺寸以提高移动端性能（移动设备分辨率可能很高）
          const maxSize = 640 // 限制最大尺寸以提高性能
          let imageData, scanWidth, scanHeight
          
          if (canvas.width > maxSize || canvas.height > maxSize) {
            // 如果尺寸太大，进行缩放以提高性能
            const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height)
            scanWidth = Math.floor(canvas.width * scale)
            scanHeight = Math.floor(canvas.height * scale)
            
            // 创建临时canvas进行缩放
            const tempCanvas = document.createElement('canvas')
            tempCanvas.width = scanWidth
            tempCanvas.height = scanHeight
            const tempContext = tempCanvas.getContext('2d')
            tempContext.drawImage(video, 0, 0, scanWidth, scanHeight)
            imageData = tempContext.getImageData(0, 0, scanWidth, scanHeight)
          } else {
            // 使用原始尺寸
            scanWidth = canvas.width
            scanHeight = canvas.height
            imageData = context.getImageData(0, 0, canvas.width, canvas.height)
          }
          
          // 使用 inversionAttempts 选项提高检测成功率（特别是移动设备）
          // 这个选项会尝试检测正常和反色的二维码
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth'
          })
          
          if (code && code.data) {
            // Found a QR code! (任何二维码都会被检测到)
            const codePreview = code.data.substring(0, 50) + (code.data.length > 50 ? '...' : '')
            addDebugLog(`✅ QR Code detected: ${codePreview}`, 'success')
            console.log('✅ QR Code detected:', code.data.substring(0, 100))
            
            // Stop scanning
            stopScanning()
            
            // Set scanned code
            setQrCode(code.data)
            
            // Set scan result immediately (显示任何扫描到的二维码)
            setScanResult({
              code: code.data,
              timestamp: new Date().toISOString(),
              type: 'qr'
            })
            
            // Add to scan history
            const newHistory = {
              id: Date.now(),
              code: code.data,
              timestamp: new Date().toISOString(),
              type: 'qr',
              status: 'pending'
            }
            setScanHistory(prev => [newHistory, ...prev.slice(0, 9)])
            
            // Automatically verify the ticket (验证任何二维码)
            verifyTicket(code.data).then(result => {
              // Update history with result
              setScanHistory(prev => prev.map(item => 
                item.id === newHistory.id 
                  ? { ...item, status: result.valid ? 'success' : 'error' }
                  : item
              ))
              
              // 更新scanResult显示验证结果（无论成功还是失败）
              setScanResult({
                code: code.data,
                timestamp: new Date().toISOString(),
                type: 'qr',
                ticket: result.ticket || null,
                event: result.event || null,
                validity: result.validity || null,
                valid: result.valid,
                message: result.message
              })
            }).catch(err => {
              console.error('❌ Verification promise error:', err)
              // 即使验证失败，也保留扫描结果
              setScanHistory(prev => prev.map(item => 
                item.id === newHistory.id 
                  ? { ...item, status: 'error' }
                  : item
              ))
            })
            
            showToast('QR code detected! Verifying...', 'success')
          } else {
            // 每100帧（约20秒）输出一次调试信息，确认检测循环在运行
            if (frameCount % 100 === 0) {
              console.log('🔍 Scanning for QR code... (frame:', frameCount, ')')
            }
          }
        } catch (err) {
          // Log errors for debugging
          const errorMsg = err.message || 'Unknown error'
          if (frameCount % 50 === 0) { // 每50帧才显示一次错误，避免刷屏
            addDebugLog(`❌ Frame capture error: ${errorMsg}`, 'error')
          }
          console.error('❌ Frame capture error:', err)
        }
      } else {
        // 如果video或canvas不存在，停止检测
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current)
          scanIntervalRef.current = null
          console.warn('⚠️ Video or canvas not available, stopping detection')
        }
      }
    }, 200) // Check every 200ms (降低频率以提高移动端性能)
  }

  const stopScanning = () => {
    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    // Clear QR detection interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    
    setIsScanning(false)
    
    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const handleManualSubmit = () => {
    if (!manualInput.trim()) {
      showToast('Please enter ticket number or QR code content', 'error')
      return
    }
    
    setScanResult({
      code: manualInput,
      timestamp: new Date().toISOString(),
      type: 'manual'
    })
    
    const newHistory = {
      id: Date.now(),
      code: manualInput,
      timestamp: new Date().toISOString(),
      type: 'manual',
      status: 'success'
    }
    setScanHistory(prev => [newHistory, ...prev.slice(0, 9)])
    
    showToast('Manual input successful!', 'success')
  }

  const verifyTicket = async (code) => {
    try {
      console.log('🔍 Verifying QR code:', code.substring(0, 50) + '...')
      
      // 先使用 verify API 验证二维码（更宽松，可以验证任何格式）
      // 这允许扫描任何二维码，如果不对就显示错误
      const verifyResponse = await fetch('/api/tickets/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qr_payload: code,
          redeem: false  // 只验证，不核销
        }),
      })
      
      const verifyResult = await verifyResponse.json()
      
      if (verifyResponse.ok && verifyResult.success) {
        // 验证成功，显示票务信息
        const { ticket, event, validity } = verifyResult.data
        
        // 检查是否有效
        const isValid = validity.valid && ticket.status !== 'used' && ticket.status !== 'refunded' && ticket.status !== 'cancelled'
        
        if (isValid) {
          showToast('Ticket verified successfully!', 'success')
          return { 
            valid: true, 
            message: 'Ticket verified successfully',
            ticket,
            event,
            validity
          }
        } else {
          // 票务无效（已使用、过期等）
          const errorMessage = validity.message || 'Ticket is not valid'
          showToast(errorMessage, 'error')
          return { 
            valid: false, 
            message: errorMessage,
            ticket,
            event,
            validity
          }
        }
      } else {
        // 验证失败 - 可能是格式不对、票务不存在等
        const errorCode = verifyResult.error || verifyResult.code
        let errorMessage = verifyResult.message || 'Invalid QR code or ticket not found'
        
        // 友好的错误消息
        if (errorCode === 'INVALID_QR_FORMAT') {
          errorMessage = 'This QR code is not a valid ticket QR code'
        } else if (errorCode === 'TICKET_NOT_FOUND') {
          errorMessage = 'Ticket not found in system'
        }
        
        console.log('❌ Verification failed:', errorMessage)
        showToast(errorMessage, 'error')
        return { valid: false, message: errorMessage }
      }
    } catch (error) {
      console.error('❌ Verification error:', error)
      showToast('Error occurred during verification', 'error')
      return { valid: false, message: 'Verification failed' }
    }
  }

  const showToast = (message, type = 'info') => {
    // 清理之前的定时器
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    
    setToast({ message, type })
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000)
  }

  const clearResult = () => {
    setScanResult(null)
    setQrCode('')
    setManualInput('')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingTop: '80px' }}>
      <MerchantNavbar userRole={userRole} />
      {/* Navigation Bar (replaced by MerchantNavbar) */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 80,
        zIndex: 40
      }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '1rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => router.back()}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <svg style={{ width: '1.25rem', height: '1.25rem', color: '#4b5563' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>Ticket Scanning</h1>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>Scan QR code to verify tickets</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setShowDebug(!showDebug)}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  backgroundColor: showDebug ? '#2563eb' : '#f3f4f6',
                  color: showDebug ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                  marginRight: '0.5rem'
                }}
              >
                {showDebug ? 'Hide Debug' : 'Show Debug'}
              </button>
              <div style={{
                width: '0.5rem',
                height: '0.5rem',
                backgroundColor: '#10b981',
                borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }}></div>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Online</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '1.5rem' }}>
        {/* Scanning Area */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>Scan QR Code</h2>
            <p style={{ color: '#6b7280' }}>Point the camera at the QR code to scan</p>
          </div>

          {/* Camera Area */}
          <div style={{
            position: 'relative',
            backgroundColor: '#111827',
            borderRadius: '0.5rem',
            overflow: 'hidden',
            marginBottom: '1.5rem'
          }}>
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: '16rem',
                objectFit: 'cover',
                display: isScanning ? 'block' : 'none'
              }}
              playsInline
              muted
            />
            
            {!isScanning && (
              <div style={{ height: '16rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '4rem',
                    height: '4rem',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem auto'
                  }}>
                    <svg style={{ width: '2rem', height: '2rem', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p style={{ color: '#6b7280' }}>Click to start scanning</p>
                </div>
              </div>
            )}
          </div>

          {/* Control Buttons */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            {!isScanning ? (
              <button
                onClick={startScanning}
                disabled={hasCameraPermission === false}
                style={{
                  padding: '0.75rem 2rem',
                  borderRadius: '0.5rem',
                  fontWeight: '500',
                  border: 'none',
                  cursor: hasCameraPermission === false ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: hasCameraPermission === false ? '#fef2f2' : '#2563eb',
                  color: hasCameraPermission === false ? '#f87171' : 'white'
                }}
                onMouseEnter={(e) => {
                  if (hasCameraPermission !== false) {
                    e.target.style.backgroundColor = '#1d4ed8'
                  }
                }}
                onMouseLeave={(e) => {
                  if (hasCameraPermission !== false) {
                    e.target.style.backgroundColor = '#2563eb'
                  }
                }}
              >
                <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Start Scanning
              </button>
            ) : (
              <button
                onClick={stopScanning}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  borderRadius: '0.5rem',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#fee2e2'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#fef2f2'}
              >
                <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Stop Scanning
              </button>
            )}
          </div>

          {/* Permission Warning */}
          {hasCameraPermission === false && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626' }}>
                <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span style={{ fontSize: '0.875rem' }}>Unable to access camera, please check browser permission settings</span>
              </div>
            </div>
          )}
        </div>

        {/* Manual Input Area */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>Manual Input</h2>
            <p style={{ color: '#6b7280' }}>If scanning is not possible, enter ticket number manually</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Enter ticket number or QR code content"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  color: '#111827',
                  fontSize: '1rem',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb'
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>
            
            <button
              onClick={handleManualSubmit}
              disabled={!manualInput.trim()}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                fontWeight: '500',
                border: 'none',
                cursor: !manualInput.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                backgroundColor: !manualInput.trim() ? '#f3f4f6' : '#2563eb',
                color: !manualInput.trim() ? '#9ca3af' : 'white'
              }}
              onMouseEnter={(e) => {
                if (manualInput.trim()) {
                  e.target.style.backgroundColor = '#1d4ed8'
                }
              }}
              onMouseLeave={(e) => {
                if (manualInput.trim()) {
                  e.target.style.backgroundColor = '#2563eb'
                }
              }}
            >
              Confirm Input
            </button>
          </div>
        </div>

        {/* Debug Panel */}
        {showDebug && (
          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '0.5rem',
            border: '1px solid #334155',
            padding: '1.5rem',
            marginBottom: '2rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#f1f5f9' }}>Debug Information</h2>
              <button
                onClick={() => setDebugInfo([])}
                style={{
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.75rem',
                  backgroundColor: '#475569',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>
              {debugInfo.length === 0 ? (
                <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>No debug information yet. Start scanning to see logs.</div>
              ) : (
                debugInfo.map((log, index) => (
                  <div 
                    key={index}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: log.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 
                                       log.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 
                                       'rgba(59, 130, 246, 0.1)',
                      borderRadius: '0.25rem',
                      borderLeft: `3px solid ${
                        log.type === 'error' ? '#ef4444' : 
                        log.type === 'success' ? '#10b981' : 
                        '#3b82f6'
                      }`
                    }}
                  >
                    <span style={{ color: '#94a3b8' }}>[{log.timestamp}]</span>{' '}
                    <span style={{ 
                      color: log.type === 'error' ? '#fca5a5' : 
                             log.type === 'success' ? '#6ee7b7' : 
                             '#bfdbfe'
                    }}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Scan Result */}
        {scanResult && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>Scan Result</h2>
              <button
                onClick={clearResult}
                style={{
                  color: '#9ca3af',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.color = '#4b5563'}
                onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
              >
                <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ backgroundColor: '#f9fafb', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <svg style={{ width: '1rem', height: '1rem', color: '#6b7280' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Ticket Code</span>
                </div>
                <p style={{ color: '#111827', fontFamily: 'monospace', fontSize: '0.875rem', wordBreak: 'break-all', margin: 0 }}>
                  {scanResult.code}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <button
                  onClick={() => verifyTicket(scanResult.code)}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: '#059669',
                    color: 'white',
                    borderRadius: '0.5rem',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#047857'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#059669'}
                >
                  <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Verify Ticket
                </button>
                
                <button
                  onClick={() => navigator.clipboard.writeText(scanResult.code)}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    borderRadius: '0.5rem',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                >
                  <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Code
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb',
            padding: '2rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>Recent Scans</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {scanHistory.slice(0, 5).map((item) => (
                <div key={item.id} style={{
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '0.5rem',
                      height: '0.5rem',
                      borderRadius: '50%',
                      backgroundColor: item.status === 'success' ? '#10b981' : '#ef4444'
                    }}></div>
                    <div>
                      <p style={{ color: '#111827', fontFamily: 'monospace', fontSize: '0.875rem', margin: 0 }}>
                        {item.code}
                      </p>
                      <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: 0 }}>
                        {new Date(item.timestamp).toLocaleString('en-US')} • {item.type === 'qr' ? 'Scan' : 'Manual'}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => navigator.clipboard.writeText(item.code)}
                    style={{
                      padding: '0.5rem',
                      color: '#9ca3af',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#4b5563'}
                    onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
                  >
                    <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 50 }}>
          <div style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            fontWeight: '500',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            backgroundColor: toast.type === 'success' ? '#dcfce7' : toast.type === 'error' ? '#fef2f2' : '#dbeafe',
            color: toast.type === 'success' ? '#166534' : toast.type === 'error' ? '#991b1b' : '#1e40af',
            border: toast.type === 'success' ? '1px solid #bbf7d0' : toast.type === 'error' ? '1px solid #fecaca' : '1px solid #bfdbfe'
          }}>
            {toast.message}
          </div>
        </div>
      )}

      {/* Hidden canvas for QR code recognition */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}