'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * 价格选择器组件
 * 
 * 从数据库加载的价格列表中选择票种
 */
export function PriceSelector({ prices, eventSlug }) {
  const [selectedPrice, setSelectedPrice] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const router = useRouter()

  const handlePurchase = () => {
    if (!selectedPrice) {
      alert('请选择票种')
      return
    }

    // 计算总价
    const totalPrice = selectedPrice.amountCents * quantity

    // 准备支付数据
    const paymentData = {
      eventSlug,
      priceId: selectedPrice.id,
      tier: selectedPrice.name,
      quantity,
      unitPrice: selectedPrice.amountCents,
      totalPrice,
      currency: selectedPrice.currency
    }

    // 存储到 localStorage（临时，后续 PR-5 会改为服务端处理）
    localStorage.setItem('paymentData', JSON.stringify(paymentData))
    
    // 跳转到支付页
    router.push('/payment')
  }

  const formatPrice = (cents, currency = 'usd') => {
    const price = (cents / 100).toFixed(2)
    return `$${price}`
  }

  return (
    <>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>选择票种</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {prices.map((price) => (
            <div
              key={price.id}
              onClick={() => setSelectedPrice(price)}
              style={{
                border: selectedPrice?.id === price.id ? '3px solid #dc3545' : '2px solid #dee2e6',
                borderRadius: '8px',
                padding: '1.5rem',
                cursor: 'pointer',
                backgroundColor: selectedPrice?.id === price.id ? '#fff5f5' : 'white',
                flex: '1',
                minWidth: '300px'
              }}
            >
              <h3 style={{ color: '#dc3545', marginBottom: '0.5rem' }}>
                {price.name}
              </h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc3545', marginBottom: '0.5rem' }}>
                {formatPrice(price.amountCents, price.currency)}
              </div>
              {price.inventory > 0 && (
                <p style={{ color: '#666', fontSize: '0.9rem' }}>
                  剩余: {price.inventory} 张
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedPrice && (
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            数量:
          </label>
          <select 
            value={quantity} 
            onChange={(e) => setQuantity(parseInt(e.target.value))}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '1rem' }}
          >
            {[1, 2, 3, 4, 5].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
      )}

      {selectedPrice && (
        <div style={{ backgroundColor: '#e9ecef', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', textAlign: 'center' }}>
          <strong>总价: {formatPrice(selectedPrice.amountCents * quantity, selectedPrice.currency)}</strong>
        </div>
      )}

      <button
        onClick={handlePurchase}
        disabled={!selectedPrice}
        style={{
          width: '100%',
          backgroundColor: selectedPrice ? '#dc3545' : '#6c757d',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '6px',
          border: 'none',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          cursor: selectedPrice ? 'pointer' : 'not-allowed'
        }}
      >
        {selectedPrice ? '立即购买' : '请先选择票种'}
      </button>
    </>
  )
}
