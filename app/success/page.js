'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function SuccessPage() {
  const [sessionId, setSessionId] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    // 从 URL 参数读取 session_id
    const sessionIdFromUrl = searchParams.get('session_id');
    
    if (sessionIdFromUrl) {
      setSessionId(sessionIdFromUrl);
      fetchOrderData(sessionIdFromUrl);
    } else {
      setError('No session ID provided');
      setIsLoading(false);
    }
  }, [searchParams]);

  const fetchOrderData = async (sessionId) => {
    try {
      console.log('Fetching order data for session:', sessionId);
      
      const response = await fetch(`/api/orders/by-session?session_id=${sessionId}`);
      const data = await response.json();
      
      if (data.success) {
        setOrderData(data.order);
        setTickets(data.tickets);
        console.log('Order data loaded:', data);
      } else {
        setError(data.error || 'Failed to load order data');
      }
    } catch (error) {
      console.error('Error fetching order data:', error);
      setError('Failed to load order data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveImage = (ticket) => {
    // 保存图片功能 - 这里可以生成包含二维码的图片
    console.log('Save image for ticket:', ticket.id);
    alert(`保存票据 ${ticket.id} 的图片功能待实现`);
  };

  const handlePrint = () => {
    // 打印功能
    window.print();
  };

  if (isLoading) {
    return (
      <div style={{
        padding: '2rem',
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'center',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>
          <div style={{
            fontSize: '2rem',
            marginBottom: '1rem'
          }}>
            ⏳
          </div>
          <h2>Loading your tickets...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '2rem',
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'center',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>
          <div style={{
            fontSize: '2rem',
            marginBottom: '1rem',
            color: '#dc3545'
          }}>
            ❌
          </div>
          <h2>Error</h2>
          <p style={{ color: '#666', marginBottom: '2rem' }}>{error}</p>
          <Link href="/" style={{
            padding: '1rem 2rem',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '1.1rem',
            fontWeight: 'bold'
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
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa'
    }}>
      {/* 成功页面头部 */}
      <div style={{
        backgroundColor: 'white',
        padding: '3rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        marginBottom: '2rem'
      }}>
        <div style={{
          fontSize: '4rem',
          marginBottom: '1rem'
        }}>
          🎉
        </div>
        
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          color: '#28a745'
        }}>
          Payment Successful!
        </h1>
        
        <p style={{
          fontSize: '1.2rem',
          color: '#666',
          marginBottom: '2rem'
        }}>
          Thank you for your purchase. Your tickets are ready!
        </p>

        {/* 订单信息 */}
        {orderData && (
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '2rem',
            textAlign: 'left'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Order Details</h3>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>
              <p><strong>Order ID:</strong> {orderData.id}</p>
              <p><strong>Event:</strong> {orderData.eventId}</p>
              <p><strong>Tier:</strong> {orderData.tier}</p>
              <p><strong>Amount:</strong> ${(orderData.amount / 100).toFixed(2)} {orderData.currency.toUpperCase()}</p>
              <p><strong>Email:</strong> {orderData.email}</p>
              <p><strong>Tickets:</strong> {orderData.ticketCount}</p>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={handlePrint}
            style={{
              padding: '1rem 2rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
          >
            🖨️ Print Tickets
          </button>
          
          <Link href="/events" style={{
            padding: '1rem 2rem',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            transition: 'background-color 0.3s'
          }}>
            🎫 View Events
          </Link>
        </div>
      </div>

      {/* 票据卡片列表 */}
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ 
          margin: '0 0 2rem 0', 
          color: '#333',
          textAlign: 'center',
          fontSize: '1.8rem'
        }}>
          Your Digital Tickets ({tickets.length})
        </h2>

        {tickets.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#666'
          }}>
            <p>No tickets found for this order.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            {tickets.map((ticket, index) => (
              <div key={ticket.id} style={{
                border: '2px solid #e9ecef',
                borderRadius: '12px',
                padding: '1.5rem',
                backgroundColor: '#f8f9fa',
                position: 'relative'
              }}>
                {/* 票据状态标签 */}
                <div style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  backgroundColor: ticket.status === 'used' ? '#dc3545' : 
                                 ticket.status === 'unused' ? '#28a745' : '#6c757d',
                  color: 'white'
                }}>
                  {ticket.status.toUpperCase()}
                </div>

                {/* 票据信息 */}
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ 
                    margin: '0 0 0.5rem 0', 
                    color: '#333',
                    fontSize: '1.2rem'
                  }}>
                    Ticket #{index + 1}
                  </h3>
                  
                  <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    <p><strong>ID:</strong> {ticket.id}</p>
                    <p><strong>Event:</strong> {ticket.eventId}</p>
                    <p><strong>Tier:</strong> {ticket.tier}</p>
                    <p><strong>Holder:</strong> {ticket.holderEmail}</p>
                    <p><strong>Issued:</strong> {new Date(ticket.issuedAt).toLocaleString()}</p>
                    {ticket.usedAt && (
                      <p><strong>Used:</strong> {new Date(ticket.usedAt).toLocaleString()}</p>
                    )}
                  </div>
                </div>

                {/* 二维码载荷显示 */}
                {ticket.qrPayload && (
                  <div style={{
                    backgroundColor: 'white',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #dee2e6',
                    marginBottom: '1rem'
                  }}>
                    <p style={{ 
                      margin: '0 0 0.5rem 0', 
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      color: '#333'
                    }}>
                      QR Code Data:
                    </p>
                    <div style={{
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      color: '#666',
                      wordBreak: 'break-all',
                      backgroundColor: '#f8f9fa',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      border: '1px solid #e9ecef'
                    }}>
                      {ticket.qrPayload}
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  justifyContent: 'center'
                }}>
                  <button
                    onClick={() => handleSaveImage(ticket)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'background-color 0.3s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#138496'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#17a2b8'}
                  >
                    💾 Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}