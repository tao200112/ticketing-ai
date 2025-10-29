export default function DebugVercelPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔍 Vercel Debug Information</h1>
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <h2>Environment Variables:</h2>
        <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</p>
        <p><strong>NEXT_PUBLIC_SITE_URL:</strong> {process.env.NEXT_PUBLIC_SITE_URL || 'NOT SET'}</p>
        <p><strong>NEXT_PUBLIC_SUPABASE_URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET'}</p>
        <p><strong>SMTP_HOST:</strong> {process.env.SMTP_HOST || 'NOT SET'}</p>
        <p><strong>UPSTASH_REDIS_URL:</strong> {process.env.UPSTASH_REDIS_URL ? 'SET' : 'NOT SET'}</p>
      </div>
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e0f0ff', borderRadius: '8px' }}>
        <h2>Build Information:</h2>
        <p><strong>Build Time:</strong> {new Date().toISOString()}</p>
        <p><strong>Platform:</strong> {process.env.VERCEL ? 'Vercel' : 'Local'}</p>
        <p><strong>Region:</strong> {process.env.VERCEL_REGION || 'Unknown'}</p>
        <p><strong>Deployment URL:</strong> {process.env.VERCEL_URL || 'Unknown'}</p>
      </div>
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff0e0', borderRadius: '8px' }}>
        <h2>Test Links:</h2>
        <p><a href="/simple-test" style={{ color: 'blue' }}>Simple Test Page</a></p>
        <p><a href="/email-test" style={{ color: 'blue' }}>Email Test Page</a></p>
        <p><a href="/api/test-email" style={{ color: 'blue' }}>Test Email API</a></p>
        <p><a href="/auth/verify-email" style={{ color: 'blue' }}>Verify Email Page</a></p>
      </div>
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0fff0', borderRadius: '8px' }}>
        <h2>Current URL:</h2>
        <p id="current-url">Loading...</p>
      </div>
      
      <script dangerouslySetInnerHTML={{
        __html: `
          document.getElementById('current-url').textContent = window.location.href;
        `
      }} />
    </div>
  );
}
