'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminNavbar from '@/components/AdminNavbar'

export default function AdminNewActivityPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [adminUser, setAdminUser] = useState(null)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)

  const [regions, setRegions] = useState([])
  const [regionsLoading, setRegionsLoading] = useState(true)
  const [regionsError, setRegionsError] = useState('')
  const [activityData, setActivityData] = useState({
    title: '',
    image_url: '',
    text: '',
    is_active: true,
    region_slug: ''
  })

  useEffect(() => {
    // 检查管理员登录状态
    const checkAdminAuth = async () => {
      setIsLoadingAuth(true)
      const token = localStorage.getItem('adminToken')
      const user = localStorage.getItem('adminUser')
      
      if (!token || !user) {
        router.push('/admin')
        return
      }
      
      try {
        const userData = JSON.parse(user)
        setAdminUser(userData)
      } catch (err) {
        console.error('Error parsing admin user data:', err)
        router.push('/admin')
      } finally {
        setIsLoadingAuth(false)
      }
    }
    
    checkAdminAuth()
  }, [router])

  useEffect(() => {
    const loadRegions = async () => {
      try {
        setRegionsLoading(true)
        setRegionsError('')
        const response = await fetch('/api/admin/regions')
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to load regions')
        }

        const regionList = Array.isArray(result.data) ? result.data : []
        setRegions(regionList)
        setActivityData(prev => ({
          ...prev,
          region_slug: prev.region_slug || regionList[0]?.slug || ''
        }))
      } catch (err) {
        console.error('Error loading regions:', err)
        setRegionsError('加载地区列表失败，请刷新页面后重试。')
      } finally {
        setRegionsLoading(false)
      }
    }

    loadRegions()
  }, [])

  const updateActivityData = (field, value) => {
    setActivityData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('文件大小必须小于5MB')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onload = (event) => {
      setImagePreview(event.target?.result)
    }
    reader.readAsDataURL(file)

    // Upload file
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        updateActivityData('image_url', result.url)
      } else {
        alert(result.message || '上传图片失败')
        setImagePreview(null)
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('上传图片失败')
      setImagePreview(null)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError('')
    
    try {
      // 验证必填字段
      if (!activityData.title || activityData.title.trim() === '') {
        setError('请输入活动标题')
        setIsSubmitting(false)
        return
      }
      if (!activityData.text || activityData.text.trim() === '') {
        setError('请输入活动描述')
        setIsSubmitting(false)
        return
      }
      if (!activityData.region_slug) {
        setError('请选择所属地区')
        setIsSubmitting(false)
        return
      }

      // 调用 API 创建活动
      const response = await fetch('/api/admin/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData)
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.message || result.error || '创建活动失败')
        setIsSubmitting(false)
        return
      }

      console.log('✅ Activity created successfully:', result.data)
      
      router.push('/admin/dashboard?tab=activities')
    } catch (err) {
      setError('创建活动失败，请重试')
      console.error('Error creating activity:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 如果正在加载认证信息，显示加载状态
  if (isLoadingAuth) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{ fontSize: '18px', marginBottom: '20px' }}>加载中...</div>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderTop: '3px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    )
  }

  // 如果管理员用户未加载，不显示表单
  if (!adminUser) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{ fontSize: '18px', marginBottom: '20px' }}>请先登录管理员账户</div>
          <button
            onClick={() => router.push('/admin')}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            前往登录
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      paddingTop: '80px'
    }}>
      <AdminNavbar />
      
      {/* Navigation Bar */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'sticky',
        top: '80px',
        zIndex: 50,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '1rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => router.push('/admin/dashboard?tab=activities')}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <svg style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: 0 }}>创建活动</h1>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', margin: 0 }}>设置活动详情</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '1.5rem' }}>
        {/* Form Content */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          borderRadius: '0.5rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '2rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'white', marginBottom: '1.5rem' }}>活动基本信息</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '0.5rem' }}>
                    活动标题 *
                  </label>
                  <input
                    type="text"
                    value={activityData.title}
                    onChange={(e) => updateActivityData('title', e.target.value)}
                    placeholder="输入活动标题"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#7c3aed'
                      e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.2)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '0.5rem' }}>
                    活动描述 *
                  </label>
                  <textarea
                    value={activityData.text}
                    onChange={(e) => updateActivityData('text', e.target.value)}
                    placeholder="详细描述您的活动"
                    rows={6}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      fontSize: '1rem',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#7c3aed'
                      e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.2)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '0.5rem' }}>
                    所属地区 *
                  </label>
                  <select
                    value={activityData.region_slug}
                    onChange={(e) => updateActivityData('region_slug', e.target.value)}
                    disabled={regionsLoading || regions.length === 0}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      color: 'white',
                      fontSize: '0.95rem',
                      outline: 'none',
                      cursor: regionsLoading ? 'not-allowed' : 'pointer'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#7c3aed'
                      e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.2)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                      e.target.style.boxShadow = 'none'
                    }}
                  >
                    {regionsLoading && (
                      <option value="">加载地区...</option>
                    )}
                    {!regionsLoading && regions.length === 0 && (
                      <option value="">暂无可用地区</option>
                    )}
                    {!regionsLoading && regions.map((region) => (
                      <option key={region.id} value={region.slug}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                  {regionsError && (
                    <p style={{ color: '#fca5a5', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                      {regionsError}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '0.5rem' }}>
                    活动图片
                  </label>
                  <div style={{
                    border: '2px dashed rgba(255, 255, 255, 0.3)',
                    borderRadius: '0.5rem',
                    padding: '2rem',
                    textAlign: 'center',
                    transition: 'border-color 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)'}
                  onMouseLeave={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'}>
                    {(imagePreview || activityData.image_url) ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <img
                          src={imagePreview || activityData.image_url}
                          alt="Preview"
                          style={{ maxWidth: '20rem', margin: '0 auto', borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                        />
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              updateActivityData('image_url', '')
                              setImagePreview(null)
                              const fileInput = document.getElementById('activity-image-upload')
                              if (fileInput) fileInput.value = ''
                            }}
                            style={{
                              color: '#dc2626',
                              fontSize: '0.875rem',
                              border: 'none',
                              backgroundColor: 'transparent',
                              cursor: 'pointer',
                              transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.color = '#b91c1c'}
                            onMouseLeave={(e) => e.target.style.color = '#dc2626'}
                          >
                            移除图片
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{
                          width: '4rem',
                          height: '4rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto'
                        }}>
                          <svg style={{ width: '2rem', height: '2rem', color: 'rgba(255, 255, 255, 0.7)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p style={{ color: 'white', fontWeight: '500', margin: 0 }}>点击上传图片</p>
                          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', margin: 0 }}>支持 JPG、PNG 格式，最大 5MB</p>
                        </div>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleImageUpload}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                      id="activity-image-upload"
                    />
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '0.5rem' }}>
                      或输入图片URL
                    </label>
                    <input
                      type="url"
                      value={activityData.image_url}
                      onChange={(e) => {
                        updateActivityData('image_url', e.target.value)
                        if (e.target.value) {
                          setImagePreview(e.target.value)
                        } else {
                          setImagePreview(null)
                        }
                      }}
                      placeholder="输入图片URL（可选）"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '0.5rem',
                        color: 'white',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        fontSize: '1rem',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#7c3aed'
                        e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.2)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="checkbox"
                    checked={activityData.is_active}
                    onChange={(e) => updateActivityData('is_active', e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer'
                    }}
                  />
                  <label style={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}>
                    激活（在活动页面可见）
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '0.5rem',
              padding: '1rem',
              marginTop: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg style={{ width: '1.25rem', height: '1.25rem', color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span style={{ color: '#fee2e2' }}>{error}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '1.5rem',
            marginTop: '1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <button
              type="button"
              onClick={() => router.push('/admin/dashboard?tab=activities')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '0.5rem',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            >
              取消
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: '500',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                backgroundColor: isSubmitting ? 'rgba(255, 255, 255, 0.1)' : '#7c3aed',
                color: isSubmitting ? '#9ca3af' : 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.target.style.backgroundColor = '#6d28d9'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.target.style.backgroundColor = '#7c3aed'
                }
              }}
            >
              {isSubmitting ? (
                <>
                  <div style={{
                    width: '1rem',
                    height: '1rem',
                    border: '2px solid #9ca3af',
                    borderTop: '2px solid #6b7280',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  创建中...
                </>
              ) : (
                '创建活动'
              )}
            </button>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

