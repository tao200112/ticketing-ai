// Moved to app/merchant/(protected)/page.js
// Keep this file as a noop to prevent route conflicts; do not import client hooks here.
export default function MerchantLegacyPlaceholder() {
  return null
}

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
// import { hasSupabase } from '../../lib/safeEnv' // 已移除，使用新的 API 客户端
import Link from 'next/link'
import MerchantNavbar from '@/components/MerchantNavbar'

export default function MerchantOverviewPage() {
  const router = useRouter()
  const [merchantUser, setMerchantUser] = useState(null)
  const [userRole, setUserRole] = useState(null) // 'boss' or 'staff'

  useEffect(() => {
    // 检查商家登录状态 - 从 API 获取商家信息
    const checkMerchantAuth = async () => {
      try {
        const response = await fetch('/api/merchant/profile')
        const data = await response.json()
        
        if (response.ok && data.success) {
          // 认证成功，设置商家信息
          setMerchantUser({
            id: data.merchant.id,
            email: data.merchant.email,
            name: data.merchant.name,
            merchant: data.merchant,
            merchant_id: data.merchant.id
          })
          setUserRole('boss') // 设置为boss，但仅用于显示，不影响页面访问
        } else {
          // 认证失败，重定向到登录页
          router.push('/merchant/auth/login')
        }
      } catch (error) {
        console.error('Error checking merchant auth:', error)
        router.push('/merchant/auth/login')
      }
    }
    
    checkMerchantAuth()
  }, [router])


  // 如果未登录，不显示任何内容（已经跳转到登录页）
  if (!merchantUser) {
    return null
  }

  // 主页面始终显示导航栏和Staff/Boss选择界面
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        paddingTop: '80px'
      }}>
        <MerchantNavbar userRole={userRole} />
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '48px',
            textAlign: 'center'
          }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '16px'
            }}>
              Merchant Console
            </h1>
            <p style={{
              color: '#94a3b8',
              marginBottom: '48px',
              fontSize: '1.125rem'
            }}>
              Please select access mode
            </p>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
              maxWidth: '800px',
              margin: '0 auto'
            }}>
              {/* Staff 入口 */}
              <div
                onClick={() => router.push('/merchant/scan')}
                style={{
                  background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(219, 39, 119, 0.1) 100%)',
                  border: '1px solid rgba(236, 72, 153, 0.3)',
                  borderRadius: '16px',
                  padding: '32px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(236, 72, 153, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{
                  width: '64px',
                  height: '64px',
                  background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  margin: '0 auto 24px'
                }}>
                  📱
                </div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: 'white',
                  marginBottom: '12px'
                }}>
                  Staff
                </h2>
                <p style={{
                  color: '#94a3b8',
                  marginBottom: '24px'
                }}>
                  Scan and verify tickets
                </p>
                <div style={{
                  color: '#ec4899',
                  fontWeight: '500'
                }}>
                  Direct Access →
                </div>
              </div>
              
              {/* Boss 入口 */}
              <div
                onClick={() => router.push('/merchant/boss')}
                style={{
                  background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  borderRadius: '16px',
                  padding: '32px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(124, 58, 237, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{
                  width: '64px',
                  height: '64px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  margin: '0 auto 24px'
                }}>
                  👔
                </div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: 'white',
                  marginBottom: '12px'
                }}>
                  Boss
                </h2>
                <p style={{
                  color: '#94a3b8',
                  marginBottom: '24px'
                }}>
                  Full Management<br/>(Password Required)
                </p>
                <div style={{
                  color: '#7c3aed',
                  fontWeight: '500'
                }}>
                  Verify Password →
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
}