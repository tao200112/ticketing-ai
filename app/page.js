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
        Ridiculous Chicken
      </h1>
      
      <div style={{
        marginBottom: '2rem',
        padding: '1.5rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        border: '1px solid #e9ecef'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          color: '#333'
        }}>
          Location & Hours
        </h2>
        <p style={{
          fontSize: '1.1rem',
          color: '#666',
          marginBottom: '0.5rem',
          fontWeight: '500'
        }}>
          📍 201 N Main St SUITE A, Blacksburg, VA 24060
        </p>
        <p style={{
          fontSize: '1.1rem',
          color: '#666',
          fontWeight: '500'
        }}>
          🕕 Open: 6:00 PM - 3:00 AM
        </p>
      </div>
      
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
        <Link href="/buy-ticket" style={{
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
          Buy Ticket
        </Link>
        
        <Link href="/events/ridiculous-chicken" style={{
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
          View Event
        </Link>
        
        <Link href="/admin" style={{
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
          Admin Panel
        </Link>
      </div>
    </div>
  );
}

