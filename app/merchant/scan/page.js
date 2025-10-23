'use client'

import { useState, useRef, useEffect } from 'react'
import NavbarPartyTix from '../../../components/NavbarPartyTix'
import GradientButton from '../../../components/GradientButton'
import jsQR from 'jsqr'

export default function MerchantScanPage() {
  const [isScanning, setIsScanning] = useState(false)
  const [hasCameraPermission, setHasCameraPermission] = useState(null)
  const [qrCode, setQrCode] = useState('')
  const [manualInput, setManualInput] = useState('')
  const [toast, setToast] = useState(null)
  const [scanResult, setScanResult] = useState(null)
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const scanIntervalRef = useRef(null)

  // 检查摄像头权限
  useEffect(() => {
    checkCameraPermission()
    return () => {
      stopScanning()
    }
  }, [])

  const checkCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // 后置摄像头
      })
      setHasCameraPermission(true)
      stream.getTracks().forEach(track => track.stop())
    } catch (error) {
      console.log('摄像头权限检查失败:', error)
      setHasCameraPermission(false)
    }
  }

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }
      })
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      
      setIsScanning(true)
      
      // 开始二维码扫描
      startQRScanning()
      
    } catch (error) {
      console.error('启动摄像头失败:', error)
      setHasCameraPermission(false)
      showToast('无法访问摄像头，请使用手动输入', 'warning')
    }
  }

  const stopScanning = () => {
    setIsScanning(false)
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const startQRScanning = () => {
    scanIntervalRef.current = setInterval(async () => {
      if (videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        
        // 设置画布尺寸
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        
        // 绘制视频帧
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
        
        // 尝试解析二维码
        try {
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height)
          
          if (code) {
            setQrCode(code.data)
            stopScanning()
            showToast('二维码扫描成功！', 'success')
          }
        } catch (error) {
          // 静默处理二维码解析错误
          console.log('二维码解析中...')
        }
      }
    }, 100) // 每100ms扫描一次
  }

  const handleManualInput = (value) => {
    setManualInput(value)
    setQrCode(value)
  }

  const simulateVerification = () => {
    const codeToVerify = qrCode || manualInput
    
    if (!codeToVerify.trim()) {
      showToast('请输入或扫描二维码', 'error')
      return
    }

    // 模拟验证逻辑
    const isValid = Math.random() > 0.3 // 70% 成功率
    
    if (isValid) {
      setScanResult({
        code: codeToVerify,
        status: 'verified',
        timestamp: new Date().toISOString(),
        ticketInfo: {
          eventName: 'Ridiculous Chicken 夜场',
          ticketType: '标准票',
          seatNumber: 'A-12'
        }
      })
      showToast('验证成功！票据有效', 'success')
    } else {
      setScanResult({
        code: codeToVerify,
        status: 'invalid',
        timestamp: new Date().toISOString(),
        reason: '票据已使用或无效'
      })
      showToast('验证失败！票据无效', 'error')
    }
  }

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const resetScan = () => {
    setQrCode('')
    setManualInput('')
    setScanResult(null)
    stopScanning()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <NavbarPartyTix />
      
      <div className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-6">
          {/* 页面标题 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">票据扫描验证</h1>
            <p className="text-slate-400">扫描二维码或手动输入票据代码进行验证</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 左侧：扫描区域 */}
            <div className="space-y-6">
              {/* 摄像头扫描 */}
              {hasCameraPermission !== false && (
                <div className="bg-partytix-card rounded-xl p-6">
                  <h2 className="text-xl font-bold text-white mb-4">摄像头扫描</h2>
                  
                  {!isScanning ? (
                    <div className="aspect-video bg-slate-800 rounded-lg flex items-center justify-center mb-4">
                      <div className="text-center">
                        <div className="text-6xl mb-4">📱</div>
                        <p className="text-slate-400">点击开始扫描</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <video
                        ref={videoRef}
                        className="w-full aspect-video bg-slate-800 rounded-lg mb-4"
                        playsInline
                      />
                      <canvas
                        ref={canvasRef}
                        className="hidden"
                      />
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="w-48 h-48 border-2 border-purple-500 rounded-lg mx-auto mt-16 animate-pulse">
                          <div className="w-full h-full border border-purple-300 rounded-lg"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    {!isScanning ? (
                      <GradientButton onClick={startScanning} className="flex-1">
                        开始扫描
                      </GradientButton>
                    ) : (
                      <GradientButton 
                        onClick={stopScanning} 
                        variant="danger" 
                        className="flex-1"
                      >
                        停止扫描
                      </GradientButton>
                    )}
                  </div>
                </div>
              )}

              {/* 手动输入 */}
              <div className="bg-partytix-card rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">手动输入</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      票据代码
                    </label>
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(e) => handleManualInput(e.target.value)}
                      placeholder="输入票据二维码内容"
                      className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="text-sm text-slate-400">
                    如果摄像头不可用，可以手动输入票据上的二维码内容
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：验证结果 */}
            <div className="space-y-6">
              {/* 当前扫描状态 */}
              <div className="bg-partytix-card rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">扫描状态</h2>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">摄像头权限</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      hasCameraPermission === true ? 'bg-green-500/20 text-green-400' :
                      hasCameraPermission === false ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {hasCameraPermission === true ? '可用' :
                       hasCameraPermission === false ? '不可用' : '检查中'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">扫描状态</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      isScanning ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {isScanning ? '扫描中' : '未扫描'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">二维码内容</span>
                    <span className="text-white text-sm truncate max-w-48">
                      {qrCode || manualInput || '无'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 验证操作 */}
              <div className="bg-partytix-card rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">验证操作</h2>
                
                <div className="space-y-4">
                  <GradientButton 
                    onClick={simulateVerification}
                    className="w-full"
                    size="lg"
                  >
                    模拟验证 (Demo)
                  </GradientButton>
                  
                  <button
                    onClick={resetScan}
                    className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    重置扫描
                  </button>
                </div>
                
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ 此为演示模式，不会连接真实后端系统
                  </p>
                </div>
              </div>

              {/* 验证结果 */}
              {scanResult && (
                <div className="bg-partytix-card rounded-xl p-6">
                  <h2 className="text-xl font-bold text-white mb-4">验证结果</h2>
                  
                  <div className={`p-4 rounded-lg mb-4 ${
                    scanResult.status === 'verified' 
                      ? 'bg-green-500/10 border border-green-500/20' 
                      : 'bg-red-500/10 border border-red-500/20'
                  }`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`text-2xl ${
                        scanResult.status === 'verified' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {scanResult.status === 'verified' ? '✅' : '❌'}
                      </span>
                      <span className={`font-bold ${
                        scanResult.status === 'verified' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {scanResult.status === 'verified' ? '验证成功' : '验证失败'}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">票据代码:</span>
                        <span className="text-white font-mono">{scanResult.code}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-slate-400">验证时间:</span>
                        <span className="text-white">
                          {new Date(scanResult.timestamp).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      
                      {scanResult.ticketInfo && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-400">活动名称:</span>
                            <span className="text-white">{scanResult.ticketInfo.eventName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">票种:</span>
                            <span className="text-white">{scanResult.ticketInfo.ticketType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">座位号:</span>
                            <span className="text-white">{scanResult.ticketInfo.seatNumber}</span>
                          </div>
                        </>
                      )}
                      
                      {scanResult.reason && (
                        <div className="text-red-400 text-sm">
                          原因: {scanResult.reason}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast 通知 */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`px-6 py-4 rounded-lg shadow-lg max-w-sm ${
            toast.type === 'success' ? 'bg-green-600 text-white' :
            toast.type === 'error' ? 'bg-red-600 text-white' :
            toast.type === 'warning' ? 'bg-yellow-600 text-white' :
            'bg-blue-600 text-white'
          }`}>
            <div className="flex items-center space-x-2">
              <span className="text-lg">
                {toast.type === 'success' ? '✅' :
                 toast.type === 'error' ? '❌' :
                 toast.type === 'warning' ? '⚠️' : 'ℹ️'}
              </span>
              <span className="font-medium">{toast.message}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
