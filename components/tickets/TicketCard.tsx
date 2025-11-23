'use client'

import { useMemo, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  getTicketKindDisplayName,
  getTicketRedemptionLocation,
} from '@/lib/ticket-helpers'
import type { RedemptionState, TicketRecord } from './types'

type TicketCardProps = {
  ticket: TicketRecord
  isUsed: boolean
  showQR: boolean
  onToggleQR: (ticketId: string) => void
  redemptionState: RedemptionState
  onRedeemTap?: () => void
  onRedeemLongPress?: () => void
  onRedeemReset?: () => void
}

export default function TicketCard({
  ticket,
  isUsed,
  showQR,
  onToggleQR,
  redemptionState,
  onRedeemTap,
  onRedeemLongPress,
  onRedeemReset,
}: TicketCardProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const eventTitle =
    ticket.event_snapshot?.title ||
    ticket.events?.title ||
    ticket.events?.name ||
    'Event'
  const startAt =
    ticket.event_snapshot?.start_at || ticket.events?.start_at || null
  const venue =
    ticket.event_snapshot?.venue ||
    ticket.events?.venue_name ||
    ticket.events?.address ||
    ''
  const ticketLabel = getTicketKindDisplayName(ticket.ticket_kind)
  const redeemLocation = getTicketRedemptionLocation(ticket.ticket_kind)

  const qrValue = useMemo(() => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://partytix.app'
    return `${origin}/ticket/${ticket.short_id || ticket.id}`
  }, [ticket.id, ticket.short_id])

  const handlePressStart = () => {
    if (!onRedeemLongPress || redemptionState !== 'confirm') {
      return
    }
    longPressTimer.current = setTimeout(() => {
      onRedeemLongPress()
    }, 1500)
  }

  const handlePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  return (
    <div
      style={{
        background: isUsed ? 'rgba(15, 23, 42, 0.65)' : 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 15px 40px rgba(15, 23, 42, 0.45)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        opacity: isUsed ? 0.9 : 1,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div
            style={{
              color: 'white',
              fontSize: '20px',
              fontWeight: 700,
              marginBottom: '6px',
            }}
          >
            {ticketLabel}
          </div>
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: '16px',
              fontWeight: 600,
              marginBottom: '6px',
            }}
          >
            {eventTitle}
          </div>
          {startAt && (
            <div
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '14px',
                marginBottom: '4px',
              }}
            >
              {new Date(startAt).toLocaleString()}
            </div>
          )}
          {venue && (
            <div
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '14px',
              }}
            >
              📍 {venue}
            </div>
          )}
          {isUsed && ticket.used_at && (
            <div
              style={{
                color: 'rgba(34, 197, 94, 0.8)',
                fontSize: '13px',
                marginTop: '10px',
              }}
            >
              Redeemed on {new Date(ticket.used_at).toLocaleString()}
            </div>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            alignItems: 'flex-end',
          }}
        >
          <span
            style={{
              padding: '6px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 700,
              background: isUsed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 211, 238, 0.2)',
              color: isUsed ? '#22c55e' : '#22D3EE',
            }}
          >
            {isUsed ? 'USED' : 'ACTIVE'}
          </span>
          {!isUsed && (
            <span
              style={{
                padding: '6px 12px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 700,
                background:
                  redeemLocation === 'door'
                    ? 'rgba(59, 130, 246, 0.25)'
                    : 'rgba(168, 85, 247, 0.25)',
                color: redeemLocation === 'door' ? '#3b82f6' : '#a855f7',
              }}
            >
              Use at {redeemLocation === 'door' ? 'Door' : 'Bar'}
            </span>
          )}
        </div>
      </div>

      {!isUsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {redemptionState === 'warning' && (
            <div
              style={{
                background: 'rgba(251, 191, 36, 0.15)',
                border: '1px solid rgba(251, 191, 36, 0.4)',
                borderRadius: '12px',
                padding: '12px',
              }}
            >
              <div
                style={{
                  color: '#fbbf24',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                ⚠️ Staff only
              </div>
              <div
                style={{
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontSize: '13px',
                }}
              >
                Tap again only if you are bar or door staff.
              </div>
            </div>
          )}

          {redemptionState === 'confirm' && (
            <div
              style={{
                background: 'rgba(124, 58, 237, 0.15)',
                border: '1px solid rgba(124, 58, 237, 0.35)',
                borderRadius: '16px',
                padding: '16px',
              }}
            >
              <div
                style={{
                  color: '#c084fc',
                  fontWeight: 600,
                  fontSize: '15px',
                  marginBottom: '8px',
                }}
              >
                Long press to redeem this ticket
              </div>
              <div
                style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '13px',
                  marginBottom: '12px',
                }}
              >
                {eventTitle} · {ticketLabel} ({redeemLocation === 'door' ? 'Door' : 'Bar'})
              </div>
              <button
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={handlePressStart}
                onTouchEnd={handlePressEnd}
                onTouchCancel={handlePressEnd}
                disabled={redemptionState === 'redeeming'}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '15px',
                  cursor: 'pointer',
                  background:
                    redemptionState === 'redeeming'
                      ? 'rgba(124, 58, 237, 0.5)'
                      : 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
                  color: 'white',
                  transition: 'all 0.3s ease',
                  opacity: redemptionState === 'redeeming' ? 0.8 : 1,
                }}
              >
                {redemptionState === 'redeeming' ? 'Redeeming...' : 'Press and hold'}
              </button>
              <button
                onClick={onRedeemReset}
                style={{
                  width: '100%',
                  marginTop: '10px',
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'transparent',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {(redemptionState === 'idle' || redemptionState === 'warning') && (
            <button
              onClick={onRedeemTap}
              disabled={!onRedeemTap}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid rgba(124, 58, 237, 0.4)',
                background: 'rgba(124, 58, 237, 0.18)',
                color: 'white',
                fontWeight: 600,
                fontSize: '14px',
                cursor: onRedeemTap ? 'pointer' : 'not-allowed',
                opacity: onRedeemTap ? 1 : 0.5,
              }}
            >
              {redemptionState === 'warning' ? 'Tap again to confirm' : 'Redeem'}
            </button>
          )}
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        {!showQR ? (
          <button
            onClick={() => onToggleQR(ticket.id)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'rgba(255, 255, 255, 0.85)',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            Show QR Code
          </button>
        ) : (
          <div
            style={{
              background: 'rgba(2, 6, 23, 0.95)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                background: 'white',
                padding: '14px',
                borderRadius: '14px',
              }}
            >
              <QRCodeSVG value={qrValue} size={160} level="M" />
              {ticket.short_id && (
                <div
                  style={{
                    marginTop: '8px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#475569',
                    fontFamily: 'monospace',
                  }}
                >
                  ID: {ticket.short_id}
                </div>
              )}
            </div>
            <button
              onClick={() => onToggleQR(ticket.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '999px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'transparent',
                color: 'rgba(255, 255, 255, 0.75)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Hide QR Code
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

