'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import jsQR from 'jsqr';

export default function AdminScanTicket() {
  const [ticketId, setTicketId] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState('manual'); // 'manual' or 'camera'
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const handleScan = async () => {
    if (!ticketId.trim()) {
      alert('Please enter a ticket ID to scan.');
      return;
    }

    setIsLoading(true);
    setScanResult(null);

    try {
      // 使用新的票据验证 API
      const response = await fetch('/api/tickets/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qr_payload: ticketId.trim()
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setScanResult({
          valid: true,
          ticket: data.ticket,
          message: data.message
        });
      } else {
        setScanResult({
          valid: false,
          message: data.message || 'Ticket verification failed'
        });
      }
    } catch (error) {
      console.error('Scan error:', error);
      setScanResult({
        valid: false,
        message: 'Network error. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetScan = () => {
    setTicketId('');
    setScanResult(null);
  };

  // 启动摄像头扫码
  const startCameraScan = async () => {
    try {
      setIsScanning(true);
      setScanMode('camera');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // 使用后置摄像头
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      // 开始扫描循环
      scanLoop();
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('无法访问摄像头，请检查权限设置');
      setIsScanning(false);
    }
  };

  // 停止摄像头扫码
  const stopCameraScan = () => {
    setIsScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // 扫描循环
  const scanLoop = () => {
    if (!isScanning) return;
    
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // 设置画布尺寸
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // 绘制视频帧到画布
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // 获取图像数据
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // 使用 jsQR 库进行二维码识别
      try {
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          console.log('QR Code detected:', code.data);
          handleQRCodeDetected(code.data);
          return;
        }
      } catch (error) {
        console.error('QR code detection error:', error);
      }
    }
    
    // 继续扫描
    if (isScanning) {
      requestAnimationFrame(scanLoop);
    }
  };

  // 处理检测到的二维码
  const handleQRCodeDetected = async (qrData) => {
    console.log('QR Code detected:', qrData);
    setTicketId(qrData);
    stopCameraScan();
    await handleScan();
  };

  // 切换扫描模式
  const toggleScanMode = () => {
    if (scanMode === 'manual') {
      startCameraScan();
    } else {
      stopCameraScan();
      setScanMode('manual');
    }
  };

  // 清理资源
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '800px',
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa'
    }}>
      {/* 头部导航 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid #e9ecef'
      }}>
        <div>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: '#333',
            margin: '0 0 0.5rem 0'
          }}>
            Ticket Scanner
          </h1>
          <p style={{ color: '#666', margin: 0 }}>
            Scan and verify tickets using QR codes
          </p>
        </div>
        <Link href="/admin/dashboard" style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#6c757d',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: '500'
        }}>
          ← Back to Dashboard
        </Link>
      </div>

      {/* 扫描界面 */}
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        marginBottom: '2rem',
        border: '1px solid #e9ecef'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          color: '#333'
        }}>
          Scan Ticket
        </h2>
        
        {/* 扫描模式切换 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <button
              onClick={() => setScanMode('manual')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: scanMode === 'manual' ? '#007bff' : '#e9ecef',
                color: scanMode === 'manual' ? 'white' : '#333',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'background-color 0.3s'
              }}
            >
              📝 Manual Input
            </button>
            
            <button
              onClick={toggleScanMode}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: scanMode === 'camera' ? '#28a745' : '#e9ecef',
                color: scanMode === 'camera' ? 'white' : '#333',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'background-color 0.3s'
              }}
            >
              {isScanning ? '📷 Stop Camera' : '📷 Camera Scan'}
            </button>
          </div>
        </div>

        {/* 摄像头扫描界面 */}
        {scanMode === 'camera' && (
          <div style={{
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{
              position: 'relative',
              maxWidth: '400px',
              margin: '0 auto',
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: '#000'
            }}>
              <video
                ref={videoRef}
                style={{
                  width: '100%',
                  height: '300px',
                  objectFit: 'cover'
                }}
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                style={{
                  display: 'none'
                }}
              />
              {isScanning && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '200px',
                  height: '200px',
                  border: '2px solid #28a745',
                  borderRadius: '8px',
                  pointerEvents: 'none'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-2px',
                    left: '-2px',
                    width: '20px',
                    height: '20px',
                    borderTop: '3px solid #28a745',
                    borderLeft: '3px solid #28a745'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    width: '20px',
                    height: '20px',
                    borderTop: '3px solid #28a745',
                    borderRight: '3px solid #28a745'
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    left: '-2px',
                    width: '20px',
                    height: '20px',
                    borderBottom: '3px solid #28a745',
                    borderLeft: '3px solid #28a745'
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '20px',
                    height: '20px',
                    borderBottom: '3px solid #28a745',
                    borderRight: '3px solid #28a745'
                  }} />
                </div>
              )}
            </div>
            <p style={{
              margin: '0.5rem 0 0 0',
              color: '#666',
              fontSize: '0.9rem'
            }}>
              {isScanning ? '将二维码对准扫描框' : '点击 Camera Scan 开始扫描'}
            </p>
          </div>
        )}

        {/* 手动输入界面 */}
        {scanMode === 'manual' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '1rem',
              fontWeight: '500',
              marginBottom: '0.5rem',
              color: '#333'
            }}>
              QR Code Data or Ticket ID
            </label>
            <input
              type="text"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '1rem',
                outline: 'none',
                marginBottom: '1rem'
              }}
              placeholder="Enter QR code data or ticket ID"
              onKeyPress={(e) => e.key === 'Enter' && handleScan()}
            />
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleScan}
            disabled={isLoading || (scanMode === 'manual' && !ticketId.trim())}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: isLoading ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              cursor: (isLoading || (scanMode === 'manual' && !ticketId.trim())) ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s'
            }}
          >
            {isLoading ? 'Scanning...' : 'Scan Ticket'}
          </button>
          
          <button
            onClick={resetScan}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* 扫描结果 */}
      {scanResult && (
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          marginBottom: '2rem',
          border: '1px solid #e9ecef'
        }}>
          {scanResult.valid ? (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <div style={{
                  fontSize: '2rem',
                  marginRight: '1rem'
                }}>
                  ✅
                </div>
                <h2 style={{
                  color: '#28a745',
                  margin: 0,
                  fontSize: '1.5rem'
                }}>
                  Valid Ticket
                </h2>
              </div>
              
              <div style={{
                backgroundColor: '#d4edda',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#155724' }}>Ticket Details</h3>
                <div style={{ color: '#155724', fontSize: '0.9rem' }}>
                  <p><strong>ID:</strong> {scanResult.ticket?.shortId}</p>
                  <p><strong>Event:</strong> {scanResult.ticket?.eventId}</p>
                  <p><strong>Tier:</strong> {scanResult.ticket?.tier}</p>
                  <p><strong>Email:</strong> {scanResult.ticket?.holderEmail}</p>
                  <p><strong>Status:</strong> {scanResult.ticket?.status}</p>
                  <p><strong>Issued:</strong> {new Date(scanResult.ticket?.issuedAt).toLocaleString()}</p>
                  {scanResult.ticket?.usedAt && (
                    <p><strong>Used:</strong> {new Date(scanResult.ticket.usedAt).toLocaleString()}</p>
                  )}
                </div>
              </div>
              
              <div style={{
                backgroundColor: '#fff3cd',
                padding: '1rem',
                borderRadius: '8px',
                color: '#856404',
                fontSize: '0.9rem'
              }}>
                <strong>Entry Status:</strong> {scanResult.message}
              </div>
            </div>
          ) : (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <div style={{
                  fontSize: '2rem',
                  marginRight: '1rem'
                }}>
                  ❌
                </div>
                <h2 style={{
                  color: '#dc3545',
                  margin: 0,
                  fontSize: '1.5rem'
                }}>
                  Invalid Ticket
                </h2>
              </div>
              
              <div style={{
                backgroundColor: '#f8d7da',
                padding: '1rem',
                borderRadius: '8px',
                color: '#721c24'
              }}>
                <strong>Error:</strong> {scanResult.message}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 使用说明 */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e9ecef'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Scanner Instructions</h3>
        <ul style={{ color: '#666', lineHeight: '1.6', paddingLeft: '1.5rem' }}>
          <li><strong>Manual Input:</strong> Enter the QR code data or ticket ID manually</li>
          <li><strong>Camera Scan:</strong> Use your device's camera to scan QR codes directly</li>
          <li><strong>Camera Requirements:</strong> Works best with good lighting and clear QR codes</li>
          <li><strong>Mobile Friendly:</strong> Optimized for mobile devices with rear camera</li>
          <li>Valid tickets will show customer details and entry confirmation</li>
          <li>Invalid tickets will be rejected with an error message</li>
          <li>All ticket data is verified against the database</li>
          <li>First scan marks the ticket as used, subsequent scans will show "already used"</li>
        </ul>
      </div>
    </div>
  );
}
