'use client'

import { useState, useEffect } from 'react'

export default function PriceSelector({ prices = [], onSelectionChange, className = '' }) {
  const [selectedPrices, setSelectedPrices] = useState({})
  const [quantities, setQuantities] = useState({})

  useEffect(() => {
    // 初始化选择状态
    const initialSelection = {}
    const initialQuantities = {}
    prices.forEach(price => {
      initialSelection[price.id] = false
      initialQuantities[price.id] = 0
    })
    setSelectedPrices(initialSelection)
    setQuantities(initialQuantities)
  }, [prices])

  const handlePriceToggle = (priceId) => {
    setSelectedPrices(prev => ({
      ...prev,
      [priceId]: !prev[priceId]
    }))
    
    if (!selectedPrices[priceId]) {
      setQuantities(prev => ({
        ...prev,
        [priceId]: 1
      }))
    } else {
      setQuantities(prev => ({
        ...prev,
        [priceId]: 0
      }))
    }
  }

  const handleQuantityChange = (priceId, quantity) => {
    const numQuantity = Math.max(0, parseInt(quantity) || 0)
    setQuantities(prev => ({
      ...prev,
      [priceId]: numQuantity
    }))
    
    setSelectedPrices(prev => ({
      ...prev,
      [priceId]: numQuantity > 0
    }))
  }

  const calculateSubtotal = () => {
    return prices.reduce((total, price) => {
      const quantity = quantities[price.id] || 0
      return total + (price.amount_cents * quantity)
    }, 0)
  }

  const getSelectedItems = () => {
    return prices.filter(price => selectedPrices[price.id] && quantities[price.id] > 0)
      .map(price => ({
        ...price,
        quantity: quantities[price.id]
      }))
  }

  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange({
        items: getSelectedItems(),
        subtotal: calculateSubtotal(),
        totalQuantity: Object.values(quantities).reduce((sum, qty) => sum + qty, 0)
      })
    }
  }, [selectedPrices, quantities])

  const formatPrice = (amountCents) => {
    return `¥${(amountCents / 100).toFixed(2)}`
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">选择票档</h3>
      
      {prices.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-slate-400 mb-2">暂无票档</div>
          <div className="text-sm text-slate-500">请联系主办方获取票务信息</div>
        </div>
      ) : (
        <>
          {/* 票档列表 */}
          <div className="space-y-3">
            {prices.map((price) => (
              <div 
                key={price.id} 
                className={`p-4 rounded-lg border transition-all duration-200 ${
                  selectedPrices[price.id] 
                    ? 'bg-purple-500/10 border-purple-500/30' 
                    : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedPrices[price.id]}
                        onChange={() => handlePriceToggle(price.id)}
                        className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500 focus:ring-2"
                      />
                      <div>
                        <h4 className="font-medium text-white">{price.name}</h4>
                        <div className="text-sm text-slate-400">
                          {price.description && <span>{price.description}</span>}
                          {price.inventory && (
                            <span className="ml-2">
                              剩余: {price.inventory} 张
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-white">
                      {formatPrice(price.amount_cents)}
                    </span>
                    
                    {selectedPrices[price.id] && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantityChange(price.id, quantities[price.id] - 1)}
                          className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors"
                          disabled={quantities[price.id] <= 0}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={quantities[price.id]}
                          onChange={(e) => handleQuantityChange(price.id, e.target.value)}
                          className="w-12 text-center bg-slate-700 border border-slate-600 rounded text-white text-sm py-1"
                        />
                        <button
                          onClick={() => handleQuantityChange(price.id, quantities[price.id] + 1)}
                          className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors"
                          disabled={price.inventory && quantities[price.id] >= price.inventory}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 小计 */}
          {calculateSubtotal() > 0 && (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span className="text-white">小计</span>
                <span className="text-partytix-gradient">
                  {formatPrice(calculateSubtotal())}
                </span>
              </div>
              <div className="text-sm text-slate-400 mt-1">
                共 {Object.values(quantities).reduce((sum, qty) => sum + qty, 0)} 张票
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
