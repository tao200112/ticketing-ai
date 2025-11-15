'use client'

import NavbarPartyTix from '@/components/NavbarPartyTix'

const SUPPORT_EMAIL = 'support@partytix.app'

export default function ContactPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      paddingTop: '80px',
      paddingBottom: '40px'
    }}>
      <NavbarPartyTix />
      
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '0 24px'
      }}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          padding: '40px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '24px'
          }}>
            Contact Us
          </h1>
          
          <div style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '1rem',
            lineHeight: '1.6',
            marginBottom: '32px'
          }}>
            <p style={{ marginBottom: '16px' }}>
              We're here to help! If you have any questions, concerns, or need assistance with your tickets or account, please don't hesitate to reach out to us.
            </p>
            <p style={{ marginBottom: '16px' }}>
              For the fastest response, please email us directly:
            </p>
            <div style={{
              marginTop: '24px',
              padding: '20px',
              background: 'rgba(124, 58, 237, 0.2)',
              borderRadius: '8px',
              border: '1px solid rgba(124, 58, 237, 0.3)'
            }}>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                style={{
                  color: '#22D3EE',
                  fontSize: '1.25rem',
                  fontWeight: '500',
                  textDecoration: 'none',
                  display: 'inline-block',
                  transition: 'color 0.3s'
                }}
                onMouseEnter={(e) => e.target.style.color = '#7C3AED'}
                onMouseLeave={(e) => e.target.style.color = '#22D3EE'}
              >
                {SUPPORT_EMAIL}
              </a>
            </div>
            <p style={{ marginTop: '24px', fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
              We typically respond within 24-48 hours during business days.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

