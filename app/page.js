import Link from "next/link";

export default function Home() {
  return (
    <div style={{
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto',
      textAlign: 'center'
    }}>
      <h1 style={{
        fontSize: '3rem',
        fontWeight: 'bold',
        marginBottom: '1rem',
        color: '#333'
      }}>
        Ticketing MVP – Home
      </h1>
      
      <p style={{
        fontSize: '1.2rem',
        color: '#666',
        marginBottom: '3rem',
        lineHeight: '1.6'
      }}>
        Welcome to our ticketing platform. Browse events, manage your tickets, and more.
      </p>

      <div style={{
        display: 'flex',
        gap: '2rem',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <Link href="/events" style={{
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
          Browse Events
        </Link>
        
        <Link href="/dashboard" style={{
          display: 'inline-block',
          padding: '1rem 2rem',
          backgroundColor: '#28a745',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          transition: 'background-color 0.3s'
        }}>
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
