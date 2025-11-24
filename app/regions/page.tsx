import NavbarPartyTix from '@/components/NavbarPartyTix'
import RegionCard from '@/components/regions/RegionCard'
import { fetchActiveRegions } from '@/lib/regions'

export const dynamic = 'force-dynamic'

export default async function RegionsPage() {
  const regions = await fetchActiveRegions()

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #030712 0%, #5b21b6 45%, #0f172a 100%)',
      }}
    >
      <NavbarPartyTix />
      <main
        style={{
          paddingTop: '120px',
          paddingBottom: '60px',
          maxWidth: '1200px',
          margin: '0 auto',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}
      >
        <header
          style={{
            textAlign: 'center',
            marginBottom: '40px',
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
            PartyTix Regions
          </p>
          <h1
            style={{
              color: 'white',
              fontSize: '3rem',
              fontWeight: 700,
              marginBottom: '12px',
            }}
          >
            Choose Your City
          </h1>
          <p
            style={{
              color: 'rgba(226, 232, 240, 0.85)',
              fontSize: '1.1rem',
              maxWidth: '640px',
              margin: '0 auto',
            }}
          >
            Pick a region to explore curated events, VIP experiences, and LineLeap-powered
            nightlife.
          </p>
        </header>

        <section
          style={{
            marginBottom: '32px',
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '24px',
            padding: '24px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                textTransform: 'uppercase',
                letterSpacing: '0.3em',
                fontSize: '12px',
                marginBottom: '6px',
              }}
            >
              Always-on Coverage
            </p>
            <h3
              style={{
                color: 'white',
                fontSize: '1.5rem',
                fontWeight: 600,
                marginBottom: '4px',
              }}
            >
              Explore active LineLeap regions
            </h3>
            <span
              style={{
                color: 'rgba(226, 232, 240, 0.75)',
                fontSize: '0.9rem',
              }}
            >
              Tap a city below to jump directly into its events hub.
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: '0.95rem',
            }}
          >
            Want to bring PartyTix to your city? Contact us →
          </div>
        </section>

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
                title={region.name}
                subtitle={region.subtitle || undefined}
                href={`/${region.slug}`}
                imageUrl={region.cover_image || undefined}
                badge={region.is_active ? 'Live Now' : undefined}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

