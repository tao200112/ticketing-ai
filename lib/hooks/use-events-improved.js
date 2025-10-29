'use client';

import { useState, useEffect } from 'react';

/**
 * 改进的活动数据钩子
 * 解决loading状态和错误处理问题
 */
export function useEvents() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 useEvents: 开始获取活动数据');
      
      const response = await fetch('/api/events');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📦 useEvents: 收到响应:', { 
        success: result.success, 
        dataLength: result.data?.length || 0 
      });
      
      if (result.success) {
        // 处理日期格式
        const processedData = result.data?.map(event => ({
          ...event,
          formatted_start_at: event.start_at ? new Date(event.start_at).toLocaleDateString() : 'TBD',
          formatted_end_at: event.end_at ? new Date(event.end_at).toLocaleDateString() : 'TBD',
          is_valid_date: event.start_at ? !isNaN(new Date(event.start_at).getTime()) : false
        })) || [];
        
        setData(processedData);
        console.log('✅ useEvents: 设置活动数据，数量:', processedData.length);
      } else {
        throw new Error(result.error || 'Failed to fetch events');
      }
    } catch (err) {
      console.error('❌ useEvents: 获取活动失败:', err);
      setError(err.message);
      setData([]); // 设置空数组而不是null
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchEvents 
  };
}
