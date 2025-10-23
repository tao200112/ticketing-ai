'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { hasSupabase } from '../../../../lib/safeEnv'

export default function NewEventWizardPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [eventData, setEventData] = useState({
    // Step 1: 基本信息
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    
    // Step 2: 海报
    poster: null,
    posterPreview: null,
    
    // Step 3: 票档与定价
    prices: [
      { name: '', amount_cents: '', inventory: '', limit_per_user: '' }
    ]
  })

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
      prices: [...prev.prices, { name: '', amount_cents: '', inventory: '', limit_per_user: '' }]
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setEventData(prev => ({
        ...prev,
        poster: file,
        posterPreview: URL.createObjectURL(file)
      }))
    }
  }

  const uploadPoster = async (file) => {
    if (!hasSupabase()) {
      return { success: false, message: 'Supabase 不可用，仅保存预览' }
    }

    try {
      // 这里可以添加真实的 Supabase Storage 上传逻辑
      // 暂时返回模拟成功
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { success: true, url: 'mock-poster-url' }
    } catch (error) {
      return { success: false, message: '上传失败' }
    }
  }

  const saveEvent = async () => {
    setIsSubmitting(true)
    setError('')

    try {
      // 上传海报
      let posterUrl = null
      if (eventData.poster) {
        const uploadResult = await uploadPoster(eventData.poster)
        if (uploadResult.success) {
          posterUrl = uploadResult.url
        }
      }

      const finalEventData = {
        ...eventData,
        poster_url: posterUrl,
        created_at: new Date().toISOString(),
        status: 'draft'
      }

      if (hasSupabase()) {
        try {
          // 尝试保存到 Supabase
          // 这里可以添加真实的 Supabase 保存逻辑
          console.log('保存到 Supabase:', finalEventData)
        } catch (dbError) {
          console.log('Supabase 保存失败，降级到本地存储:', dbError)
          // 降级到 localStorage
          const existingEvents = JSON.parse(localStorage.getItem('merchant_events') || '[]')
          existingEvents.push({ ...finalEventData, id: Date.now() })
          localStorage.setItem('merchant_events', JSON.stringify(existingEvents))
        }
      } else {
        // 保存到 localStorage
        const existingEvents = JSON.parse(localStorage.getItem('merchant_events') || '[]')
        existingEvents.push({ ...finalEventData, id: Date.now() })
        localStorage.setItem('merchant_events', JSON.stringify(existingEvents))
      }

      // 跳转到活动列表
      router.push('/merchant/events')
    } catch (err) {
      setError(err.message)
      console.error('保存活动错误:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return eventData.title && eventData.startTime && eventData.location
      case 2:
        return true // 海报是可选的
      case 3:
        return eventData.prices.every(price => price.name && price.amount_cents && price.inventory)
      case 4:
        return true
      default:
        return false
    }
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const steps = [
    { number: 1, title: '基本信息', description: '填写活动的基本信息' },
    { number: 2, title: '海报上传', description: '上传活动海报' },
    { number: 3, title: '票档定价', description: '设置票档和价格' },
    { number: 4, title: '预览保存', description: '确认信息并保存' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 步骤指示器 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-white">发布活动</h1>
            <span className="text-slate-400">步骤 {currentStep}/4</span>
          </div>
          
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  currentStep >= step.number 
                    ? 'bg-partytix-gradient text-white' 
                    : 'bg-slate-700 text-slate-400'
                }`}>
                  {step.number}
                </div>
                <div className="ml-2 hidden md:block">
                  <div className={`text-sm font-medium ${
                    currentStep >= step.number ? 'text-white' : 'text-slate-400'
                  }`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-slate-500">{step.description}</div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    currentStep > step.number ? 'bg-purple-500' : 'bg-slate-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 表单内容 */}
        <div className="bg-partytix-card rounded-xl p-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">基本信息</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">活动标题 *</label>
                <input
                  type="text"
                  value={eventData.title}
                  onChange={(e) => updateEventData('title', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="输入活动标题"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">活动描述</label>
                <textarea
                  value={eventData.description}
                  onChange={(e) => updateEventData('description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="描述您的活动"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">开始时间 *</label>
                  <input
                    type="datetime-local"
                    value={eventData.startTime}
                    onChange={(e) => updateEventData('startTime', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">结束时间</label>
                  <input
                    type="datetime-local"
                    value={eventData.endTime}
                    onChange={(e) => updateEventData('endTime', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">活动场地 *</label>
                <input
                  type="text"
                  value={eventData.location}
                  onChange={(e) => updateEventData('location', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="输入活动场地地址"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">海报上传</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">活动海报</label>
                <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="poster-upload"
                  />
                  <label
                    htmlFor="poster-upload"
                    className="cursor-pointer"
                  >
                    {eventData.posterPreview ? (
                      <div>
                        <img
                          src={eventData.posterPreview}
                          alt="海报预览"
                          className="max-w-full max-h-64 mx-auto rounded-lg mb-4"
                        />
                        <p className="text-slate-400">点击更换海报</p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-4xl mb-4">📸</div>
                        <p className="text-slate-400">点击上传海报</p>
                        <p className="text-sm text-slate-500 mt-2">支持 JPG、PNG 格式</p>
                      </div>
                    )}
                  </label>
                </div>
                {hasSupabase() ? (
                  <p className="text-sm text-green-400 mt-2">✓ 支持上传到云端存储</p>
                ) : (
                  <p className="text-sm text-yellow-400 mt-2">⚠ 仅本地预览，云端存储不可用</p>
                )}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">票档与定价</h2>
              
              <div className="space-y-4">
                {eventData.prices.map((price, index) => (
                  <div key={index} className="bg-slate-800/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-white">票档 {index + 1}</h3>
                      {eventData.prices.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePrice(index)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          删除
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">票档名称 *</label>
                        <input
                          type="text"
                          value={price.name}
                          onChange={(e) => updatePriceData(index, 'name', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="如：早鸟票"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">价格（分） *</label>
                        <input
                          type="number"
                          value={price.amount_cents}
                          onChange={(e) => updatePriceData(index, 'amount_cents', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="5000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">库存 *</label>
                        <input
                          type="number"
                          value={price.inventory}
                          onChange={(e) => updatePriceData(index, 'inventory', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">限购数量</label>
                        <input
                          type="number"
                          value={price.limit_per_user}
                          onChange={(e) => updatePriceData(index, 'limit_per_user', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="2"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                type="button"
                onClick={addPrice}
                className="w-full py-3 border-2 border-dashed border-white/20 rounded-lg text-slate-400 hover:text-white hover:border-white/40 transition-colors"
              >
                + 添加票档
              </button>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">预览 & 保存</h2>
              
              <div className="bg-slate-800/30 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-4">{eventData.title}</h3>
                <p className="text-slate-300 mb-4">{eventData.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-slate-400">开始时间:</span>
                    <div className="text-white">{eventData.startTime ? new Date(eventData.startTime).toLocaleString('zh-CN') : '未设置'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">结束时间:</span>
                    <div className="text-white">{eventData.endTime ? new Date(eventData.endTime).toLocaleString('zh-CN') : '未设置'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">活动场地:</span>
                    <div className="text-white">{eventData.location}</div>
                  </div>
                </div>
                
                <div>
                  <span className="text-slate-400">票档信息:</span>
                  <div className="mt-2 space-y-2">
                    {eventData.prices.map((price, index) => (
                      <div key={index} className="flex items-center justify-between bg-slate-700/50 rounded p-2">
                        <span className="text-white">{price.name}</span>
                        <span className="text-white">¥{(price.amount_cents / 100).toFixed(2)}</span>
                        <span className="text-slate-400">库存: {price.inventory}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* 导航按钮 */}
          <div className="flex items-center justify-between mt-8">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              上一步
            </button>
            
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!validateStep(currentStep)}
                className="btn-partytix-gradient disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一步
              </button>
            ) : (
              <button
                type="button"
                onClick={saveEvent}
                disabled={isSubmitting}
                className="btn-partytix-gradient disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '保存中...' : '保存活动'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
