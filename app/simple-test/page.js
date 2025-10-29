export default function SimpleTestPage() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>✅ Simple Test Page</h1>
      <p>This page is working!</p>
      <p>If you can see this, the routing is working correctly.</p>
      
      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <h2>Test API Endpoints:</h2>
        <p><a href="/api/test-email" target="_blank">Test Email API</a></p>
        <p><a href="/api/auth/send-verification" target="_blank">Send Verification API</a></p>
      </div>
      
      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#e0f0ff', borderRadius: '8px' }}>
        <h2>Test Pages:</h2>
        <p><a href="/auth/verify-email" target="_blank">Verify Email Page</a></p>
        <p><a href="/auth/forgot-password" target="_blank">Forgot Password Page</a></p>
        <p><a href="/email-test" target="_blank">Email Test Page</a></p>
      </div>
    </div>
  );
}
