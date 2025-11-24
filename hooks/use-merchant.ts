'use client'

import { useCallback, useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type MerchantProfile = {
  id: string
  auth_user_id: string
  email: string
  name: string | null
  contact_phone: string | null
  status: string
  verified: boolean
  max_events: number | null
  region_id: string | null
  region_slug?: string | null
  region_name?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type UseMerchantResult = {
  merchant: MerchantProfile | null
  loading: boolean
  error: string | null
  refresh: () => Promise<MerchantProfile | null>
}

export function useMerchant(): UseMerchantResult {
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMerchant = useCallback(async () => {
    const supabase = getSupabaseBrowserClient()
    setLoading(true)
    setError(null)

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        throw sessionError
      }

      const sessionUserId = session?.user?.id
      if (!sessionUserId) {
        setMerchant(null)
        setLoading(false)
        return null
      }

      const response = await fetch('/api/merchant/profile', {
        credentials: 'include'
      })

      let payload: any = null
      try {
        payload = await response.json()
      } catch (err) {
        payload = null
      }

      if (!response.ok || !payload?.success || !payload?.merchant) {
        setMerchant(null)
        setError(payload?.error || payload?.message || 'MERCHANT_FETCH_FAILED')
        setLoading(false)
        return null
      }

      if (payload.merchant.auth_user_id !== sessionUserId) {
        console.warn('[useMerchant] Session user does not match merchant.auth_user_id', {
          sessionUserId,
          merchantAuthUserId: payload.merchant.auth_user_id
        })
        setMerchant(null)
        setError('MERCHANT_SESSION_MISMATCH')
        setLoading(false)
        return null
      }

      setMerchant(payload.merchant)
      setLoading(false)
      return payload.merchant as MerchantProfile
    } catch (err) {
      console.error('[useMerchant] Failed to load merchant', err)
      setMerchant(null)
      setError(err instanceof Error ? err.message : 'MERCHANT_FETCH_FAILED')
      setLoading(false)
      return null
    }
  }, [])

  useEffect(() => {
    fetchMerchant()
  }, [fetchMerchant])

  return {
    merchant,
    loading,
    error,
    refresh: fetchMerchant
  }
}

