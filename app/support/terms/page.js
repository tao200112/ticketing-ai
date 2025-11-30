'use client'

export default function TermsPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      paddingTop: '80px',
      paddingBottom: '40px'
    }}>
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
            Terms of Service
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
                Service Description
              </h2>
              <p style={{ marginBottom: '16px' }}>
                PartyTix is an event ticketing platform that facilitates the sale and management of tickets for various events, including concerts, festivals, and other entertainment activities.
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: 'white',
                marginBottom: '16px'
              }}>
                Ticket Usage Rules
              </h2>
              <ul style={{ paddingLeft: '24px', marginBottom: '16px' }}>
                <li style={{ marginBottom: '8px' }}>
                  Tickets are non-transferable unless explicitly stated otherwise by the event organizer.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  Resale or scalping of tickets is strictly prohibited.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  Each ticket is valid only for the specific event, date, and time indicated.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  Tickets must be presented in their original form (digital QR code or physical ticket) at the event venue.
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
                Entry Rights
              </h2>
              <p style={{ marginBottom: '16px' }}>
                Event organizers and venue staff reserve the right to refuse entry to any ticket holder for reasons including, but not limited to, violation of venue policies, disruptive behavior, or suspicion of fraudulent ticket use.
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: 'white',
                marginBottom: '16px'
              }}>
                Refunds and Cancellations
              </h2>
              <p style={{ marginBottom: '16px' }}>
                Refund and cancellation policies are determined by individual event organizers. Please review the specific terms for each event before purchasing tickets.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

