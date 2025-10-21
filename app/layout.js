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
  title: "Ticketing MVP",
  description: "Ticketing MVP Application",
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
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>
            Ticketing MVP
          </div>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <Link href="/" style={{ textDecoration: 'none', color: '#666', padding: '0.5rem 1rem', borderRadius: '4px' }}>
              Home
            </Link>
            <Link href="/events" style={{ textDecoration: 'none', color: '#666', padding: '0.5rem 1rem', borderRadius: '4px' }}>
              Events
            </Link>
            <Link href="/event/demo" style={{ textDecoration: 'none', color: '#666', padding: '0.5rem 1rem', borderRadius: '4px' }}>
              Buy Demo
            </Link>
            <Link href="/scan" style={{ textDecoration: 'none', color: '#666', padding: '0.5rem 1rem', borderRadius: '4px' }}>
              Scan
            </Link>
            <Link href="/dashboard" style={{ textDecoration: 'none', color: '#666', padding: '0.5rem 1rem', borderRadius: '4px' }}>
              Dashboard
            </Link>
            <Link href="/success" style={{ textDecoration: 'none', color: '#666', padding: '0.5rem 1rem', borderRadius: '4px' }}>
              Success
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}