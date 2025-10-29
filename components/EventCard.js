'use client'

import Link from 'next/link'

export default function EventCard({ event }) {
  // 生成事件页面的URL
  // 优先使用 event.id，如果没有则使用 event.name 生成 slug
  let eventId = event.id
  
  // 如果没有 id，则从 name 生成 slug
  if (!eventId && event.name) {
    eventId = event.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // 移除特殊字符
      .replace(/\s+/g, '-') // 空格替换为连字符
      .trim()
  }
  
  // 如果还是没有，使用默认值
  if (!eventId) {
    eventId = 'default-event'
  }

  return (
    <Link href={`/events/${eventId}`} style={{ display: 'block' }}>
      <div 
        className="hover:scale-[1.02] hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] transition-all duration-300"
        style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          cursor: 'pointer'
        }}
      >
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
            {event.title || event.name}
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
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.75rem',
            color: '#6b7280'
          }}>
            <span>🎫 {event.ticketsSold || event.current_attendees || 0} sold</span>
            <span>📅 {event.formatted_start_at || (event.start_date ? new Date(event.start_date).toLocaleDateString() : 'TBD')}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}