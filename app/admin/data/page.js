'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminData() {
  const [orders, setOrders] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // 并行加载订单和票据数据
      const [ordersResponse, ticketsResponse] = await Promise.all([
        fetch('/api/admin/orders'),
        fetch('/api/admin/tickets')
      ]);

      const ordersData = await ordersResponse.json();
      const ticketsData = await ticketsResponse.json();

      if (ordersData.success) {
        setOrders(ordersData.orders || []);
      } else {
        console.error('Failed to load orders:', ordersData.error);
      }

      if (ticketsData.success) {
        setTickets(ticketsData.tickets || []);
      } else {
        console.error('Failed to load tickets:', ticketsData.error);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#28a745';
      case 'pending': return '#ffc107';
      case 'failed': return '#dc3545';
      case 'used': return '#28a745';
      case 'unused': return '#6c757d';
      case 'refunded': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const formatCurrency = (amount) => {
    return `$${(amount / 100).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div style={{
        padding: '2rem',
        maxWidth: '1200px',
        margin: '0 auto',
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <h2 style={{ color: '#333', margin: '0 0 0.5rem 0' }}>Loading Data...</h2>
          <p style={{ color: '#666', margin: 0 }}>Please wait while we fetch the latest information</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '2rem',
        maxWidth: '1200px',
        margin: '0 auto',
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
          <h2 style={{ color: '#dc3545', margin: '0 0 0.5rem 0' }}>Error Loading Data</h2>
          <p style={{ color: '#666', margin: '0 0 1rem 0' }}>{error}</p>
          <button
            onClick={loadData}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '1200px',
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
            System Data
          </h1>
          <p style={{ color: '#666', margin: 0 }}>
            View orders, tickets, and system analytics
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

      {/* 统计概览 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ color: '#007bff', fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>
            {orders.length}
          </h3>
          <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>Total Orders</p>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ color: '#28a745', fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>
            {tickets.length}
          </h3>
          <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>Total Tickets</p>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ color: '#ffc107', fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>
            {tickets.filter(t => t.status === 'used').length}
          </h3>
          <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>Used Tickets</p>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ color: '#dc3545', fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>
            {formatCurrency(orders.reduce((sum, order) => sum + (order.amount || 0), 0))}
          </h3>
          <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>Total Revenue</p>
        </div>
      </div>

      {/* 订单数据 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '2rem',
        border: '1px solid #e9ecef'
      }}>
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e9ecef'
        }}>
          <h2 style={{ margin: 0, color: '#333' }}>Recent Orders</h2>
        </div>
        
        {orders.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
            No orders found
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Order ID</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Email</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Amount</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 10).map((order) => (
                  <tr key={order.id}>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee', fontSize: '0.9rem' }}>
                      {order.id}
                    </td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee', fontSize: '0.9rem' }}>
                      {order.email}
                    </td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee', fontSize: '0.9rem' }}>
                      {formatCurrency(order.amount)}
                    </td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        backgroundColor: getStatusColor(order.status),
                        color: 'white'
                      }}>
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee', fontSize: '0.9rem' }}>
                      {formatDate(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 票据数据 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid #e9ecef'
      }}>
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e9ecef'
        }}>
          <h2 style={{ margin: 0, color: '#333' }}>Recent Tickets</h2>
        </div>
        
        {tickets.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
            No tickets found
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Ticket ID</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Event</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Tier</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Email</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Issued</th>
                </tr>
              </thead>
              <tbody>
                {tickets.slice(0, 10).map((ticket) => (
                  <tr key={ticket.id}>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee', fontSize: '0.9rem' }}>
                      {ticket.shortId}
                    </td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee', fontSize: '0.9rem' }}>
                      {ticket.eventId}
                    </td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee', fontSize: '0.9rem' }}>
                      {ticket.tier}
                    </td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee', fontSize: '0.9rem' }}>
                      {ticket.holderEmail}
                    </td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        backgroundColor: getStatusColor(ticket.status),
                        color: 'white'
                      }}>
                        {ticket.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee', fontSize: '0.9rem' }}>
                      {formatDate(ticket.issuedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}