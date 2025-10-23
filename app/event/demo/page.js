'use client';

import { useState } from 'react';
import Link from 'next/link';
import NavbarPartyTix from '../../../components/NavbarPartyTix';
import PriceSelector from '../../../components/PriceSelector';
import GradientButton from '../../../components/GradientButton';

export default function EventDemo() {
  const [quantity, setQuantity] = useState(1);
  const [priceSelection, setPriceSelection] = useState(null);
  
  const event = {
    name: "Tech Conference 2024",
    time: "2024-12-15 09:00",
    venue: "Convention Center",
    price: 99,
    description: "Join us for the biggest tech conference of the year featuring industry leaders, innovative workshops, and networking opportunities."
  };

  const prices = [
    {
      id: 1,
      name: "早鸟票",
      amount_cents: 7900, // $79
      description: "限时优惠，售完即止",
      inventory: 50
    },
    {
      id: 2,
      name: "标准票",
      amount_cents: 9900, // $99
      description: "标准价格门票",
      inventory: 200
    },
    {
      id: 3,
      name: "VIP票",
      amount_cents: 14900, // $149
      description: "包含餐点和专属区域",
      inventory: 30
    }
  ];

  const totalPrice = event.price * quantity;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <NavbarPartyTix />
      
      <div className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 活动详情 */}
            <div className="lg:col-span-2">
              <div className="bg-partytix-card rounded-xl p-8 mb-8">
                <h1 className="text-4xl font-bold text-white mb-6">{event.name}</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-slate-400 text-sm">时间</div>
                      <div className="text-white font-medium">{event.time}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-slate-400 text-sm">地点</div>
                      <div className="text-white font-medium">{event.venue}</div>
                    </div>
                  </div>
                </div>
                
                <p className="text-slate-300 leading-relaxed">{event.description}</p>
              </div>
              
              {/* PartyTix 样式的票档选择器 */}
              <div className="bg-partytix-card rounded-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-6">选择票档</h2>
                <PriceSelector 
                  prices={prices}
                  onSelectionChange={setPriceSelection}
                />
                
                {priceSelection && priceSelection.subtotal > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="flex items-center justify-between text-xl font-bold mb-4">
                      <span className="text-white">总计</span>
                      <span className="text-partytix-gradient">
                        ¥{(priceSelection.subtotal / 100).toFixed(2)}
                      </span>
                    </div>
                    <GradientButton className="w-full" size="lg">
                      立即购买 (UI Demo)
                    </GradientButton>
                    <p className="text-xs text-slate-500 mt-2 text-center">
                      * 此为 UI 演示，不影响现有支付逻辑
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* 右侧购买卡片 */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <div className="bg-partytix-card rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-6">快速购买</h3>
                  
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">数量</label>
                      <select 
                        value={quantity} 
                        onChange={(e) => setQuantity(parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {[1, 2, 3, 4, 5].map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="bg-slate-800/30 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">单价</span>
                        <span className="text-white font-medium">${event.price}</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-white font-bold">总计</span>
                        <span className="text-partytix-gradient text-xl font-bold">${totalPrice}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Link href="/success" className="block w-full">
                    <GradientButton className="w-full" size="lg">
                      前往支付 (Demo)
                    </GradientButton>
                  </Link>
                  
                  <p className="text-xs text-slate-500 mt-3 text-center">
                    此为现有支付流程演示
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


