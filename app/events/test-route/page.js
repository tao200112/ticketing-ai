'use client'

export default function TestRoutePage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px'
    }}>
      <div style={{
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(124, 58, 237, 0.3)',
        borderRadius: '16px',
        padding: '2rem',
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '1rem'
        }}>
          ✅ 路由测试成功
        </h1>
        
        <p style={{
          color: '#94a3b8',
          marginBottom: '2rem',
          lineHeight: '1.6'
        }}>
          如果您能看到这个页面，说明活动路由系统正常工作。
        </p>
        
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: '#6ee7b7',
            margin: '0'
          }}>
            🎯 测试路由: /events/test-route
          </p>
        </div>
        
        <a
          href="/events"
          style={{
            backgroundColor: '#7c3aed',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            fontWeight: '500',
            textDecoration: 'none',
            display: 'inline-block'
          }}
        >
          返回活动列表
        </a>
      </div>
    </div>
  )
}
