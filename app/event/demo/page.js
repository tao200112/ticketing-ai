'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function EventDemo() {
  const [quantity, setQuantity] = useState(1);
  
  const event = {
    name: "Tech Conference 2024",
    time: "2024-12-15 09:00",
    venue: "Convention Center",
    price: 99,
    description: "Join us for the biggest tech conference of the year featuring industry leaders, innovative workshops, and networking opportunities."
  };

  const totalPrice = event.price * quantity;

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1 style={{
        fontSize: '2.5rem',
        fontWeight: 'bold',
        marginBottom: '2rem',
        color: '#333',
        textAlign: 'center'
      }}>
        Event Details
      </h1>

      <div style={{
        border: '1px solid #e9ecef',
        borderRadius: '12px',
        padding: '2rem',
        backgroundColor: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '2rem'
      }}>
        <h2 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          color: '#333'
        }}>
          {event.name}
        </h2>
        
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Time:</strong> {event.time}
        </div>
        
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Venue:</strong> {event.venue}
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <strong>Price:</strong> <span style={{ color: '#28a745', fontWeight: 'bold' }}>${event.price}</span>
        </div>
        
        <p style={{
          color: '#666',
          lineHeight: '1.6',
          marginBottom: '1.5rem'
        }}>
          {event.description}
        </p>
      </div>

      <div style={{
        border: '1px solid #e9ecef',
        borderRadius: '12px',
        padding: '2rem',
        backgroundColor: '#f8f9fa'
      }}>
        <h3 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          color: '#333'
        }}>
          Purchase Tickets
        </h3>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <label style={{ fontWeight: 'bold' }}>Quantity:</label>
          <select 
            value={quantity} 
            onChange={(e) => setQuantity(parseInt(e.target.value))}
            style={{
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
              fontSize: '1rem'
            }}
          >
            {[1, 2, 3, 4, 5].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
        
        <div style={{
          fontSize: '1.2rem',
          fontWeight: 'bold',
          marginBottom: '1.5rem',
          color: '#333'
        }}>
          Total: ${totalPrice}
        </div>
        
        <Link href="/success" style={{
          display: 'inline-block',
          width: '100%',
          padding: '1rem',
          backgroundColor: '#28a745',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '6px',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '1.1rem',
          transition: 'background-color 0.3s'
        }}>
          Go to Payment (Demo)
        </Link>
      </div>
    </div>
  );
}
