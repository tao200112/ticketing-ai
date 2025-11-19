'use client'

export default function AuthCallback() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
        padding: '32px',
        width: '100%',
        maxWidth: '448px',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '16px'
        }}>
          Email Verified
        </h1>
        <p style={{
          color: '#94a3b8',
          fontSize: '1rem',
          marginBottom: '24px'
        }}>
          Your account has been verified. You may now close this page.
        </p>
      </div>
    </div>
  )
}
