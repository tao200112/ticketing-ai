'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RidiculousChickenEvent() {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const ticketTypes = [
    {
      id: 'regular',
      name: 'Regular Ticket',
      price: 15,
      description: 'Standard entry ticket',
      features: ['General admission', 'Basic amenities', 'Standard seating']
    },
    {
      id: 'special',
      name: 'Special Ticket',
      price: 30,
      description: 'Premium entry ticket',
      features: ['VIP access', 'Premium amenities', 'Priority seating', 'Special perks']
    }
  ];

  const handleTicketSelect = (ticket) => {
    setSelectedTicket(ticket);
  };

  const handlePurchase = async () => {
    if (!selectedTicket) {
      alert('Please select a ticket type.');
      return;
    }

    setIsLoading(true);
    
    try {
      // 根据票务类型设置 priceId 和 metadata
      // 使用 Stripe Payment Links 作为临时解决方案
      const ticketConfig = {
        regular: {
          // 使用 Payment Link 重定向
          usePaymentLink: true,
          paymentLink: 'https://buy.stripe.com/test_28E4gz5Osd7qgCq0nh4Rq01', // 15元票
          metadata: {
            event_id: 'ridiculous-chicken',
            tier: 'basic',
            quantity: '1'
          }
        },
        special: {
          // 使用 Payment Link 重定向
          usePaymentLink: true,
          paymentLink: 'https://buy.stripe.com/test_aFa7sL6Sw0kE71Q3zt4Rq00', // 30元票
          metadata: {
            event_id: 'ridiculous-chicken',
            tier: 'vip',
            quantity: '1'
          }
        }
      };
      
      const config = ticketConfig[selectedTicket.id];
      
      if (!config) {
        throw new Error('Ticket configuration not found');
      }
      
      console.log(`Processing purchase for ${selectedTicket.name}:`, config);
      console.log('Selected ticket ID:', selectedTicket.id);
      console.log('Config found:', !!config);
      console.log('Use payment link:', config?.usePaymentLink);
      console.log('Payment link:', config?.paymentLink);
      
      if (config.usePaymentLink && config.paymentLink) {
        // 使用 Stripe Payment Link 重定向
        console.log('✅ Redirecting to Stripe Payment Link:', config.paymentLink);
        console.log('Current window location:', window.location.href);
        
        // 添加延迟以确保日志输出
        setTimeout(() => {
          window.location.href = config.paymentLink;
        }, 100);
      } else {
        // 调用 API 创建 checkout session
        const response = await fetch('/api/checkout_sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            priceId: config.priceId,
            quantity: 1,
            metadata: config.metadata
          }),
        });

        const data = await response.json();
        
        if (response.ok && data.url) {
          console.log('Checkout session created, redirecting to:', data.url);
          // 重定向到 Stripe Checkout
          window.location.href = data.url;
        } else {
          throw new Error(data.error || 'Failed to create checkout session');
        }
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert(`Failed to process purchase: ${error.message}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '1000px',
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa'
    }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          color: '#333'
        }}>
          🐔 Ridiculous Chicken Event
        </h1>
        
        <p style={{
          fontSize: '1.2rem',
          color: '#666',
          marginBottom: '1rem'
        }}>
          Join us for an unforgettable night of entertainment!
        </p>
        
        <div style={{
          backgroundColor: '#fff3cd',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          border: '1px solid #ffeaa7'
        }}>
          <p style={{ margin: 0, color: '#856404' }}>
            📍 <strong>Venue:</strong> 201 N Main St SUITE A, Blacksburg, VA 24060<br/>
            🕕 <strong>Time:</strong> 6:00 PM - 3:00 AM<br/>
            🎫 <strong>Choose your ticket type below</strong>
          </p>
        </div>

        <div style={{
          backgroundColor: '#d1ecf1',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          border: '1px solid #bee5eb'
        }}>
          <p style={{ margin: 0, color: '#0c5460', fontSize: '0.9rem' }}>
            <strong>⚠️ Development Mode:</strong> This page uses placeholder Price IDs. 
            To enable real payments, replace the Price IDs in the code with actual Stripe Price IDs.
          </p>
        </div>

        <Link href="/" style={{
          color: '#007bff',
          textDecoration: 'none',
          fontSize: '1rem'
        }}>
          ← Back to Home
        </Link>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem',
        marginBottom: '2rem'
      }}>
        {ticketTypes.map((ticket) => (
          <div
            key={ticket.id}
            onClick={() => handleTicketSelect(ticket)}
            style={{
              backgroundColor: selectedTicket?.id === ticket.id ? '#e3f2fd' : 'white',
              border: selectedTicket?.id === ticket.id ? '3px solid #2196f3' : '2px solid #e9ecef',
              borderRadius: '12px',
              padding: '1.5rem',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              color: '#333'
            }}>
              {ticket.name}
            </h3>
            <div style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#28a745',
              marginBottom: '1rem'
            }}>
              ${ticket.price}
            </div>
            <p style={{
              color: '#666',
              marginBottom: '1rem'
            }}>
              {ticket.description}
            </p>
            <ul style={{ padding: 0, listStyle: 'none' }}>
              {ticket.features.map((feature, index) => (
                <li key={index} style={{
                  padding: '0.25rem 0',
                  color: '#555'
                }}>
                  ✓ {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {selectedTicket && (
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: '1rem',
            color: '#333'
          }}>
            Ready to Purchase?
          </h2>
          
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Order Summary</h3>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>
              <p><strong>Event:</strong> Ridiculous Chicken</p>
              <p><strong>Ticket:</strong> {selectedTicket.name}</p>
              <p><strong>Price:</strong> ${selectedTicket.price}</p>
            </div>
          </div>

          <button
            onClick={handlePurchase}
            disabled={isLoading}
            style={{
              padding: '1rem 2rem',
              backgroundColor: isLoading ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s',
              minWidth: '200px',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? (
              <>
                <span style={{ marginRight: '0.5rem' }}>⏳</span>
                Processing...
              </>
            ) : (
              `Purchase - $${selectedTicket.price}`
            )}
          </button>
        </div>
      )}
    </div>
  );
}
