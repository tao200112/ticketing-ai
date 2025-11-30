import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.1'
import type { Database } from '../../../types/db.ts'

const supabaseUrl =
  Deno.env.get('SUPABASE_URL') ?? Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

function jsonResponse(
  payload: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse(
      { success: false, error: 'METHOD_NOT_ALLOWED' },
      405,
    )
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse(
      { success: false, error: 'CONFIGURATION_ERROR' },
      500,
    )
  }

  const payload = await req.json().catch(() => ({}))
  const action = payload?.action as string

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  switch (action) {
    case 'list_events': {
      const { data, error } = await supabase
        .from('events')
        .select(
          `
          *,
          merchants (
            id,
            name,
            email
          ),
          prices (
            id,
            name,
            amount_cents,
            inventory
          )
        `,
        )
        .order('created_at', { ascending: false })

      if (error) {
        return jsonResponse(
          { success: false, error: error.message, details: error },
          500,
        )
      }

      return jsonResponse({ success: true, data: data ?? [] })
    }
    default:
      return jsonResponse(
        { success: false, error: 'UNKNOWN_ACTION', action },
        400,
      )
  }
})

