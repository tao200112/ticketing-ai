'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalTickets: 0,
    totalRevenue: 0,
    usedTickets: 0
  });

  useEffect(() => {
    // 加载统计数据
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // 获取订单统计
      const ordersResponse = await fetch('/api/admin/orders');
      const ordersData = await ordersResponse.json();
      
      // 获取票据统计
      const ticketsResponse = await fetch('/api/admin/tickets');
      const ticketsData = await ticketsResponse.json();
      
      if (ordersData.success && ticketsData.success) {
        const orders = ordersData.orders || [];
        const tickets = ticketsData.tickets || [];
        
        const totalRevenue = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
        const usedTickets = tickets.filter(ticket => ticket.status === 'used').length;
        
        setStats({
          totalOrders: orders.length,
          totalTickets: tickets.length,
          totalRevenue: totalRevenue / 100, // 转换为美元
          usedTickets: usedTickets
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
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
            Admin Dashboard
          </h1>
          <p style={{ color: '#666', margin: 0 }}>
            Manage your ticketing system
          </p>
        </div>
        <Link href="/" style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#6c757d',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: '500'
        }}>
          ← Back to Home
        </Link>
      </div>

      {/* 统计卡片 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          textAlign: 'center',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
          <h3 style={{ color: '#007bff', fontSize: '2rem', margin: '0 0 0.5rem 0' }}>
            {stats.totalOrders}
          </h3>
          <p style={{ color: '#666', margin: 0, fontWeight: '500' }}>Total Orders</p>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          textAlign: 'center',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎫</div>
          <h3 style={{ color: '#28a745', fontSize: '2rem', margin: '0 0 0.5rem 0' }}>
            {stats.totalTickets}
          </h3>
          <p style={{ color: '#666', margin: 0, fontWeight: '500' }}>Total Tickets</p>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          textAlign: 'center',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💰</div>
          <h3 style={{ color: '#ffc107', fontSize: '2rem', margin: '0 0 0.5rem 0' }}>
            ${stats.totalRevenue.toFixed(2)}
          </h3>
          <p style={{ color: '#666', margin: 0, fontWeight: '500' }}>Total Revenue</p>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          textAlign: 'center',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
          <h3 style={{ color: '#dc3545', fontSize: '2rem', margin: '0 0 0.5rem 0' }}>
            {stats.usedTickets}
          </h3>
          <p style={{ color: '#666', margin: 0, fontWeight: '500' }}>Used Tickets</p>
        </div>
      </div>

      {/* 管理功能网格 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginTop: '2rem'
      }}>
        <Link href="/admin/orders" style={{
          display: 'block',
          padding: '1.5rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          textDecoration: 'none',
          color: '#333',
          transition: 'transform 0.3s, box-shadow 0.3s',
          border: '1px solid #e9ecef'
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'translateY(-4px)';
          e.target.style.boxShadow = '0 8px 15px rgba(0, 0, 0, 0.2)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', color: '#333' }}>Orders</h3>
          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>View and manage all orders</p>
        </Link>

        <Link href="/admin/tickets" style={{
          display: 'block',
          padding: '1.5rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          textDecoration: 'none',
          color: '#333',
          transition: 'transform 0.3s, box-shadow 0.3s',
          border: '1px solid #e9ecef'
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'translateY(-4px)';
          e.target.style.boxShadow = '0 8px 15px rgba(0, 0, 0, 0.2)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎫</div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', color: '#333' }}>Tickets</h3>
          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>View and manage all tickets</p>
        </Link>

        <Link href="/admin/scan" style={{
          display: 'block',
          padding: '1.5rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          textDecoration: 'none',
          color: '#333',
          transition: 'transform 0.3s, box-shadow 0.3s',
          border: '1px solid #e9ecef'
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'translateY(-4px)';
          e.target.style.boxShadow = '0 8px 15px rgba(0, 0, 0, 0.2)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📱</div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', color: '#333' }}>Scan Tickets</h3>
          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>Scan and verify tickets</p>
        </Link>

        <Link href="/admin/test-checkout" style={{
          display: 'block',
          padding: '1.5rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          textDecoration: 'none',
          color: '#333',
          transition: 'transform 0.3s, box-shadow 0.3s',
          border: '1px solid #e9ecef'
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'translateY(-4px)';
          e.target.style.boxShadow = '0 8px 15px rgba(0, 0, 0, 0.2)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🧪</div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', color: '#333' }}>Test Checkout</h3>
          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>Test payment integration</p>
        </Link>

        <Link href="/admin/data" style={{
          display: 'block',
          padding: '1.5rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          textDecoration: 'none',
          color: '#333',
          transition: 'transform 0.3s, box-shadow 0.3s',
          border: '1px solid #e9ecef'
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'translateY(-4px)';
          e.target.style.boxShadow = '0 8px 15px rgba(0, 0, 0, 0.2)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📊</div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', color: '#333' }}>View Data</h3>
          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>View system data and analytics</p>
        </Link>
      </div>
    </div>
  );
}