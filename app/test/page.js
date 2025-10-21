'use client';

import { useState, useEffect } from 'react';

export default function TestPage() {
  const [pingResult, setPingResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPingResult = async () => {
      try {
        const response = await fetch('/api/ping-supabase');
        const data = await response.json();
        setPingResult(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchPingResult();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1>🧪 Supabase 连接诊断</h1>
        <p>正在测试连接...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1>❌ 测试失败</h1>
        <p>错误: {error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>🧪 Supabase 连接诊断</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2>📊 诊断结果</h2>
        <div style={{ 
          padding: '1rem', 
          backgroundColor: pingResult?.conclusion?.includes('正常') ? '#d4edda' : '#f8d7da',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          <strong>结论:</strong> {pingResult?.conclusion}
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>🔍 详细数据</h2>
        <pre style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '1rem', 
          borderRadius: '4px',
          overflow: 'auto',
          fontSize: '14px'
        }}>
          {JSON.stringify(pingResult, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>📋 关键字段</h2>
        <ul>
          <li><strong>状态码:</strong> {pingResult?.status || 'N/A'}</li>
          <li><strong>响应时间:</strong> {pingResult?.elapsedMs || 0}ms</li>
          <li><strong>环境变量:</strong> URL={pingResult?.env?.urlLoaded ? '✅' : '❌'}, Key={pingResult?.env?.anonLoaded ? '✅' : '❌'}</li>
          <li><strong>掩码密钥:</strong> {pingResult?.env?.maskedAnonKey || 'N/A'}</li>
          <li><strong>DNS 解析:</strong> {pingResult?.dns ? `✅ ${pingResult.dns.length} 个IP` : '❌ 解析失败'}</li>
        </ul>
      </div>

      <div>
        <h2>🔗 其他测试</h2>
        <p>
          <a href="/events" style={{ marginRight: '1rem' }}>Events 页面测试</a>
          <a href="/">返回首页</a>
        </p>
      </div>
    </div>
  );
}
