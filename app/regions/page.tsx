'use client'

import NavbarPartyTix from '@/components/NavbarPartyTix'
import RegionCard from '@/components/regions/RegionCard'

const regions = [
  {
    title: 'Blacksburg, Virginia',
    subtitle: 'Virginia Tech · Downtown · Neon nightlife',
    href: '/blacksburg',
    badge: 'Live Now',
    imageUrl:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=60',
  },
]

export default function RegionsPage() {
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
              Current Location
            </p>
            <h3
              style={{
                color: 'white',
                fontSize: '1.5rem',
                fontWeight: 600,
                marginBottom: '4px',
              }}
            >
              Blacksburg, VA
            </h3>
            <span
              style={{
                color: 'rgba(226, 232, 240, 0.75)',
                fontSize: '0.9rem',
              }}
            >
              Detected via device · VT Campus
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
            LineLeap coverage expanding · Request your city →
          </div>
        </section>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '28px',
          }}
        >
          {regions.map((region) => (
            <RegionCard key={region.href} {...region} />
          ))}
        </div>
      </main>
    </div>
  )
}

