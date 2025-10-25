'use client'

import Link from 'next/link'

export default function TestRoutePage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      padding: '32px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '32px',
        textAlign: 'center',
        maxWidth: '600px'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '16px'
        }}>
          🧪 路由测试页面
        </h1>
        
        <p style={{
          color: '#cbd5e1',
          fontSize: '1.1rem',
          marginBottom: '24px'
        }}>
          此页面用于测试事件路由是否正常工作
        </p>

        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ color: 'white', marginBottom: '16px' }}>测试链接：</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link 
              href="/events/ridiculous-chicken"
              style={{
                display: 'block',
                padding: '12px 24px',
                backgroundColor: 'rgba(124, 58, 237, 0.2)',
                border: '1px solid #7c3aed',
                borderRadius: '8px',
                color: 'white',
                textDecoration: 'none',
                transition: 'all 0.3s ease'
              }}
            >
              🐔 Ridiculous Chicken Event
            </Link>
            
            <Link 
              href="/events/test-event-1"
              style={{
                display: 'block',
                padding: '12px 24px',
                backgroundColor: 'rgba(55, 65, 81, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: 'white',
                textDecoration: 'none',
                transition: 'all 0.3s ease'
              }}
            >
              🎫 Test Event 1
            </Link>
            
            <Link 
              href="/events/aa"
              style={{
                display: 'block',
                padding: '12px 24px',
                backgroundColor: 'rgba(55, 65, 81, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: 'white',
                textDecoration: 'none',
                transition: 'all 0.3s ease'
              }}
            >
              📝 Event "aa"
            </Link>
          </div>
        </div>

        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <h3 style={{ color: '#6ee7b7', marginBottom: '8px' }}>✅ 修复状态</h3>
          <ul style={{ color: '#94a3b8', textAlign: 'left', fontSize: '0.9rem' }}>
            <li>删除了冲突的 [slug] 路由</li>
            <li>修复了 EventCard 组件链接生成</li>
            <li>添加了 SSR 回退机制</li>
            <li>确保所有事件ID都能正确解析</li>
          </ul>
        </div>

        <Link 
          href="/events"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '600'
          }}
        >
          返回事件列表
        </Link>
      </div>
    </div>
  )
}