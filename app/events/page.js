'use client';

import { useState, useEffect } from 'react';

// 【3】本地占位数据
const mockEvents = [
  { 
    id: 'm1', 
    name: 'Music Night', 
    price: 39, 
    venue: 'Main Hall', 
    start_time: new Date().toISOString() 
  },
  { 
    id: 'm2', 
    name: 'Tech Talk', 
    price: 19, 
    venue: 'Room A', 
    start_time: new Date(Date.now() + 86400000).toISOString() 
  },
  { 
    id: 'm3', 
    name: 'Kids Show', 
    price: 29, 
    venue: 'Theater', 
    start_time: new Date(Date.now() + 2 * 86400000).toISOString() 
  },
];

export default function Events() {
  const [events, setEvents] = useState([]);
  const [isLiveData, setIsLiveData] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // 设置 2 秒客户端超时
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('客户端超时')), 2000)
        );
        
        const fetchPromise = fetch('/api/events', { cache: 'no-store' })
          .then(res => res.json());
        
        const result = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (result.ok && result.data) {
          setEvents(result.data);
          setIsLiveData(true);
        } else {
          setEvents(mockEvents);
          setIsLiveData(false);
        }
      } catch (err) {
        console.log('API 请求失败，使用 mock 数据:', err.message);
        setEvents(mockEvents);
        setIsLiveData(false);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1>Events</h1>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#333' }}>
          Events
        </h1>
        
        {/* 数据源标签 */}
        <div style={{
          padding: '0.5rem 1rem',
          borderRadius: '20px',
          fontSize: '0.9rem',
          fontWeight: 'bold',
          backgroundColor: isLiveData ? '#d4edda' : '#fff3cd',
          color: isLiveData ? '#155724' : '#856404',
          border: `1px solid ${isLiveData ? '#c3e6cb' : '#ffeaa7'}`
        }}>
          {isLiveData ? '🟢 Live data' : '🟡 Mock data (fallback)'}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem'
      }}>
        {events.map((event) => (
          <div key={event.id} style={{
            border: '1px solid #e9ecef',
            borderRadius: '12px',
            padding: '1.5rem',
            backgroundColor: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
              color: '#333'
            }}>
              {event.name}
            </h3>
            
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Time:</strong> {new Date(event.start_time).toLocaleString()}
            </div>
            
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Venue:</strong> {event.venue}
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <strong>Price:</strong> <span style={{ color: '#28a745', fontWeight: 'bold' }}>${event.price}</span>
            </div>
            
            <a href="/event/demo" style={{
              display: 'inline-block',
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              textAlign: 'center',
              fontWeight: 'bold',
              transition: 'background-color 0.3s'
            }}>
              Buy Tickets
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
