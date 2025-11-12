'use client'

import { useState, useEffect } from 'react'

export default function EventCreationForm({ 
  onSubmit, 
  onCancel, 
  initialData = null, 
  isEditing = false,
  merchantId = null 
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    location: '',
    poster_url: '',
    merchant_id: merchantId || '',
    status: 'published',
    prices: []
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (initialData) {
      // 处理初始数据
      const startDate = initialData.start_at || initialData.startTime || ''
      const endDate = initialData.end_at || initialData.endTime || ''
      
      // 解析日期时间
      let startDateStr = ''
      let startTimeStr = ''
      let endDateStr = ''
      let endTimeStr = ''
      
      if (startDate) {
        const start = new Date(startDate)
        startDateStr = start.toISOString().split('T')[0]
        startTimeStr = start.toTimeString().slice(0, 5)
      }
      
      if (endDate) {
        const end = new Date(endDate)
        endDateStr = end.toISOString().split('T')[0]
        endTimeStr = end.toTimeString().slice(0, 5)
      }

      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        startDate: startDateStr,
        startTime: startTimeStr,
        endDate: endDateStr,
        endTime: endTimeStr,
        location: initialData.location || initialData.address || '',
        poster_url: initialData.poster_url || '',
        merchant_id: initialData.merchant_id || merchantId || '',
        status: initialData.status || 'published',
        prices: initialData.prices || initialData.ticket_types || []
      })
    } else if (merchantId) {
      setFormData(prev => ({ ...prev, merchant_id: merchantId }))
    }
  }, [initialData, merchantId])

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.title.trim()) {
      newErrors.title = '标题是必填项'
    }
    
    if (!formData.description.trim()) {
      newErrors.description = '描述是必填项'
    }
    
    if (!formData.startDate) {
      newErrors.startDate = '开始日期是必填项'
    }
    
    if (!formData.startTime) {
      newErrors.startTime = '开始时间是必填项'
    }
    
    if (!formData.endDate) {
      newErrors.endDate = '结束日期是必填项'
    }
    
    if (!formData.endTime) {
      newErrors.endTime = '结束时间是必填项'
    }
    
    if (!formData.location.trim()) {
      newErrors.location = '地点是必填项'
    }
    
    // 验证日期时间逻辑
    if (formData.startDate && formData.endDate) {
      const start = new Date(`${formData.startDate}T${formData.startTime}`)
      const end = new Date(`${formData.endDate}T${formData.endTime}`)
      
      if (end <= start) {
        newErrors.endDate = '结束时间必须晚于开始时间'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setSubmitting(true)
    
    try {
      // 组合日期和时间为 ISO 字符串
      const startTime = new Date(`${formData.startDate}T${formData.startTime}`).toISOString()
      const endTime = new Date(`${formData.endDate}T${formData.endTime}`).toISOString()
      
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        startTime,
        endTime,
        location: formData.location.trim(),
        poster_url: formData.poster_url.trim() || null,
        merchant_id: formData.merchant_id || null,
        prices: formData.prices.map(price => ({
          name: price.name || '',
          amount_cents: parseInt(price.amount_cents) || 0,
          inventory: price.inventory !== null && price.inventory !== undefined 
            ? parseInt(price.inventory) 
            : null,
          limit_per_user: parseInt(price.limit_per_user) || 4
        })),
        status: formData.status
      }
      
      await onSubmit(eventData)
    } catch (error) {
      console.error('Form submission error:', error)
      alert(error.message || '保存活动失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const addPrice = () => {
    setFormData(prev => ({
      ...prev,
      prices: [...prev.prices, {
        name: '',
        amount_cents: 0,
        inventory: null,
        limit_per_user: 4
      }]
    }))
  }

  const removePrice = (index) => {
    setFormData(prev => ({
      ...prev,
      prices: prev.prices.filter((_, i) => i !== index)
    }))
  }

  const updatePrice = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      prices: prev.prices.map((price, i) => 
        i === index ? { ...price, [field]: value } : price
      )
    }))
  }

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.95)',
      borderRadius: '16px',
      padding: '32px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      color: 'white',
      maxWidth: '800px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto'
    }}>
      <h2 style={{ 
        fontSize: '24px', 
        marginBottom: '24px',
        fontWeight: '600'
      }}>
        {isEditing ? '编辑活动' : '创建活动'}
      </h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* 标题 */}
        <div>
          <label style={{
            display: 'block',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px'
          }}>
            标题 *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="输入活动标题..."
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: errors.title ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          {errors.title && (
            <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
              {errors.title}
            </div>
          )}
        </div>

        {/* 描述 */}
        <div>
          <label style={{
            display: 'block',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px'
          }}>
            描述 *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="输入活动描述..."
            rows={4}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: errors.description ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              fontSize: '14px',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
          {errors.description && (
            <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
              {errors.description}
            </div>
          )}
        </div>

        {/* 日期时间 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{
              display: 'block',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              开始日期 *
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: errors.startDate ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            {errors.startDate && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.startDate}
              </div>
            )}
          </div>
          <div>
            <label style={{
              display: 'block',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              开始时间 *
            </label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: errors.startTime ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            {errors.startTime && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.startTime}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{
              display: 'block',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              结束日期 *
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: errors.endDate ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            {errors.endDate && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.endDate}
              </div>
            )}
          </div>
          <div>
            <label style={{
              display: 'block',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              结束时间 *
            </label>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: errors.endTime ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            {errors.endTime && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.endTime}
              </div>
            )}
          </div>
        </div>

        {/* 地点 */}
        <div>
          <label style={{
            display: 'block',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px'
          }}>
            地点 *
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            placeholder="输入活动地点..."
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: errors.location ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          {errors.location && (
            <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
              {errors.location}
            </div>
          )}
        </div>

        {/* 海报URL */}
        <div>
          <label style={{
            display: 'block',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px'
          }}>
            海报URL
          </label>
          <input
            type="url"
            value={formData.poster_url}
            onChange={(e) => setFormData(prev => ({ ...prev, poster_url: e.target.value }))}
            placeholder="输入海报图片URL（可选）..."
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        {/* 商家ID */}
        {merchantId && (
          <div>
            <label style={{
              display: 'block',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              商家ID
            </label>
            <input
              type="text"
              value={formData.merchant_id}
              onChange={(e) => setFormData(prev => ({ ...prev, merchant_id: e.target.value }))}
              placeholder="商家ID..."
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
        )}

        {/* 状态 */}
        <div>
          <label style={{
            display: 'block',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px'
          }}>
            状态
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              fontSize: '14px',
              outline: 'none'
            }}
          >
            <option value="published">已发布</option>
            <option value="draft">草稿</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>

        {/* 价格/票务类型 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <label style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              票务类型
            </label>
            <button
              type="button"
              onClick={addPrice}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                background: 'rgba(124, 58, 237, 0.2)',
                color: '#a78bfa',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              + 添加票务类型
            </button>
          </div>

          {formData.prices.map((price, index) => (
            <div
              key={index}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', fontWeight: '500' }}>
                  票务类型 #{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removePrice(index)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  删除
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="票务类型名称"
                  value={price.name || ''}
                  onChange={(e) => updatePrice(index, 'name', e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
                <input
                  type="number"
                  placeholder="价格（分）"
                  value={price.amount_cents || ''}
                  onChange={(e) => updatePrice(index, 'amount_cents', parseInt(e.target.value) || 0)}
                  min="0"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
                <input
                  type="number"
                  placeholder="库存（空=无限）"
                  value={price.inventory === null || price.inventory === undefined ? '' : price.inventory}
                  onChange={(e) => updatePrice(index, 'inventory', e.target.value === '' ? null : parseInt(e.target.value))}
                  min="0"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
                <input
                  type="number"
                  placeholder="每人限购"
                  value={price.limit_per_user || ''}
                  onChange={(e) => updatePrice(index, 'limit_per_user', parseInt(e.target.value) || 4)}
                  min="1"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          ))}

          {formData.prices.length === 0 && (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '14px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: '1px dashed rgba(255, 255, 255, 0.2)'
            }}>
              暂无票务类型，点击上方按钮添加
            </div>
          )}
        </div>

        {/* 按钮 */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'transparent',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            取消
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-partytix-gradient"
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              opacity: submitting ? 0.6 : 1
            }}
          >
            {submitting ? '保存中...' : (isEditing ? '保存更改' : '创建活动')}
          </button>
        </div>
      </form>
    </div>
  )
}
