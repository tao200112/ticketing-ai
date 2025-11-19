'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { handleAfterLogin } from '@/lib/auth-after-login'

export default function OnboardingPage() {
  const router = useRouter()
  const { supabase } = useAuth()
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!name || name.trim().length < 2) {
      setError('请输入您的姓名（至少 2 个字符）')
      return
    }
    
    const ageNum = parseInt(age)
    if (!age || isNaN(ageNum) || ageNum < 16) {
      setError('年龄必须大于等于 16 岁')
      return
    }

    setLoading(true)

    try {
      // 更新用户信息
      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          age: ageNum
        })
        .eq('id', (await supabase.auth.getUser()).data.user.id)

      if (updateError) {
        throw updateError
      }

      // Onboarding 完成，使用 after-login 处理后续逻辑
      await handleAfterLogin({ 
        path: typeof window !== 'undefined' ? window.location.pathname : '',
        router 
      })
    } catch (err) {
      console.error('Onboarding error:', err)
      setError(err?.message || '保存信息失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '400px',
        width: '100%',
        color: 'white'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
          完善个人信息
        </h1>
        <p style={{ color: '#999', marginBottom: '24px' }}>
          请填写您的基本信息以继续
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              姓名
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入您的姓名"
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #333',
                backgroundColor: '#1a1a1a',
                color: 'white',
                fontSize: '16px'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              年龄
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="请输入您的年龄（≥16）"
              min="16"
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #333',
                backgroundColor: '#1a1a1a',
                color: 'white',
                fontSize: '16px'
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: loading ? '#555' : '#7C3AED',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '保存中...' : '完成'}
          </button>
        </form>
      </div>
    </div>
  )
}

