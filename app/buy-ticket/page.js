'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';

export default function BuyTicket() {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [qrCodeDataURL, setQrCodeDataURL] = useState('');
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
    setShowQR(false);
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

  const resetForm = () => {
    setSelectedTicket(null);
    setCustomerName('');
    setCustomerEmail('');
    setShowQR(false);
    setTicketId('');
    setQrCodeDataURL('');
  };

  if (showQR) {
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
          marginBottom: '1rem',
          color: '#28a745'
        }}>
          🎉 Purchase Successful!
        </h1>
        
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#333', marginBottom: '1.5rem' }}>Your Digital Ticket</h2>
          
          {/* QR Code Display */}
          {qrCodeDataURL && (
            <div style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              display: 'inline-block'
            }}>
              <img 
                src={qrCodeDataURL} 
                alt="Ticket QR Code" 
                style={{
                  maxWidth: '300px',
                  width: '100%',
                  height: 'auto',
                  border: '2px solid #ddd',
                  borderRadius: '8px'
                }}
              />
            </div>
          )}
          
          <div style={{
            backgroundColor: '#e9ecef',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            color: '#333',
            marginBottom: '1rem'
          }}>
            Ticket ID: {ticketId}
          </div>
          
          <div style={{
            backgroundColor: '#d4edda',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
            color: '#155724',
            textAlign: 'left'
          }}>
            <strong>Important:</strong> Please save this QR code on your phone. You'll need to show it at the venue for entry.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={resetForm}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            Buy Another Ticket
          </button>
          <Link href="/" style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#6c757d',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontSize: '1rem'
          }}>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '1000px',
      margin: '0 auto'
    }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          color: '#333'
        }}>
          Buy Your Ticket
        </h1>
        <p style={{
          fontSize: '1.2rem',
          color: '#666',
          marginBottom: '1rem'
        }}>
          Choose your ticket type and complete your purchase
        </p>
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
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: '1.5rem',
            color: '#333'
          }}>
            Customer Information
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: '500',
                marginBottom: '0.5rem',
                color: '#333'
              }}>
                Full Name *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  outline: 'none'
                }}
                placeholder="Enter your full name"
                required
              />
            </div>
            
            <div>
              <label style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: '500',
                marginBottom: '0.5rem',
                color: '#333'
              }}>
                Email Address *
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  outline: 'none'
                }}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Order Summary</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>{selectedTicket.name}</span>
              <span>${selectedTicket.price}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem' }}>
              <span>Total</span>
              <span>${selectedTicket.price}</span>
            </div>
          </div>

          <button
            onClick={handlePurchase}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '1rem',
              backgroundColor: isLoading ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => !isLoading && (e.target.style.backgroundColor = '#218838')}
            onMouseOut={(e) => !isLoading && (e.target.style.backgroundColor = '#28a745')}
          >
            {isLoading ? 'Processing...' : `Complete Purchase - $${selectedTicket.price}`}
          </button>
        </div>
      )}
    </div>
  );
}
