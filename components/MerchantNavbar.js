'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MerchantNavbar({ userRole = 'boss' }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('merchantToken')
    localStorage.removeItem('merchantUser')
    router.push('/merchant/auth/login')
  }

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      backdropFilter: 'blur(12px)',
      backgroundColor: 'rgba(15, 23, 42, 0.8)',
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
        <Link href="/merchant" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            M
          </div>
          <span style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: 'white'
          }}>
            Merchant Console
          </span>
        </Link>
        
        {/* Desktop Navigation */}
        {!isMobile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px'
          }}>
            <Link 
              href="/merchant/staff" 
              style={{ 
                color: 'white', 
                textDecoration: 'none',
                transition: 'color 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(236, 72, 153, 0.2)',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(236, 72, 153, 0.3)'
              }}
            >
              <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0 0v-4m0 0h4m-4 0H6m12 0h-2M7 7h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2z" />
              </svg>
              Staff
            </Link>
            <Link 
              href="/merchant/boss" 
              style={{ 
                color: 'white', 
                textDecoration: 'none',
                transition: 'color 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(124, 58, 237, 0.2)',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(124, 58, 237, 0.3)'
              }}
            >
              👔
              Boss
            </Link>
            <button
              onClick={handleLogout}
              style={{
                color: '#ef4444',
                textDecoration: 'none',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'
              }}
            >
              Logout
            </button>
          </div>
        )}

        {/* Mobile Menu Button */}
        {isMobile && (
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        )}
      </div>

      {/* Mobile Navigation Menu */}
      {isMobile && isMobileMenuOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <Link 
            href="/merchant/staff" 
            style={{ 
              color: 'white', 
              textDecoration: 'none',
              fontSize: '16px',
              padding: '12px 16px',
              transition: 'color 0.3s ease',
              background: 'rgba(236, 72, 153, 0.2)',
              borderRadius: '8px',
              border: '1px solid rgba(236, 72, 153, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0 0v-4m0 0h4m-4 0H6m12 0h-2M7 7h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2z" />
            </svg>
            Staff
          </Link>
          <Link 
            href="/merchant/boss" 
            style={{ 
              color: 'white', 
              textDecoration: 'none',
              fontSize: '16px',
              padding: '12px 16px',
              transition: 'color 0.3s ease',
              background: 'rgba(124, 58, 237, 0.2)',
              borderRadius: '8px',
              border: '1px solid rgba(124, 58, 237, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            👔
            Boss
          </Link>
          <button
            onClick={handleLogout}
            style={{
              color: '#ef4444',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '12px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '16px',
              textAlign: 'center'
            }}
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  )
}

