'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export default function MobileBridgePage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const url = new URL(window.location.href)
    const accessToken = url.searchParams.get('access_token')
    const refreshToken = url.searchParams.get('refresh_token')

    if (!accessToken || !refreshToken) {
      console.error('[MobileBridge] Missing tokens in URL')
      router.replace('/')
      return
    }

    ;(async () => {
      try {
        console.log('[MobileBridge] Got tokens from URL')

        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (error) {
          console.error('[MobileBridge] setSession error:', error)
          router.replace('/auth/login')
          return
        }

        console.log(
          '[MobileBridge] setSession success, user:',
          data.session?.user?.id
        )

        // Clean tokens from URL
        url.searchParams.delete('access_token')
        url.searchParams.delete('refresh_token')
        window.history.replaceState({}, '', url.toString())

        // Redirect to main app page
        router.replace('/')
      } catch (e) {
        console.error('[MobileBridge] unexpected error:', e)
        router.replace('/auth/login')
      }
    })()
  }, [router, supabase])

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        color: 'white',
      }}
    >
      <p>Signing you in...</p>
    </div>
  )
}

