'use client';

import { useState, useEffect } from 'react';
import apiClient from '../api-client';

// 通用数据获取钩子
export function useApi(endpoint, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    immediate = true,
    dependencies = [],
    onSuccess,
    onError,
  } = options;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(endpoint);
      
      if (response.success) {
        setData(response.data);
        onSuccess?.(response.data);
      } else {
        throw new Error(response.error || 'API request failed');
      }
    } catch (err) {
      setError(err.message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, dependencies);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

// 活动数据钩子
export function useEvents() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 useEvents: 开始获取活动数据')
      const response = await fetch('/api/events');
      const result = await response.json();
      
      console.log('📦 useEvents: 收到响应:', { success: result.success, dataLength: result.data?.length || 0 })
      
      if (result.success) {
        setData(result.data);
        console.log('✅ useEvents: 设置活动数据，数量:', result.data?.length || 0)
      } else {
        throw new Error(result.error || 'Failed to fetch events');
      }
    } catch (err) {
      console.error('❌ useEvents: 获取活动失败:', err)
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return { data, loading, error, refetch: fetchEvents };
}

// 用户资料钩子
export function useUserProfile() {
  return useApi('/users/profile');
}

// 用户票务钩子
export function useUserTickets() {
  return useApi('/users/tickets');
}

// 用户订单钩子
export function useUserOrders() {
  return useApi('/users/orders');
}

// 活动详情钩子
export function useEvent(id) {
  return useApi(`/events/${id}`, {
    immediate: !!id,
    dependencies: [id],
  });
}

// 票务验证钩子
export function useTicketVerification() {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const verifyTicket = async (qrPayload) => {
    try {
      setVerifying(true);
      setError(null);
      const response = await apiClient.verifyTicket(qrPayload);
      
      if (response.success) {
        setResult(response.data);
        return response.data;
      } else {
        throw new Error(response.error || 'Ticket verification failed');
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setVerifying(false);
    }
  };

  return {
    verifyTicket,
    verifying,
    result,
    error,
    clearResult: () => setResult(null),
  };
}

// 支付钩子
export function usePayment() {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const createCheckoutSession = async (data) => {
    try {
      setProcessing(true);
      setError(null);
      const response = await apiClient.createCheckoutSession(data);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || 'Payment session creation failed');
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setProcessing(false);
    }
  };

  return {
    createCheckoutSession,
    processing,
    error,
  };
}
