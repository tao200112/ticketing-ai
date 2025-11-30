'use client'

import { useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateMerchantRegion } from '../actions'

type RegionOption = {
  id: string
  name: string
  is_active?: boolean
}

type MerchantRowProps = {
  merchant: any
  regions: RegionOption[]
  regionsLoading: boolean
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

export default function MerchantRow({
  merchant,
  regions,
  regionsLoading,
  onSuccess,
  onError,
}: MerchantRowProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleRegionChange = useCallback(
    (nextRegionId: string) => {
      if (!nextRegionId) return
      startTransition(async () => {
        try {
          await updateMerchantRegion({ merchantId: merchant.id, regionId: nextRegionId })
          onSuccess?.('Merchant region updated')
          router.refresh()
        } catch (error: any) {
          console.error('[MerchantRow] update region failed', error)
          onError?.(error?.message || 'Failed to update merchant region')
        }
      })
    },
    [merchant.id, onSuccess, onError, router],
  )

  return (
    <tr style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <td style={{ padding: '16px 20px' }}>
        <div style={{ fontWeight: 600 }}>{merchant.name || 'Unnamed Merchant'}</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>ID: {merchant.id}</div>
      </td>
      <td style={{ padding: '16px 20px', fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
        <div>{merchant.email || 'N/A'}</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
          {merchant.contact_phone || 'No phone'}
        </div>
      </td>
      <td style={{ padding: '16px 20px' }}>
        {regionsLoading ? (
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Loading…</span>
        ) : (
          <select
            value={merchant.region_id || ''}
            onChange={(e) => handleRegionChange(e.target.value)}
            disabled={isPending}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(0,0,0,0.35)',
              color: 'white',
              outline: 'none',
              minWidth: '180px',
              opacity: isPending ? 0.7 : 1,
              cursor: isPending ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="" disabled>
              Select region
            </option>
            {regions.map((region) => (
              <option key={region.id} value={region.id} style={{ color: '#0f172a' }}>
                {region.name}
                {!region.is_active ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
        )}
        {merchant.region && (
          <div style={{ marginTop: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
            slug: {merchant.region}
          </div>
        )}
      </td>
      <td style={{ padding: '16px 20px' }}>
        <span
          style={{
            padding: '6px 12px',
            borderRadius: '999px',
            background: merchant.verified ? 'rgba(16, 185, 129, 0.2)' : 'rgba(248, 113, 113, 0.2)',
            color: merchant.verified ? '#6ee7b7' : '#fecaca',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {merchant.verified ? 'Verified' : 'Unverified'}
        </span>
      </td>
      <td style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => router.push(`/admin/merchants/${merchant.id}/edit`)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Edit
          </button>
        </div>
      </td>
    </tr>
  )
}


