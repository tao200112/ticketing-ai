import Link from 'next/link'

export default function EventCard({ event }) {

  return (
    <Link href={`/events/ridiculous-chicken`} style={{ display: 'block' }}>
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
        </div>
      </div>
    </Link>
  )
}