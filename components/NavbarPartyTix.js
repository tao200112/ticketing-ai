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