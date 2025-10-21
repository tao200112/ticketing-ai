'use client';

import { useState } from 'react';

export default function Scan() {
  const [ticketId, setTicketId] = useState('');
  const [result, setResult] = useState('');

  const handleVerify = () => {
    if (!ticketId.trim()) {
      setResult('Please enter a ticket ID');
      return;
    }
    setResult('Ticket verification pending - backend integration required');
  };

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '600px',
      margin: '0 auto',
      textAlign: 'center'
    }}>
      <h1 style={{
        fontSize: '2.5rem',
        fontWeight: 'bold',
        marginBottom: '2rem',
        color: '#333'
      }}>
        Ticket Verification
      </h1>

      <div style={{
        border: '1px solid #e9ecef',
        borderRadius: '12px',
        padding: '2rem',
        backgroundColor: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '2rem'
      }}>
        <div style={{
          marginBottom: '1.5rem'
        }}>
          <label style={{
            display: 'block',
            fontWeight: 'bold',
            marginBottom: '0.5rem',
            color: '#333'
          }}>
            Ticket ID:
          </label>
          <input
            type="text"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            placeholder="Enter ticket ID"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
          />
        </div>
        
        <button
          onClick={handleVerify}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background-color 0.3s'
          }}
        >
          Verify (Demo)
        </button>
      </div>

      {result && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '6px',
          color: '#666',
          fontSize: '1rem'
        }}>
          {result}
        </div>
      )}
    </div>
  );
}
