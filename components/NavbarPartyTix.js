'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import NavLinkItem from './NavLinkItem'

export default function NavbarPartyTix() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)

    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false)
  }, [])

  const handleLogout = useCallback(async () => {
    try {
      setIsSigningOut(true)
      await logout()
      closeMobileMenu()
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setIsSigningOut(false)
    }
  }, [logout, closeMobileMenu, router])

  const renderAuthLinks = (variant = 'desktop') => {
    const baseStyle = {
      color: 'white',
      textDecoration: 'none',
      transition: 'color 0.3s ease'
    }

    if (user) {
      return (
        <>
          <NavLinkItem
            href="/account"
            style={{
              ...baseStyle,
              background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
              padding: variant === 'desktop' ? '8px 16px' : '12px 16px',
              borderRadius: '8px',
              fontWeight: '500'
            }}
            onClick={variant === 'mobile' ? closeMobileMenu : undefined}
          >
            Account
          </NavLinkItem>
          <button
            onClick={handleLogout}
            disabled={isSigningOut}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: variant === 'desktop' ? '1rem' : '16px',
              cursor: isSigningOut ? 'wait' : 'pointer',
              padding: variant === 'desktop' ? '0' : '8px 0'
            }}
          >
            {isSigningOut ? 'Signing out...' : 'Logout'}
          </button>
        </>
      )
    }

    return (
      <>
        <NavLinkItem
          href="/auth/login"
          style={baseStyle}
          onClick={variant === 'mobile' ? closeMobileMenu : undefined}
        >
          Login
        </NavLinkItem>
        <NavLinkItem
          href="/auth/register"
          style={{
            ...baseStyle,
            background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
            padding: variant === 'desktop' ? '8px 16px' : '12px 16px',
            borderRadius: '8px',
            fontWeight: '500'
          }}
          onClick={variant === 'mobile' ? closeMobileMenu : undefined}
        >
          Sign Up
        </NavLinkItem>
      </>
    )
  }

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '16px 0'
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
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
            }}
          >
            P
          </div>
          <span
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: 'white'
            }}
          >
            PartyTix
          </span>
        </Link>

        {!isMobile && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px'
            }}
          >
          <NavLinkItem
            href="/events"
            style={{
              color: 'white',
              textDecoration: 'none',
              transition: 'color 0.3s ease'
            }}
          >
            Events
          </NavLinkItem>
          <NavLinkItem
            href="/activity"
            style={{
              color: 'white',
              textDecoration: 'none',
              transition: 'color 0.3s ease'
            }}
          >
            Activity
          </NavLinkItem>
          <NavLinkItem
            href="/contact"
            style={{
              color: 'white',
              textDecoration: 'none',
              transition: 'color 0.3s ease'
            }}
          >
            Contact Us
          </NavLinkItem>
            {renderAuthLinks('desktop')}
          </div>
        )}

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
            {isMobileMenuOpen ? 'Close' : 'Menu'}
          </button>
        )}
      </div>

      {isMobile && isMobileMenuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <NavLinkItem
            href="/events"
            style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: '16px',
              padding: '8px 0',
              transition: 'color 0.3s ease'
            }}
            onClick={closeMobileMenu}
          >
            Events
          </NavLinkItem>
          <NavLinkItem
            href="/activity"
            style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: '16px',
              padding: '8px 0',
              transition: 'color 0.3s ease'
            }}
            onClick={closeMobileMenu}
          >
            Activity
          </NavLinkItem>
          <NavLinkItem
            href="/contact"
            style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: '16px',
              padding: '8px 0',
              transition: 'color 0.3s ease'
            }}
            onClick={closeMobileMenu}
          >
            Contact Us
          </NavLinkItem>
          {renderAuthLinks('mobile')}
        </div>
      )}
    </nav>
  )
}