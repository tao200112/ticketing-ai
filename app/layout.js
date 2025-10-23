import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "PartyTix",
  description: "PartyTix - Event Ticketing Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <nav style={{
          backgroundColor: '#f8f9fa',
          padding: '1rem 2rem',
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            color: '#333',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 'bold',
              color: 'white',
              textShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }}>
              P
            </div>
            PartyTix
          </div>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <Link href="/" style={{ textDecoration: 'none', color: '#666', padding: '0.5rem 1rem', borderRadius: '4px' }}>
              Home
            </Link>
            <Link href="/events" style={{ textDecoration: 'none', color: '#666', padding: '0.5rem 1rem', borderRadius: '4px' }}>
              Events
            </Link>
            <Link href="/merchant" style={{ textDecoration: 'none', color: '#8b5cf6', padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: '600' }}>
              Merchant Console
            </Link>
            <Link href="/auth/login" style={{ textDecoration: 'none', color: '#666', padding: '0.5rem 1rem', borderRadius: '4px' }}>
              Login
            </Link>
            <Link href="/auth/register" style={{ textDecoration: 'none', color: '#666', padding: '0.5rem 1rem', borderRadius: '4px' }}>
              Register
            </Link>
            <Link href="/account" style={{ textDecoration: 'none', color: '#666', padding: '0.5rem 1rem', borderRadius: '4px' }}>
              Account
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}