'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

/**
 * 🛡️ 错误边界组件
 * 捕获子组件渲染期间的错误并显示友好的错误信息
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误到控制台
    console.error('ErrorBoundary 捕获到错误:', error, errorInfo)
    
    // 调用自定义错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      // 自定义错误 UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默认错误 UI
      return (
        <div style={{
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          margin: '1rem 0'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#ef4444',
            marginBottom: '0.5rem'
          }}>
            页面加载出错
          </h3>
          <p style={{
            color: '#94a3b8',
            textAlign: 'center',
            marginBottom: '1rem',
            maxWidth: '400px'
          }}>
            抱歉，页面遇到了一个错误。请刷新页面重试，或联系技术支持。
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              刷新页面
            </button>
            <button
              onClick={() => window.history.back()}
              style={{
                backgroundColor: '#6b7280',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              返回上页
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
              fontSize: '0.875rem',
              color: '#6b7280',
              maxWidth: '100%',
              overflow: 'auto'
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
                错误详情 (开发模式)
              </summary>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * 简化的错误边界 Hook（用于函数组件）
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: any) => {
    console.error('组件错误:', error, errorInfo)
    // 这里可以添加错误上报逻辑
  }
}

/**
 * 事件详情专用的错误边界
 */
export function EventDetailErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div style={{
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          margin: '1rem 0'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎫</div>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '0.5rem'
          }}>
            事件加载失败
          </h2>
          <p style={{
            color: '#94a3b8',
            textAlign: 'center',
            marginBottom: '1.5rem',
            maxWidth: '500px'
          }}>
            无法加载事件详情。请检查网络连接或稍后重试。
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
              color: 'white',
              padding: '0.75rem 2rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem'
            }}
          >
            重新加载
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
