'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminNavbar from '@/components/AdminNavbar'

export default function AdminNewEventPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [adminUser, setAdminUser] = useState(null)
  const [merchants, setMerchants] = useState([])
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)

  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    poster: null,
    posterPreview: null,
    poster_url: '',
    merchant_id: '',
    status: 'published',
    prices: [
      { name: '', amount_cents: '', inventory: '', limit_per_user: '', ticket_kind: '' }
    ]
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

        // 加载商家列表
        const merchantsResponse = await fetch('/api/admin/merchants')
        if (merchantsResponse.ok) {
          const merchantsData = await merchantsResponse.json()
          setMerchants(merchantsData)
          // 如果有商家，默认选择第一个
          if (merchantsData.length > 0) {
            setEventData(prev => ({ ...prev, merchant_id: merchantsData[0].id }))
          }
        }
      } catch (err) {
        console.error('Error parsing admin user data:', err)
        router.push('/admin')
      } finally {
        setIsLoadingAuth(false)
      }
    }
    
    checkAdminAuth()
  }, [router])

  const updateEventData = (field, value) => {
    setEventData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const updatePriceData = (index, field, value) => {
    setEventData(prev => ({
      ...prev,
      prices: prev.prices.map((price, i) => 
        i === index ? { ...price, [field]: value } : price
      )
    }))
  }

  const addPrice = () => {
    setEventData(prev => ({
      ...prev,
      prices: [...prev.prices, { name: '', amount_cents: '', inventory: '', limit_per_user: '', ticket_kind: '' }]
    }))
  }

  const removePrice = (index) => {
    if (eventData.prices.length > 1) {
      setEventData(prev => ({
        ...prev,
        prices: prev.prices.filter((_, i) => i !== index)
      }))
    }
  }

  const handlePosterUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        updateEventData('posterPreview', e.target.result)
        updateEventData('poster', file)
        updateEventData('poster_url', e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError('')
    
    try {
      // 验证必填字段
      if (!eventData.title || !eventData.description || !eventData.startTime || !eventData.endTime || !eventData.location) {
        setError('请填写所有必填字段')
        setIsSubmitting(false)
        return
      }

      // 验证价格设置
      const validPrices = eventData.prices.filter(price => price.name && price.amount_cents && price.ticket_kind)
      if (validPrices.length === 0) {
        setError('请至少设置一个有效的票务类型，并选择票务种类')
        setIsSubmitting(false)
        return
      }

      // 验证价格是否符合 Stripe 最小金额要求
      const invalidPrices = validPrices.filter(price => parseFloat(price.amount_cents) < 0.50)
      if (invalidPrices.length > 0) {
        setError('所有票务价格必须至少为 $0.50 (Stripe 最低要求)')
        setIsSubmitting(false)
        return
      }

      // 调用 API 创建活动
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: eventData.title,
          description: eventData.description,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          location: eventData.location,
          poster_url: eventData.poster_url || eventData.posterPreview || null,
          merchant_id: eventData.merchant_id || null,
          prices: validPrices.map(price => ({
            name: price.name,
            amount_cents: Math.round(parseFloat(price.amount_cents) * 100), // 将美元转换为分
            inventory: price.inventory && price.inventory.trim() !== '' ? parseInt(price.inventory) : null,
            limit_per_user: price.limit_per_user ? parseInt(price.limit_per_user) : 4,
            ticket_kind: price.ticket_kind && price.ticket_kind.trim() !== '' ? price.ticket_kind : null
          })),
          status: eventData.status
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.message || result.error || '创建活动失败')
        setIsSubmitting(false)
        return
      }

      console.log('✅ Event created successfully:', result.data)
      
      router.push('/admin/dashboard?tab=events')
    } catch (err) {
      setError('创建活动失败，请重试')
      console.error('Error creating event:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const steps = [
    { number: 1, title: '基本信息', description: '填写活动基本信息' },
    { number: 2, title: '海报上传', description: '上传活动海报' },
    { number: 3, title: '票务设置', description: '设置票务类型和价格' }
  ]

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
                onClick={() => router.push('/admin/dashboard?tab=events')}
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
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>步骤 {currentStep} / 3</span>
              <div style={{ width: '8rem', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: '9999px', height: '0.5rem' }}>
                <div 
                  style={{
                    backgroundColor: '#7c3aed',
                    height: '0.5rem',
                    borderRadius: '9999px',
                    transition: 'all 0.3s',
                    width: `${(currentStep / 3) * 100}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '1.5rem' }}>
        {/* Step Indicator */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {steps.map((step, index) => (
              <div key={step.number} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '50%',
                  border: '2px solid',
                  transition: 'all 0.3s',
                  backgroundColor: currentStep >= step.number ? '#7c3aed' : 'rgba(255, 255, 255, 0.1)',
                  borderColor: currentStep >= step.number ? '#7c3aed' : 'rgba(255, 255, 255, 0.3)',
                  color: currentStep >= step.number ? 'white' : 'rgba(255, 255, 255, 0.6)'
                }}>
                  {currentStep > step.number ? (
                    <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <div style={{ marginLeft: '0.75rem' }}>
                  <p style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: currentStep >= step.number ? 'white' : 'rgba(255, 255, 255, 0.6)',
                    margin: 0
                  }}>
                    {step.title}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', margin: 0 }}>{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div style={{
                    width: '4rem',
                    height: '0.125rem',
                    margin: '0 1rem',
                    transition: 'all 0.3s',
                    backgroundColor: currentStep > step.number ? '#7c3aed' : 'rgba(255, 255, 255, 0.3)'
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          borderRadius: '0.5rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '2rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'white', marginBottom: '1.5rem' }}>活动基本信息</h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* 商家选择 */}
                  {merchants.length > 0 && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '0.5rem' }}>
                        商家
                      </label>
                      <select
                        value={eventData.merchant_id}
                        onChange={(e) => updateEventData('merchant_id', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '0.5rem',
                          color: 'white',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          fontSize: '1rem',
                          outline: 'none',
                          cursor: 'pointer'
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
                        <option value="">选择商家（可选）</option>
                        {merchants.map(merchant => (
                          <option key={merchant.id} value={merchant.id} style={{ color: '#111827' }}>
                            {merchant.name} ({merchant.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '0.5rem' }}>
                      活动标题 *
                    </label>
                    <input
                      type="text"
                      value={eventData.title}
                      onChange={(e) => updateEventData('title', e.target.value)}
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
                      value={eventData.description}
                      onChange={(e) => updateEventData('description', e.target.value)}
                      placeholder="详细描述您的活动"
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '0.5rem',
                        color: 'white',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        fontSize: '1rem',
                        outline: 'none',
                        resize: 'none'
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

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '0.5rem' }}>
                        开始时间 *
                      </label>
                      <input
                        type="datetime-local"
                        value={eventData.startTime}
                        onChange={(e) => updateEventData('startTime', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
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

                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '0.5rem' }}>
                        结束时间 *
                      </label>
                      <input
                        type="datetime-local"
                        value={eventData.endTime}
                        onChange={(e) => updateEventData('endTime', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
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
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '0.5rem' }}>
                      活动地点 *
                    </label>
                    <input
                      type="text"
                      value={eventData.location}
                      onChange={(e) => updateEventData('location', e.target.value)}
                      placeholder="输入活动地点"
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
                      状态
                    </label>
                    <select
                      value={eventData.status}
                      onChange={(e) => updateEventData('status', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '0.5rem',
                        color: 'white',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        fontSize: '1rem',
                        outline: 'none',
                        cursor: 'pointer'
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
                      <option value="published" style={{ color: '#111827' }}>已发布</option>
                      <option value="draft" style={{ color: '#111827' }}>草稿</option>
                      <option value="cancelled" style={{ color: '#111827' }}>已取消</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'white', marginBottom: '1.5rem' }}>活动海报</h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '0.5rem' }}>
                      上传海报图片
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
                      {eventData.posterPreview ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <img
                            src={eventData.posterPreview}
                            alt="Poster preview"
                            style={{ maxWidth: '20rem', margin: '0 auto', borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                          />
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                updateEventData('poster', null)
                                updateEventData('posterPreview', null)
                                updateEventData('poster_url', '')
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
                            <p style={{ color: 'white', fontWeight: '500', margin: 0 }}>点击上传海报</p>
                            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', margin: 0 }}>支持 JPG、PNG 格式，推荐尺寸 1200x630</p>
                          </div>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePosterUpload}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          opacity: 0,
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '0.5rem' }}>
                      或输入海报URL
                    </label>
                    <input
                      type="url"
                      value={eventData.poster_url}
                      onChange={(e) => {
                        updateEventData('poster_url', e.target.value)
                        if (e.target.value) {
                          updateEventData('posterPreview', e.target.value)
                        }
                      }}
                      placeholder="输入海报图片URL（可选）"
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
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'white', marginBottom: '1.5rem' }}>票务设置</h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {eventData.prices.map((price, index) => (
                    <div key={index} style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '0.5rem',
                      padding: '1.5rem',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '500', color: 'white', margin: 0 }}>票务类型 {index + 1}</h3>
                        {eventData.prices.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePrice(index)}
                            style={{
                              color: '#dc2626',
                              border: 'none',
                              backgroundColor: 'transparent',
                              cursor: 'pointer',
                              transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.color = '#b91c1c'}
                            onMouseLeave={(e) => e.target.style.color = '#dc2626'}
                          >
                            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '0.5rem' }}>
                            票务名称 *
                          </label>
                          <input
                            type="text"
                            value={price.name}
                            onChange={(e) => updatePriceData(index, 'name', e.target.value)}
                            placeholder="例如：早鸟票、VIP"
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
                            价格 ($) * (最低: $0.50)
                          </label>
                          <input
                            type="number"
                            value={price.amount_cents}
                            onChange={(e) => updatePriceData(index, 'amount_cents', e.target.value)}
                            placeholder="0.50"
                            min="0.50"
                            step="0.01"
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
                            票务种类 *
                          </label>
                          <select
                            value={price.ticket_kind || ''}
                            onChange={(e) => updatePriceData(index, 'ticket_kind', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '0.5rem',
                              color: 'white',
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              fontSize: '1rem',
                              outline: 'none',
                              cursor: 'pointer'
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
                            <option value="" style={{ color: '#111827' }}>选择票务种类...</option>
                            <option value="entry_18_20" style={{ color: '#111827' }}>入场票 (18-20)</option>
                            <option value="entry_21_plus" style={{ color: '#111827' }}>入场票 (21+)</option>
                            <option value="queue" style={{ color: '#111827' }}>排队通行证</option>
                            <option value="drink" style={{ color: '#111827' }}>饮品票</option>
                            <option value="combo" style={{ color: '#111827' }}>组合套餐 - 入场 + 饮品 (仅限21+)</option>
                          </select>
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '0.5rem' }}>
                            库存数量（留空表示无限）
                          </label>
                          <input
                            type="number"
                            value={price.inventory}
                            onChange={(e) => updatePriceData(index, 'inventory', e.target.value)}
                            placeholder="无限"
                            min="0"
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
                            每人限购
                          </label>
                          <input
                            type="number"
                            value={price.limit_per_user}
                            onChange={(e) => updatePriceData(index, 'limit_per_user', e.target.value)}
                            placeholder="无限制"
                            min="1"
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
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={addPrice}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      border: '2px dashed rgba(255, 255, 255, 0.3)',
                      borderRadius: '0.5rem',
                      color: 'rgba(255, 255, 255, 0.7)',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)'
                      e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                      e.target.style.backgroundColor = 'transparent'
                    }}
                  >
                    <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    添加票务类型
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '0.5rem',
              padding: '1rem',
              marginBottom: '1.5rem'
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
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: '500',
                border: 'none',
                cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: currentStep === 1 ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.9)'
              }}
              onMouseEnter={(e) => {
                if (currentStep !== 1) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
                }
              }}
              onMouseLeave={(e) => {
                if (currentStep !== 1) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              上一步
            </button>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => router.push('/admin/dashboard?tab=events')}
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

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#7c3aed',
                    color: 'white',
                    borderRadius: '0.5rem',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#6d28d9'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#7c3aed'}
                >
                  下一步
                </button>
              ) : (
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
              )}
            </div>
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

