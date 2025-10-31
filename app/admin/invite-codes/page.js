'use client'

import { useState, useEffect } from 'react'

export default function InviteCodesPage() {
  const [inviteCodes, setInviteCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchInviteCodes()
  }, [])

  const fetchInviteCodes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/invite-codes')
      const data = await response.json()
      
      if (data.success) {
        setInviteCodes(data.inviteCodes || [])
      } else {
        setError(data.error || '获取邀请码失败')
      }
    } catch (err) {
      setError('网络错误: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const generateNewCode = async () => {
    try {
      const response = await fetch('/api/admin/invite-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          maxEvents: 10,
          expiresInDays: 30
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // 重新获取邀请码列表
        await fetchInviteCodes()
        alert('邀请码生成成功!')
      } else {
        alert('生成失败: ' + (data.error || '未知错误'))
      }
    } catch (err) {
      alert('生成邀请码时出错: ' + err.message)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '未知'
    return new Date(dateString).toLocaleString('zh-CN')
  }

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: 'white', fontSize: '1.5rem' }}>加载中...</div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* 页面标题 */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            color: 'white', 
            marginBottom: '0.5rem' 
          }}>
            商家邀请码管理
          </h1>
          <p style={{ 
            fontSize: '1.125rem', 
            color: '#94a3b8',
            margin: 0 
          }}>
            管理商家注册邀请码，控制平台访问权限
          </p>
        </div>

        {/* 操作按钮 */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={generateNewCode}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
          >
            ➕ 生成新邀请码
          </button>
          
          <button
            onClick={fetchInviteCodes}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            🔄 刷新列表
          </button>
        </div>

        {/* 错误信息 */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '2rem',
            color: '#dc2626'
          }}>
            ❌ {error}
          </div>
        )}

        {/* 邀请码列表 */}
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          borderRadius: '16px',
          padding: '2rem',
          border: '1px solid rgba(124, 58, 237, 0.3)'
        }}>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            color: 'white', 
            marginBottom: '1.5rem' 
          }}>
            邀请码列表 ({inviteCodes.length} 个)
          </h2>

          {inviteCodes.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#94a3b8'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
              <div style={{ fontSize: '1.125rem' }}>暂无邀请码</div>
              <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                点击上方按钮生成第一个邀请码
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {inviteCodes.map((code, index) => (
                <div
                  key={code.id || index}
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '300px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem',
                      marginBottom: '0.5rem'
                    }}>
                      <div style={{
                        backgroundColor: code.is_active ? '#10b981' : '#6b7280',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}>
                        {code.is_active ? '✅ 活跃' : '❌ 已停用'}
                      </div>
                      
                      {isExpired(code.expires_at) && (
                        <div style={{
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.875rem',
                          fontWeight: '500'
                        }}>
                          ⏰ 已过期
                        </div>
                      )}
                    </div>
                    
                    <div style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: 'bold', 
                      color: 'white',
                      fontFamily: 'monospace',
                      marginBottom: '0.5rem'
                    }}>
                      {code.code}
                    </div>
                    
                    <div style={{ 
                      fontSize: '0.875rem', 
                      color: '#94a3b8',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}>
                      <div>最大活动数: {code.max_events || '无限制'}</div>
                      <div>创建时间: {formatDate(code.created_at)}</div>
                      <div>过期时间: {formatDate(code.expires_at) || '永不过期'}</div>
                      <div>创建者: {code.created_by || '未知'}</div>
                      {code.used_by && (
                        <div>使用者: {code.used_by}</div>
                      )}
                      {code.used_at && (
                        <div>使用时间: {formatDate(code.used_at)}</div>
                      )}
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    alignItems: 'flex-end'
                  }}>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(code.code)
                        alert('邀请码已复制到剪贴板!')
                      }}
                      style={{
                        backgroundColor: '#7c3aed',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        transition: 'background-color 0.3s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#6d28d9'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#7c3aed'}
                    >
                      📋 复制
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}









