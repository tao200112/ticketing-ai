'use client'

import Link from 'next/link'
import { CSSProperties } from 'react'

type RegionCardProps = {
  title: string
  subtitle?: string
  href: string
  imageUrl?: string
  badge?: string
}

export default function RegionCard({
  title,
  subtitle,
  href,
  imageUrl,
  badge,
}: RegionCardProps) {
  const backgroundStyles: CSSProperties = imageUrl
    ? {
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        background: 'linear-gradient(135deg, rgba(124,58,237,0.7), rgba(14,165,233,0.7))',
      }

  return (
    <Link
      href={href}
      style={{ textDecoration: 'none' }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: '24px',
          overflow: 'hidden',
          minHeight: '240px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.45)',
          transform: 'translateY(0)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-6px)'
          e.currentTarget.style.boxShadow = '0 30px 60px rgba(15, 23, 42, 0.55)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 20px 50px rgba(15, 23, 42, 0.45)'
        }}
      >
        <div
          style={{
            ...backgroundStyles,
            position: 'absolute',
            inset: 0,
            filter: 'brightness(0.9)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(88, 28, 135, 0.35))',
          }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '28px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {badge && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                {badge}
              </span>
            )}
            <h3
              style={{
                color: 'white',
                fontSize: '1.75rem',
                fontWeight: 700,
                marginBottom: '8px',
              }}
            >
              {title}
            </h3>
            {subtitle && (
              <p
                style={{
                  color: 'rgba(226, 232, 240, 0.85)',
                  fontSize: '1rem',
                  margin: 0,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '24px',
              color: '#a855f7',
              fontWeight: 600,
              fontSize: '0.95rem',
              padding: '10px 16px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.08)',
              alignSelf: 'flex-start',
            }}
          >
            Enter Region →
          </div>
        </div>
      </div>
    </Link>
  )
}

