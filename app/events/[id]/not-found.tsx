import Link from 'next/link'

/**
 * 🚫 事件详情页面 404 处理
 * 当事件不存在时显示此页面
 */
export default function EventNotFound() {
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
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '48px',
        textAlign: 'center',
        maxWidth: '600px'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '24px' }}>🎫</div>
        
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '16px'
        }}>
          事件未找到
        </h1>
        
        <p style={{
          color: '#cbd5e1',
          fontSize: '1.1rem',
          marginBottom: '32px',
          lineHeight: '1.6'
        }}>
          抱歉，您要查找的事件不存在或已被删除。
          <br />
          请检查链接是否正确，或浏览其他可用事件。
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          alignItems: 'center'
        }}>
          <Link 
            href="/events"
            style={{
              display: 'inline-block',
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '1.1rem',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLAnchorElement
              target.style.transform = 'scale(1.05)'
              target.style.boxShadow = '0 10px 25px rgba(124, 58, 237, 0.3)'
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLAnchorElement
              target.style.transform = 'scale(1)'
              target.style.boxShadow = 'none'
            }}
          >
            浏览所有事件
          </Link>
          
          <Link 
            href="/"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: 'rgba(55, 65, 81, 0.5)',
              color: '#cbd5e1',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLAnchorElement
              target.style.backgroundColor = 'rgba(55, 65, 81, 0.7)'
              target.style.color = 'white'
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLAnchorElement
              target.style.backgroundColor = 'rgba(55, 65, 81, 0.5)'
              target.style.color = '#cbd5e1'
            }}
          >
            返回首页
          </Link>
        </div>

        <div style={{
          marginTop: '32px',
          padding: '16px',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '8px'
        }}>
          <h3 style={{ color: '#60a5fa', marginBottom: '8px', fontSize: '1rem' }}>
            💡 提示
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
            如果您是通过链接访问此页面，请确认链接是否正确。
            您也可以尝试刷新页面或清除浏览器缓存。
          </p>
        </div>
      </div>
    </div>
  )
}
