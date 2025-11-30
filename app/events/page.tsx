import EventCard from '@/components/events/EventCard'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { RegionRecord } from '@/lib/regions'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

type EventsPageProps = {
  searchParams?: {
    region?: string
  }
}

type EventRecord = {
  id: string
  title: string | null
  name?: string | null
  description: string | null
  start_at: string | null
  start_date?: string | null
  venue_name: string | null
  address: string | null
  poster_url: string | null
  status: string | null
  region: string | null
  formatted_start_at?: string
  location?: string | null
  starting_price?: number | null
}

const INVALID_TITLES = new Set(['aa', 'bb', '11'])

export const dynamic = 'force-dynamic'

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const regionFromQuery = searchParams?.region?.toString().trim().toLowerCase() || null
  const cookieRegion = cookies().get('user-region')?.value?.toLowerCase() || null
  const resolvedRegion = regionFromQuery || cookieRegion

  if (!resolvedRegion) {
    redirect('/regions')
  }

  const supabase = createSupabaseServerClient()
  if (!supabase) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        }}
      >
        Supabase is not configured. Please check environment variables.
      </div>
    )
  }

  const {
    data: regionRecord,
    error: regionError,
  } = await supabase
    .from('regions')
    .select('id, name, slug, subtitle')
    .eq('slug', resolvedRegion)
    .eq('is_active', true)
    .maybeSingle()

  if (regionError || !regionRecord) {
    redirect('/regions')
  }

  const events = await fetchRegionEvents(supabase, regionRecord)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        padding: '64px 24px 96px 24px',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p
            style={{
              letterSpacing: '0.3em',
              color: 'rgba(255, 255, 255, 0.6)',
              textTransform: 'uppercase',
              fontSize: '12px',
              marginBottom: '12px',
            }}
          >
            Events in {regionRecord.name}
          </p>
          <h1
            style={{
              fontSize: '3rem',
              color: 'white',
              fontWeight: 700,
              marginBottom: '12px',
            }}
          >
            Nightlife Highlights
          </h1>
          <p
            style={{
              color: 'rgba(226, 232, 240, 0.85)',
              fontSize: '1.1rem',
              maxWidth: '640px',
              margin: '0 auto',
            }}
          >
            {regionRecord.subtitle ||
              'Discover curated events, drop-ins, and PartyTix exclusives tailored to your city.'}
          </p>
          <a
            href="/regions"
            style={{
              display: 'inline-flex',
              marginTop: '24px',
              padding: '12px 24px',
              borderRadius: '999px',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              background: 'transparent',
              color: 'white',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Change Region
          </a>
        </div>

        {events.length === 0 ? (
          <div
            style={{
              borderRadius: '20px',
              border: '1px dashed rgba(255, 255, 255, 0.3)',
              padding: '48px',
              textAlign: 'center',
              color: 'rgba(226, 232, 240, 0.9)',
              background: 'rgba(15, 23, 42, 0.6)',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎟️</div>
            <h3 style={{ fontSize: '1.5rem', color: 'white', marginBottom: '8px' }}>
              No events scheduled yet
            </h3>
            <p>We are lining up new experiences in {regionRecord.name}. Check back soon!</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
            }}
          >
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

async function fetchRegionEvents(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  region: Pick<RegionRecord, 'id' | 'slug'>,
): Promise<EventRecord[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('events')
    .select(
      `
      id,
      title,
      description,
      start_at,
      venue_name,
      address,
      poster_url,
      status,
      region,
      prices (
        id,
        amount_cents,
        is_active
      )
    `,
    )
    .or(`region.eq.${region.slug},region_id.eq.${region.id}`)
    .order('start_at', { ascending: true })

  if (error) {
    console.error('[events/page] Failed to load events', error)
    return []
  }

  return (data || [])
    .filter((event) => {
      const title = event.title?.trim().toLowerCase() || ''
      return !INVALID_TITLES.has(title)
    })
    .map((event) => {
      const minPriceCents = (event.prices || [])
        .filter((price) => price.is_active !== false)
        .reduce<number | null>((acc, price) => {
          if (price.amount_cents == null) {
            return acc
          }
          if (acc === null) {
            return price.amount_cents
          }
          return Math.min(acc, price.amount_cents)
        }, null)

      return {
        ...event,
        name: event.title,
        start_date: event.start_at,
        location: event.venue_name || event.address || 'Location TBA',
        formatted_start_at: event.start_at
          ? new Date(event.start_at).toLocaleString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })
          : undefined,
        starting_price: minPriceCents ? minPriceCents / 100 : null,
      }
    })
}


