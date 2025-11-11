'use client'

export default function DeprecatedAuthDebugPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto', lineHeight: 1.6 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Authentication Debug Page Deprecated</h1>
      <p style={{ marginBottom: '0.75rem' }}>
        The legacy authentication debug utilities have been removed. Supabase Auth is now the single source of truth
        for login, registration, email verification, and password recovery flows.
      </p>
      <p style={{ marginBottom: '0.75rem' }}>
        Please use the Supabase dashboard or the new client-side helpers in <code>lib/auth-context</code> and
        <code>lib/auth-server</code> for any required testing.
      </p>
    </div>
  )
}