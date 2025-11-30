import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { generateTicketQRPayload } from '@/lib/qr-crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireSupabaseUser } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type GenerateTicketRequest = {
  ticket_id?: string
  expires_at?: string
}

function jsonResponse(
  payload: Record<string, unknown>,
  status = 200,
): NextResponse {
  return NextResponse.json(payload, { status })
}

export async function POST(request: Request) {
  try {
    const user = await requireSupabaseUser()

    if (!supabaseAdmin) {
      return jsonResponse(
        {
          success: false,
          error: 'CONFIGURATION_ERROR',
          message: 'Supabase admin client not configured',
        },
        500,
      )
    }

    const body = (await request.json()) as GenerateTicketRequest
    const ticketId = body.ticket_id?.trim()

    if (!ticketId) {
      return jsonResponse(
        {
          success: false,
          error: 'MISSING_TICKET_ID',
          message: 'ticket_id is required',
        },
        400,
      )
    }

    const {
      data: ticket,
      error: ticketError,
    } = await supabaseAdmin
      .from('tickets')
      .select(
        'id, short_id, supabase_uid, qr_payload, event_id, validity_end_time',
      )
      .eq('id', ticketId)
      .maybeSingle()

    if (ticketError) {
      console.error('[tickets/generate] Failed to load ticket', ticketError)
      return jsonResponse(
        {
          success: false,
          error: 'DATABASE_ERROR',
          message: 'Unable to load ticket record',
        },
        500,
      )
    }

    if (!ticket || ticket.supabase_uid !== user.id) {
      return jsonResponse(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Ticket not found or access denied',
        },
        404,
      )
    }

    const expiresAt =
      body.expires_at ||
      ticket.validity_end_time ||
      new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

    const expirationSeconds = Math.floor(new Date(expiresAt).getTime() / 1000)
    const qrPayload =
      ticket.qr_payload ||
      generateTicketQRPayload(ticket.short_id || ticket.id, expirationSeconds)

    const dataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 1,
      width: 512,
    })

    const [, base64] = dataUrl.split(',')
    const buffer = Buffer.from(base64, 'base64')
    const objectPath = `tickets/${ticket.id}.png`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('tickets')
      .upload(objectPath, buffer, {
        upsert: true,
        contentType: 'image/png',
      })

    if (uploadError) {
      console.error('[tickets/generate] Upload failed', uploadError)
      return jsonResponse(
        {
          success: false,
          error: 'UPLOAD_FAILED',
          message: 'Unable to upload QR code image',
        },
        500,
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from('tickets')
      .update({
        qr_payload: qrPayload,
        qr_image_path: objectPath,
      })
      .eq('id', ticket.id)

    if (updateError) {
      console.error('[tickets/generate] Failed to update ticket', updateError)
      return jsonResponse(
        {
          success: false,
          error: 'DATABASE_ERROR',
          message: 'Unable to update ticket metadata',
        },
        500,
      )
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('tickets')
      .getPublicUrl(objectPath)

    return jsonResponse({
      success: true,
      data: {
        ticket_id: ticket.id,
        ticket_url: publicUrlData.publicUrl,
        qr_payload: qrPayload,
        expires_at: expiresAt,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[tickets/generate] Handler failed', error)
    return jsonResponse(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message,
      },
      500,
    )
  }
}

