'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import RegionCard from '@/components/regions/RegionCard'
import type { RegionRecord } from '@/lib/regions'

type RegionPickerProps = {
  regions: RegionRecord[]
  variant?: 'home' | 'page'
}

const REGION_COOKIE_KEY = 'user-region'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export default function RegionPicker({ regions, variant = 'page' }: RegionPickerProps) {
  const router = useRouter()
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const heading = useMemo(() => {
    if (variant === 'home') {
      return {
        badge: 'Start with your city',
        title: 'Where should we take you tonight?',
        description: 'Choose a PartyTix region to personalize events, perks, and nightlife drops.',
      }
    }
    return {
      badge: 'PartyTix Regions',
      title: 'Choose Your City',
      description: 'Pick a region to explore curated events, VIP experiences, and LineLeap-powered nightlife.',
    }
  }, [variant])

  const persistRegion = useCallback((slug: string) => {
    try {
      localStorage.setItem(REGION_COOKIE_KEY, slug)
    } catch (error) {
      console.warn('[RegionPicker] Failed to write localStorage', error)
    }

    try {
      document.cookie = `${REGION_COOKIE_KEY}=${encodeURIComponent(slug)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
    } catch (error) {
      console.warn('[RegionPicker] Failed to write cookie', error)
    }
  }, [])

  const handleSelect = useCallback(
    (slug: string) => {
      if (!slug || saving) {
        return
      }
      setSaving(true)
      setSelectedSlug(slug)
      persistRegion(slug)
      router.push(`/events?region=${encodeURIComponent(slug)}`)
    },
    [persistRegion, router, saving],
  )

  return (
    <section
      style={{
        minHeight: 'calc(100vh - 160px)',
        background: 'linear-gradient(135deg, #030712 0%, #5b21b6 45%, #0f172a 100%)',
        paddingBottom: '96px',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '120px 24px 0 24px',
        }}
      >
        <header
          style={{
            textAlign: 'center',
            marginBottom: '48px',
          }}
        >
          <p
            style={{
              letterSpacing: '0.3em',
              color: 'rgba(255, 255, 255, 0.6)',
              textTransform: 'uppercase',
              fontSize: '12px',
              marginBottom: '12px',
            }}
          >
            {heading.badge}
          </p>
          <h1
            style={{
              color: 'white',
              fontSize: '3rem',
              fontWeight: 700,
              marginBottom: '12px',
            }}
          >
            {heading.title}
          </h1>
          <p
            style={{
              color: 'rgba(226, 232, 240, 0.85)',
              fontSize: '1.1rem',
              maxWidth: '640px',
              margin: '0 auto',
            }}
          >
            {heading.description}
          </p>
        </header>

        {regions.length === 0 ? (
          <div
            style={{
              borderRadius: '20px',
              border: '1px dashed rgba(255, 255, 255, 0.3)',
              padding: '40px',
              textAlign: 'center',
              color: 'white',
              background: 'rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🌎</div>
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>No regions available yet</p>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Check back soon or reach out if you'd like PartyTix in your area.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '28px',
            }}
          >
            {regions.map((region) => (
              <RegionCard
                key={region.id}
                slug={region.slug}
                title={region.name}
                subtitle={region.subtitle || undefined}
                imageUrl={region.cover_image || undefined}
                badge={region.is_active ? 'Live Now' : undefined}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}

        {selectedSlug && (
          <p
            style={{
              marginTop: '32px',
              textAlign: 'center',
              color: 'rgba(226, 232, 240, 0.85)',
              fontSize: '0.95rem',
            }}
          >
            {saving
              ? 'Saving your region preference...'
              : `Opening ${selectedSlug.toUpperCase()} events...`}
          </p>
        )}
      </div>
    </section>
  )
}


