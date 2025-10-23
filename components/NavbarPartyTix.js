'use client'

import Link from 'next/link'

export default function NavbarPartyTix() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/40 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-partytix-gradient rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-2xl font-bold text-white">PartyTix</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/events" 
              className="text-slate-300 hover:text-white transition-colors duration-200 font-medium"
            >
              Events
            </Link>
            <Link 
              href="/merchant" 
              className="text-slate-300 hover:text-white transition-colors duration-200 font-medium"
            >
              Merchant
            </Link>
            <Link 
              href="/account" 
              className="text-slate-300 hover:text-white transition-colors duration-200 font-medium"
            >
              Account
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button className="text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
