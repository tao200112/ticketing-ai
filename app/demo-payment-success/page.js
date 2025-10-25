'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function DemoPaymentSuccess() {
  const [ticketData, setTicketData] = useState(null)

  useEffect(() => {
    // 模拟生成票务数据
    const ticket = {
      id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventName: 'Ridiculous Chicken Night Event',
      ticketType: 'Regular Ticket (21+)',
      price: '15.00',
      purchaseDate: new Date().toLocaleDateString('en-US'),
      status: 'valid',
      customerEmail: 'demo@example.com',
      qrCode: JSON.stringify({
        ticketId: `ticket_${Date.now()}`,
        eventName: 'Ridiculous Chicken Night Event',
        ticketType: 'Regular Ticket (21+)',
        purchaseDate: new Date().toLocaleDateString('en-US'),
        price: '15.00',
        customerEmail: 'demo@example.com'
      })
    }
    
    setTicketData(ticket)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '600px',
        width: '100%',
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ marginBottom: '30px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '40px'
          }}>
            ✅
          </div>
          <h1 style={{
            color: 'white',
            fontSize: '28px',
            fontWeight: 'bold',
            marginBottom: '10px'
          }}>
            支付成功！
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '16px'
          }}>
            您的票务已成功购买
          </p>
        </div>

        {ticketData && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '30px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{
              color: 'white',
              fontSize: '18px',
              marginBottom: '15px'
            }}>
              票务信息
            </h3>
            <div style={{
              display: 'grid',
              gap: '10px',
              textAlign: 'left'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: 'rgba(255, 255, 255, 0.9)'
              }}>
                <span>活动名称:</span>
                <span>{ticketData.eventName}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: 'rgba(255, 255, 255, 0.9)'
              }}>
                <span>票种类型:</span>
                <span>{ticketData.ticketType}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: 'rgba(255, 255, 255, 0.9)'
              }}>
                <span>价格:</span>
                <span>${ticketData.price}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: 'rgba(255, 255, 255, 0.9)'
              }}>
                <span>购买日期:</span>
                <span>{ticketData.purchaseDate}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: 'rgba(255, 255, 255, 0.9)'
              }}>
                <span>票务ID:</span>
                <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                  {ticketData.id}
                </span>
              </div>
            </div>
          </div>
        )}

        <div style={{
          display: 'flex',
          gap: '15px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <Link href="/events" style={{
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '600',
            transition: 'all 0.3s ease'
          }}>
            查看更多活动
          </Link>
          <Link href="/" style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '600',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            transition: 'all 0.3s ease'
          }}>
            返回首页
          </Link>
        </div>

        <div style={{
          marginTop: '30px',
          padding: '15px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '14px',
            margin: 0
          }}>
            💡 这是演示模式。要启用真实的Stripe支付，请配置Stripe环境变量。
          </p>
        </div>
      </div>
    </div>
  )
}
