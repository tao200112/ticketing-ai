import Link from "next/link";

export default function Success() {
  return (
    <div style={{
      padding: '2rem',
      maxWidth: '600px',
      margin: '0 auto',
      textAlign: 'center'
    }}>
      <div style={{
        border: '1px solid #e9ecef',
        borderRadius: '12px',
        padding: '3rem 2rem',
        backgroundColor: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          fontSize: '4rem',
          color: '#28a745',
          marginBottom: '1rem'
        }}>
          ✓
        </div>
        
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          color: '#333'
        }}>
          Payment Successful (Demo)
        </h1>
        
        <p style={{
          fontSize: '1.2rem',
          color: '#666',
          marginBottom: '2rem',
          lineHeight: '1.6'
        }}>
          Your ticket purchase has been completed successfully. 
          You will receive a confirmation email shortly.
        </p>
        
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <Link href="/" style={{
            display: 'inline-block',
            padding: '1rem 2rem',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            transition: 'background-color 0.3s'
          }}>
            Return to Home
          </Link>
          
          <Link href="/events" style={{
            display: 'inline-block',
            padding: '1rem 2rem',
            backgroundColor: '#6c757d',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            transition: 'background-color 0.3s'
          }}>
            Browse More Events
          </Link>
        </div>
      </div>
    </div>
  );
}
