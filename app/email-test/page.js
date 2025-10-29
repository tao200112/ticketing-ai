export default function EmailTestPage() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>📧 Email Test Page</h1>
      <p>This page is working!</p>
      <p>If you can see this, the routing is working correctly.</p>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Test Email Sending</h2>
        <form action="/api/auth/send-verification" method="POST" style={{ marginTop: '10px' }}>
          <input 
            type="email" 
            name="email" 
            placeholder="Enter email address" 
            required 
            style={{ padding: '8px', marginRight: '10px', width: '200px' }}
          />
          <button type="submit" style={{ padding: '8px 16px' }}>
            Send Test Email
          </button>
        </form>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Test Links:</h3>
        <p><a href="/auth/verify-email">Verify Email Page</a></p>
        <p><a href="/auth/forgot-password">Forgot Password Page</a></p>
        <p><a href="/auth/reset-password">Reset Password Page</a></p>
      </div>
    </div>
  );
}
