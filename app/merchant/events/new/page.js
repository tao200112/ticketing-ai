'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getTicketKindDisplayName } from '@/lib/ticket-helpers'

export default function NewEventWizardPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [merchantUser, setMerchantUser] = useState(null)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)

  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    poster: null,
    posterPreview: null,
    prices: [
      { name: '', amount_cents: '', inventory: '', limit_per_user: '', ticket_kind: '' }
    ]
  })

  useEffect(() => {
    // 检查商家登录状态
    const checkMerchantAuth = () => {
      setIsLoadingAuth(true)
      const token = localStorage.getItem('merchantToken')
      const user = localStorage.getItem('merchantUser')
      
      if (!token || !user) {
        router.push('/merchant/auth/login')
        return
      }
      
      try {
        const userData = JSON.parse(user)
        setMerchantUser(userData)
      } catch (err) {
        console.error('Error parsing merchant user data:', err)
        router.push('/merchant/auth/login')
      } finally {
        setIsLoadingAuth(false)
      }
    }
    
    checkMerchantAuth()
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
      // 验证商家用户是否已加载
      if (!merchantUser) {
        setError('Merchant information is not loaded. Please refresh the page.')
        setIsSubmitting(false)
        return
      }

      // 验证必填字段
      if (!eventData.title || !eventData.description || !eventData.startTime || !eventData.endTime || !eventData.location) {
        setError('Please fill in all required fields')
        setIsSubmitting(false)
        return
      }

      // 验证价格设置（库存是可选的，留空表示无限，但ticket_kind是必需的）
      const validPrices = eventData.prices.filter(price => price.name && price.amount_cents && price.ticket_kind)
      if (validPrices.length === 0) {
        setError('Please set at least one valid ticket type with ticket kind selected')
        setIsSubmitting(false)
        return
      }

      // 验证价格是否符合 Stripe 最小金额要求
      const invalidPrices = validPrices.filter(price => parseFloat(price.amount_cents) < 0.50)
      if (invalidPrices.length > 0) {
        setError('All ticket prices must be at least $0.50 (Stripe minimum requirement)')
        setIsSubmitting(false)
        return
      }

      // 获取 merchant_id，支持多种可能的字段名
      const merchantId = merchantUser.merchant_id || merchantUser.merchant?.id || null
      
      if (!merchantId) {
        setError('Merchant ID is required. Please ensure you are logged in as a merchant.')
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
          poster_url: eventData.posterPreview,
          merchant_id: merchantId,
          prices: validPrices.map(price => ({
            name: price.name,
            amount_cents: Math.round(parseFloat(price.amount_cents) * 100), // 将美元转换为分
            inventory: price.inventory && price.inventory.trim() !== '' ? parseInt(price.inventory) : null, // null表示无限库存
            limit_per_user: price.limit_per_user ? parseInt(price.limit_per_user) : null,
            ticket_kind: price.ticket_kind && price.ticket_kind.trim() !== '' ? price.ticket_kind : null
          })),
          status: 'published'
        }),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.message || 'Failed to create event')
        setIsSubmitting(false)
        return
      }

      console.log('✅ Event created successfully:', result.data)
      
      router.push('/merchant/events')
    } catch (err) {
      setError('Failed to create event, please try again')
      console.error('Error creating event:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const steps = [
    { number: 1, title: 'Basic Info', description: 'Fill in basic event information' },
    { number: 2, title: 'Poster Upload', description: 'Upload event poster' },
    { number: 3, title: 'Ticket Settings', description: 'Set ticket types and prices' }
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
          <div style={{ fontSize: '18px', marginBottom: '20px' }}>Loading...</div>
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

  // 如果商家用户未加载，不显示表单
  if (!merchantUser) {
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
          <div style={{ fontSize: '18px', marginBottom: '20px' }}>Please log in to create events</div>
          <button
            onClick={() => router.push('/merchant/auth/login')}
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
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)'
    }}>
      {/* Navigation Bar */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
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
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: 0 }}>Create Event</h1>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', margin: 0 }}>Set up your event details</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>Step {currentStep} / 3</span>
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
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'white', marginBottom: '1.5rem' }}>Event Basic Information</h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '0.5rem' }}>
                      Event Title *
                    </label>
                    <input
                      type="text"
                      value={eventData.title}
                      onChange={(e) => updateEventData('title', e.target.value)}
                      placeholder="Enter event title"
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
                      Event Description *
                    </label>
                    <textarea
                      value={eventData.description}
                      onChange={(e) => updateEventData('description', e.target.value)}
                      placeholder="Describe your event in detail"
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
                        Start Time *
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
                        End Time *
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
                      Event Location *
                    </label>
                    <input
                      type="text"
                      value={eventData.location}
                      onChange={(e) => updateEventData('location', e.target.value)}
                      placeholder="Enter event location"
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

          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'white', marginBottom: '1.5rem' }}>Event Poster</h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '0.5rem' }}>
                      Upload Poster Image
                    </label>
                    <div style={{
                      border: '2px dashed #d1d5db',
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
                              onClick={() => {
                                updateEventData('poster', null)
                                updateEventData('posterPreview', null)
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
                              Remove Image
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div style={{
                            width: '4rem',
                            height: '4rem',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto'
                          }}>
                            <svg style={{ width: '2rem', height: '2rem', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p style={{ color: 'white', fontWeight: '500', margin: 0 }}>Click to upload poster</p>
                            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', margin: 0 }}>Supports JPG, PNG format, recommended size 1200x630</p>
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
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'white', marginBottom: '1.5rem' }}>Ticket Settings</h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {eventData.prices.map((price, index) => (
                    <div key={index} style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '0.5rem',
                      padding: '1.5rem',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '500', color: 'white', margin: 0 }}>Ticket Type {index + 1}</h3>
                        {eventData.prices.length > 1 && (
                          <button
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
                            Ticket Name *
                          </label>
                          <input
                            type="text"
                            value={price.name}
                            onChange={(e) => updatePriceData(index, 'name', e.target.value)}
                            placeholder="e.g.: Early Bird, VIP"
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
                            Price ($) * (Minimum: $0.50)
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
                            Ticket Kind *
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
                            <option value="">Select ticket kind...</option>
                            <option value="entry_18_20">Entry Ticket (18-20)</option>
                            <option value="entry_21_plus">Entry Ticket (21+)</option>
                            <option value="queue">Queue Pass</option>
                            <option value="drink">Drink Ticket</option>
                            <option value="combo">Combo Package - Entry + Drink (21+ Only)</option>
                          </select>
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '0.5rem' }}>
                            Stock Quantity (Leave empty for unlimited)
                          </label>
                          <input
                            type="number"
                            value={price.inventory}
                            onChange={(e) => updatePriceData(index, 'inventory', e.target.value)}
                            placeholder="Unlimited"
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
                            Limit per Person
                          </label>
                          <input
                            type="number"
                            value={price.limit_per_user}
                            onChange={(e) => updatePriceData(index, 'limit_per_user', e.target.value)}
                            placeholder="No limit"
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
                    onClick={addPrice}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      border: '2px dashed #d1d5db',
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
                    Add Ticket Type
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
            borderTop: '1px solid #e5e7eb'
          }}>
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: '500',
                border: 'none',
                cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                backgroundColor: currentStep === 1 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.1)',
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
              Previous
            </button>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => router.back()}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#f3f4f6',
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
                Cancel
              </button>

              {currentStep < 3 ? (
                <button
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
                  Next
                </button>
              ) : (
                <button
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
                      Creating...
                    </>
                  ) : (
                    'Create Event'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}