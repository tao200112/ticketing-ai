'use client'

import NavbarPartyTix from '@/components/NavbarPartyTix'

const faqs = [
  {
    question: 'How do I buy a ticket?',
    answer: 'Browse events on our homepage or events page, select the ticket type and quantity you want, then proceed to checkout. You\'ll need to create an account or log in to complete your purchase. Payment is processed securely through Stripe.'
  },
  {
    question: 'Where can I find my tickets after purchase?',
    answer: 'After a successful purchase, you\'ll receive a confirmation email with your ticket details. You can also view all your tickets in your Account page under "My Tickets". Each ticket includes a QR code that you\'ll need to present at the event entrance.'
  },
  {
    question: 'I didn\'t receive a confirmation email, what should I do?',
    answer: 'First, check your spam or junk folder. If you still don\'t see the email, log into your account and navigate to the "My Tickets" section. Your tickets should be visible there. If you continue to have issues, please contact our support team.'
  },
  {
    question: 'How do refunds or exchanges work?',
    answer: 'Refund and exchange policies vary by event and are determined by the event organizer. Please review the specific terms for each event before purchasing. Generally, refunds are only available if an event is cancelled or postponed. To request a refund, contact our support team with your order number.'
  },
  {
    question: 'I changed my phone, how can I log in and access existing tickets?',
    answer: 'You can log in using your email address and password on any device. If you\'ve forgotten your password, use the "Forgot Password" link on the login page to reset it. Your tickets are tied to your account, not your device, so you can access them from any device once logged in.'
  }
]

export default function HelpPage() {
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
            marginBottom: '8px'
          }}>
            Help & FAQ
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '1rem',
            marginBottom: '32px'
          }}>
            Frequently asked questions and answers
          </p>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {faqs.map((faq, index) => (
              <div
                key={index}
                style={{
                  padding: '24px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: 'white',
                  marginBottom: '12px'
                }}>
                  {faq.question}
                </h3>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '1rem',
                  lineHeight: '1.6'
                }}>
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '40px',
            padding: '24px',
            background: 'rgba(124, 58, 237, 0.2)',
            borderRadius: '12px',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            textAlign: 'center'
          }}>
            <p style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '1rem',
              marginBottom: '12px'
            }}>
              Still have questions?
            </p>
            <a
              href="/support/contact"
              style={{
                color: '#22D3EE',
                fontSize: '1rem',
                fontWeight: '500',
                textDecoration: 'none',
                transition: 'color 0.3s'
              }}
              onMouseEnter={(e) => e.target.style.color = '#7C3AED'}
              onMouseLeave={(e) => e.target.style.color = '#22D3EE'}
            >
              Contact our support team →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

