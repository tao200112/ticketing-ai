'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import NavLinkItem from './NavLinkItem'

export default function NavbarPartyTix() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const navItems = [
    { label: 'Events', href: '/blacksburg', matchers: ['/events'] },
    { label: 'Activity', href: '/activity', matchers: [] },
    { label: 'Tickets', href: '/tickets', matchers: [] }
  ]
  const desktopNavLinkStyle = {
    color: 'rgba(255, 255, 255, 0.85)',
    textDecoration: 'none',
    fontWeight: 500,
    paddingBottom: '6px',
    borderBottom: '2px solid transparent',
    letterSpacing: '0.02em',
    transition: 'color 0.3s ease, border-color 0.3s ease'
  }
  const desktopNavLinkActiveStyle = {
    color: '#ffffff',
    borderBottomColor: '#a855f7'
  }
  const mobileNavLinkStyle = {
    ...desktopNavLinkStyle,
    width: '100%',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
  }
  const mobileNavLinkActiveStyle = {
    ...desktopNavLinkActiveStyle,
    borderBottomColor: '#a855f7'
  }
  const isNavActive = (item) => {
    if (!pathname) return false
    if (item.href === '/blacksburg') {
      if (pathname === '/blacksburg' || pathname.startsWith('/blacksburg/')) {
        return true
      }
      return item.matchers?.some((match) => pathname.startsWith(match))
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`)
  }

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

  const renderAuthLinks = (variant = 'desktop', onNavigate) => {
    const baseStyle = {
      color: 'white',
      textDecoration: 'none',
      transition: 'color 0.3s ease'
    }
    const clickHandler = variant === 'mobile' ? onNavigate : undefined
    const isAccountActive = pathname?.startsWith('/account')

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
              fontWeight: '600',
              boxShadow: isAccountActive ? '0 0 18px rgba(124, 58, 237, 0.4)' : 'none'
            }}
            activeStyle={{
              boxShadow: '0 0 18px rgba(124, 58, 237, 0.55)'
            }}
            isActive={isAccountActive}
            onClick={clickHandler}
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
            onClick={clickHandler}
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
            onClick={clickHandler}
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
            {navItems.map((item) => (
              <NavLinkItem
                key={item.href}
                href={item.href}
                style={desktopNavLinkStyle}
                activeStyle={desktopNavLinkActiveStyle}
                isActive={isNavActive(item)}
              >
                {item.label}
              </NavLinkItem>
            ))}
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
          {navItems.map((item) => (
            <NavLinkItem
              key={item.href}
              href={item.href}
              style={mobileNavLinkStyle}
              activeStyle={mobileNavLinkActiveStyle}
              isActive={isNavActive(item)}
              onClick={closeMobileMenu}
            >
              {item.label}
            </NavLinkItem>
          ))}
          {renderAuthLinks('mobile', closeMobileMenu)}
        </div>
      )}
    </nav>
  )
}