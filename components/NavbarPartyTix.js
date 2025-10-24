import Link from 'next/link'

export default function NavbarPartyTix() {
  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      backdropFilter: 'blur(12px)',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '16px 0'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '18px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}>
            P
          </div>
          <span style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: 'white'
          }}>
            PartyTix
          </span>
        </Link>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px'
        }}>
          <Link 
            href="/events" 
            style={{ 
              color: 'white', 
              textDecoration: 'none',
              transition: 'color 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#22D3EE'}
            onMouseLeave={(e) => e.target.style.color = 'white'}
          >
            Events
          </Link>
          <Link 
            href="/qr-scanner" 
            style={{ 
              color: 'white', 
              textDecoration: 'none',
              transition: 'color 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => e.target.style.color = '#22D3EE'}
            onMouseLeave={(e) => e.target.style.color = 'white'}
          >
            <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0 0v-4m0 0h4m-4 0H6m12 0h-2M7 7h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2z" />
            </svg>
            扫码验票
          </Link>
          <Link 
            href="/merchant" 
            style={{ 
              color: 'white', 
              textDecoration: 'none',
              transition: 'color 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#22D3EE'}
            onMouseLeave={(e) => e.target.style.color = 'white'}
          >
            Merchant Console
          </Link>
          <Link 
            href="/admin/login" 
            style={{ 
              color: '#fbbf24', 
              textDecoration: 'none',
              transition: 'color 0.3s ease',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => e.target.style.color = '#f59e0b'}
            onMouseLeave={(e) => e.target.style.color = '#fbbf24'}
          >
            Admin
          </Link>
          <Link 
            href="/auth/login" 
            style={{ 
              color: 'white', 
              textDecoration: 'none',
              transition: 'color 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#22D3EE'}
            onMouseLeave={(e) => e.target.style.color = 'white'}
          >
            Login
          </Link>
          <Link 
            href="/auth/register" 
            style={{ 
              color: 'white', 
              textDecoration: 'none',
              transition: 'color 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#22D3EE'}
            onMouseLeave={(e) => e.target.style.color = 'white'}
          >
            Register
          </Link>
          <Link 
            href="/account" 
            style={{ 
              color: 'white', 
              textDecoration: 'none',
              transition: 'color 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#22D3EE'}
            onMouseLeave={(e) => e.target.style.color = 'white'}
          >
            Account
          </Link>
        </div>
      </div>
    </nav>
  )
}