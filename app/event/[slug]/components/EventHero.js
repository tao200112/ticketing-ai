import Link from 'next/link'

/**
 * 活动头部组件
 */
export function EventHero({ title, date, poster, venue }) {
  return (
    <>
      <Link 
        href="/" 
        style={{ 
          color: '#007bff', 
          textDecoration: 'none', 
          marginBottom: '1rem', 
          display: 'inline-block' 
        }}
      >
        ← 返回首页
      </Link>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: '#dc3545', marginBottom: '1rem' }}>
          {title}
        </h1>
        
        {poster && (
          <img 
            src={poster} 
            alt={title}
            style={{
              width: '100%',
              maxHeight: '400px',
              objectFit: 'cover',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}
          />
        )}

        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '1.5rem', 
          borderRadius: '8px' 
        }}>
          <p><strong>日期:</strong> {date}</p>
          {venue && <p><strong>地点:</strong> {venue}</p>}
        </div>
      </div>
    </>
  )
}
