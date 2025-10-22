'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminTestCheckout() {
  const [priceId, setPriceId] = useState('price_1234567890_regular');
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleTestCheckout = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/checkout_sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: priceId,
          quantity: quantity,
          metadata: {
            event_id: 'test-event',
            tier: 'test',
            buyer_email: 'test@example.com'
          }
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.url) {
        setResult({ success: true, url: data.url });
        console.log('Checkout session created:', data.url);
      } else {
        setResult({ success: false, error: data.error || 'Unknown error' });
      }
    } catch (error) {
      console.error('Test checkout error:', error);
      setResult({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '800px',
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa'
    }}>
      {/* 头部导航 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid #e9ecef'
      }}>
        <div>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: '#333',
            margin: '0 0 0.5rem 0'
          }}>
            Test Checkout API
          </h1>
          <p style={{ color: '#666', margin: 0 }}>
            Test payment integration and checkout sessions
          </p>
        </div>
        <Link href="/admin/dashboard" style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#6c757d',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: '500'
        }}>
          ← Back to Dashboard
        </Link>
      </div>
      
      {/* 测试界面 */}
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        marginBottom: '2rem',
        border: '1px solid #e9ecef'
      }}>
        <h2 style={{ marginBottom: '1rem', color: '#333' }}>API Test Parameters</h2>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            fontSize: '1rem',
            fontWeight: '500',
            marginBottom: '0.5rem',
            color: '#333'
          }}>
            Price ID
          </label>
          <input
            type="text"
            value={priceId}
            onChange={(e) => setPriceId(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '1rem',
              outline: 'none'
            }}
            placeholder="Enter Stripe Price ID (e.g., price_1234567890)"
          />
        </div>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontSize: '1rem',
            fontWeight: '500',
            marginBottom: '0.5rem',
            color: '#333'
          }}>
            Quantity
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            min="1"
            max="10"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '1rem',
              outline: 'none'
            }}
          />
        </div>
        
        <button
          onClick={handleTestCheckout}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '1rem',
            backgroundColor: isLoading ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.3s'
          }}
        >
          {isLoading ? 'Testing...' : 'Test Checkout Session'}
        </button>
      </div>

      {/* 测试结果 */}
      {result && (
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          marginBottom: '2rem',
          border: '1px solid #e9ecef'
        }}>
          <h2 style={{ marginBottom: '1rem', color: '#333' }}>Test Result</h2>
          
          {result.success ? (
            <div>
              <div style={{
                backgroundColor: '#d4edda',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                color: '#155724'
              }}>
                ✅ <strong>Success!</strong> Checkout session created successfully.
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <strong>Checkout URL:</strong>
                <br />
                <a 
                  href={result.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    color: '#007bff',
                    textDecoration: 'none',
                    wordBreak: 'break-all'
                  }}
                >
                  {result.url}
                </a>
              </div>
              
              <button
                onClick={() => window.open(result.url, '_blank')}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                Open Checkout in New Tab
              </button>
            </div>
          ) : (
            <div style={{
              backgroundColor: '#f8d7da',
              padding: '1rem',
              borderRadius: '8px',
              color: '#721c24'
            }}>
              ❌ <strong>Error:</strong> {result.error}
            </div>
          )}
        </div>
      )}

      {/* 使用说明 */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e9ecef'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Instructions</h3>
        <ul style={{ color: '#666', lineHeight: '1.6', paddingLeft: '1.5rem' }}>
          <li>Enter a valid Stripe Price ID (starts with "price_")</li>
          <li>Set the quantity (1-10)</li>
          <li>Click "Test Checkout Session" to create a Stripe Checkout session</li>
          <li>If successful, you'll get a checkout URL that opens Stripe's hosted checkout</li>
          <li>Use test card numbers: 4242 4242 4242 4242</li>
          <li>This tool helps test the payment integration without affecting real orders</li>
        </ul>
      </div>
    </div>
  );
}
