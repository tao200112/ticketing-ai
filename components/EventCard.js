import Link from 'next/link'

export default function EventCard({ event }) {
  // 生成事件页面的URL
  // 注意：这里event.name是公共事件格式，对应商家事件的title字段
  const eventSlug = event.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // 移除特殊字符
    .replace(/\s+/g, '-') // 空格替换为连字符
    .trim()

  return (
    <Link href={`/events/${eventSlug}`} style={{ display: 'block' }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)'
        e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{
          position: 'relative',
          height: '192px',
          backgroundColor: '#374151',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280'
        }}>
          {event.poster_url ? (
            <img 
              src={event.poster_url} 
              alt={event.name} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          ) : (
            <span style={{ fontSize: '1.125rem' }}>No Poster</span>
          )}
          <div style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            backgroundColor: '#7c3aed',
            color: 'message',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            padding: '4px 12px',
            borderRadius: '9999px'
          }}>
            {event.status === 'active' ? 'Active' : 'Draft'}
          </div>
        </div>
        <div style={{ padding: '24px' }}>
          <h3 style={{ 
            fontSize: '1.25rem', 
            fontWeight: 'bold', 
            color: 'white', 
            marginBottom: '8px' 
          }}>
            {event.name}
          </h3>
          <p style={{ 
            color: '#94a3b8', 
            fontSize: '0.875rem', 
            marginBottom: '16px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {event.description || 'No description available'}
          </p>
          
          {/* 事件统计信息 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '12px',
            fontSize: '0.75rem',
            color: '#6b7280'
          }}>
            <span>📍 {event.location || 'Location TBD'}</span>
          </div>
          
          {/* 售票统计 */}
          {event.ticketsSold !== undefined && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.75rem',
              color: '#6b7280'
            }}>
              <span>🎫 {event.ticketsSold || 0} sold</span>
              <span>📅 {new Date(event.start_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}