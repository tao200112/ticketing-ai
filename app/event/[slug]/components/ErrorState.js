/**
 * 错误状态组件
 */
export function ErrorState({ message }) {
  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '800px', 
      margin: '0 auto',
      textAlign: 'center'
    }}>
      <div style={{
        backgroundColor: '#fff5f5',
        border: '2px solid #feb2b2',
        borderRadius: '8px',
        padding: '2rem'
      }}>
        <h2 style={{ color: '#dc3545', marginBottom: '1rem' }}>
          ⚠️ 无法加载活动信息
        </h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          {message}
        </p>
        <a 
          href="/" 
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#dc3545',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 'bold'
          }}
        >
          返回首页
        </a>
      </div>
    </div>
  )
}
