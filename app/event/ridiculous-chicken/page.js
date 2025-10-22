'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RidiculousChickenEvent() {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const ticketTypes = [
    {
      id: 'regular',
      name: '普通票',
      price: 15,
      description: '包含入场券、基础餐饮、纪念品',
      features: ['入场券', '基础餐饮', '纪念品', '抽奖机会']
    },
    {
      id: 'special',
      name: '特殊票',
      price: 30,
      description: 'VIP体验，包含所有普通票权益，额外享受',
      features: ['所有普通票权益', 'VIP座位', '专属餐饮', '后台参观', '限量纪念品']
    }
  ];

  const handlePurchase = () => {
    if (!selectedTicket) {
      alert('请选择票种');
      return;
    }
    
    const ticketType = ticketTypes.find(t => t.id === selectedTicket);
    const totalPrice = ticketType.price * quantity;
    
    const paymentData = {
      event: 'Ridiculous Chicken',
      ticketType: ticketType.name,
      quantity: quantity,
      price: ticketType.price,
      total: totalPrice
    };
    
    localStorage.setItem('paymentData', JSON.stringify(paymentData));
    window.location.href = '/payment';
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <Link href="/" style={{ color: '#007bff', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}>
         返回首页
      </Link>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: '#dc3545', marginBottom: '1rem' }}>
           Ridiculous Chicken
        </h1>
        <div style={{ backgroundColor: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <p><strong> 日期:</strong> 2024年12月25日</p>
          <p><strong> 时间:</strong> 下午2:00 - 晚上10:00</p>
          <p><strong> 地点:</strong> 中央公园</p>
          <p><strong> 特色:</strong> 现场音乐、美食节、游戏互动、抽奖活动</p>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>选择票种</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {ticketTypes.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket.id)}
              style={{
                border: selectedTicket === ticket.id ? '3px solid #dc3545' : '2px solid #dee2e6',
                borderRadius: '8px',
                padding: '1.5rem',
                cursor: 'pointer',
                backgroundColor: selectedTicket === ticket.id ? '#fff5f5' : 'white',
                flex: '1',
                minWidth: '300px'
              }}
            >
              <h3 style={{ color: '#dc3545', marginBottom: '0.5rem' }}>
                {ticket.name}
              </h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc3545', marginBottom: '0.5rem' }}>
                ${ticket.price}
              </div>
              <p style={{ color: '#666', marginBottom: '1rem' }}>
                {ticket.description}
              </p>
              <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                {ticket.features.map((feature, index) => (
                  <li key={index} style={{ marginBottom: '0.25rem', color: '#555' }}>
                     {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {selectedTicket && (
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

      {selectedTicket && (
        <div style={{ backgroundColor: '#e9ecef', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', textAlign: 'center' }}>
          <strong>总价: ${ticketTypes.find(t => t.id === selectedTicket).price * quantity}</strong>
        </div>
      )}

      <button
        onClick={handlePurchase}
        disabled={!selectedTicket}
        style={{
          width: '100%',
          backgroundColor: selectedTicket ? '#dc3545' : '#6c757d',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '6px',
          border: 'none',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          cursor: selectedTicket ? 'pointer' : 'not-allowed'
        }}
      >
        {selectedTicket ? '立即购买' : '请先选择票种'}
      </button>
    </div>
  );
}
