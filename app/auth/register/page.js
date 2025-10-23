'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { hasSupabase } from '../../../lib/safeEnv'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    age: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    // 基本验证
    if (!formData.email || !formData.name || !formData.age) {
      setError('请填写所有必填字段')
      setIsSubmitting(false)
      return
    }

    const age = parseInt(formData.age)
    if (isNaN(age) || age < 16) {
      setError('年龄必须为 16 岁或以上')
      setIsSubmitting(false)
      return
    }

    try {
      if (hasSupabase()) {
        // 使用 Supabase 注册
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            name: formData.name,
            age: age
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || '注册失败')
        }

        const result = await response.json()
        console.log('注册成功:', result)
      } else {
        // 使用 localStorage 临时存储
        const userData = {
          email: formData.email,
          name: formData.name,
          age: age,
          registered_at: new Date().toISOString(),
          source: 'localStorage'
        }
        localStorage.setItem('partyTix_user', JSON.stringify(userData))
        console.log('用户数据已保存到 localStorage:', userData)
      }

      // 跳转到账户页面
      router.push('/account')
    } catch (err) {
      setError(err.message)
      console.error('注册错误:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-partytix-card backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">加入 PartyTix</h1>
          <p className="text-slate-400">创建您的 PartyTix 账户</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
              邮箱地址 *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
              姓名 *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="您的姓名"
              required
            />
          </div>

          <div>
            <label htmlFor="age" className="block text-sm font-medium text-slate-300 mb-2">
              年龄 *
            </label>
            <input
              type="number"
              id="age"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              min="16"
              max="120"
              className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="16"
              required
            />
            <p className="text-xs text-slate-500 mt-1">必须年满 16 岁</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-partytix-gradient w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '创建中...' : '创建 PartyTix 账户'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-500 text-sm">
            已有账户？{' '}
            <a href="/" className="text-purple-400 hover:text-purple-300 transition-colors">
              返回首页
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
