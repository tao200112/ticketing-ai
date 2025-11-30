'use client'

import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type ValidateTicketOptions = {
  qrPayload: string
  redeem?: boolean
  scanUuid?: string
  deviceId?: string
}

type ValidateTicketResponse = {
  success: boolean
  data?: Record<string, unknown>
  error?: string
  message?: string
}

export async function invokeValidateTicket({
  qrPayload,
  redeem = false,
  scanUuid,
  deviceId,
}: ValidateTicketOptions): Promise<ValidateTicketResponse> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.functions.invoke('validate-ticket', {
    body: {
      qr_payload: qrPayload,
      redeem,
      scan_uuid: scanUuid,
      device_id: deviceId,
    },
  })

  if (error) {
    throw new Error(error.message || 'Failed to reach validation service')
  }

  if (!data) {
    throw new Error('Invalid response from validation service')
  }

  return data as ValidateTicketResponse
}

