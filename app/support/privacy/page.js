'use client'

import NavbarPartyTix from '@/components/NavbarPartyTix'

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          
          <div style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '1rem',
            lineHeight: '1.8'
          }}>
            <section style={{ marginBottom: '32px' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: 'white',
                marginBottom: '16px'
              }}>
                Information We Collect
              </h2>
              <p style={{ marginBottom: '16px' }}>
                We collect the following types of information to provide and improve our services:
              </p>
              <ul style={{ paddingLeft: '24px', marginBottom: '16px' }}>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Account Information:</strong> Email address, name, and profile information you provide when creating an account.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Order Information:</strong> Purchase history, ticket details, payment information (processed securely through our payment providers).
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Device Information:</strong> IP address, browser type, device identifiers, and usage data to ensure platform security and prevent fraud.
                </li>
              </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: 'white',
                marginBottom: '16px'
              }}>
                How We Use Your Information
              </h2>
              <ul style={{ paddingLeft: '24px', marginBottom: '16px' }}>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Order Processing:</strong> To process ticket purchases, send confirmation emails, and manage your ticket inventory.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Account Management:</strong> To maintain your account, authenticate your identity, and provide customer support.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Fraud Prevention:</strong> To detect and prevent fraudulent transactions and unauthorized access to your account.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Communication:</strong> To send you important updates about your tickets, events, and (with your consent) promotional offers.
                </li>
              </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: 'white',
                marginBottom: '16px'
              }}>
                Data Security
              </h2>
              <p style={{ marginBottom: '16px' }}>
                We implement industry-standard security measures to protect your personal information. Payment information is processed through secure, PCI-compliant payment providers and is never stored on our servers.
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: 'white',
                marginBottom: '16px'
              }}>
                Your Rights
              </h2>
              <p style={{ marginBottom: '16px' }}>
                You have the right to access, update, or delete your personal information at any time through your account settings. You may also opt out of marketing communications by updating your preferences.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

