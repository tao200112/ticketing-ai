import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'
import { createLogger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const logger = createLogger('login-from-supabase')
const SUPPORTED_ROLES = ['user', 'merchant', 'admin']

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function createToken(payload) {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not configured')
  }
  return jwt.sign(payload, secret, { expiresIn: '7d' })
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      email,
      provider,
      userId,
      role: requestedRole,
      name,
      registrationDomain
    } = body || {}

    console.log('[login-from-supabase] input', { email, provider, userId, requestedRole })

    if (!email) {
      console.error('[login-from-supabase] missing email')
      return NextResponse.json(
        { success: false, error: 'MISSING_EMAIL' },
        { status: 400 }
      )
    }

    if (!userId) {
      console.error('[login-from-supabase] missing userId')
      return NextResponse.json(
        { success: false, error: 'MISSING_USER_ID' },
        { status: 400 }
      )
    }

    const resolvedRole = SUPPORTED_ROLES.includes(requestedRole)
      ? requestedRole
      : 'user'

    const hostDomain = request.headers.get('host')?.split(':')[0] || null

    const payload = {
      id: userId,
      email,
      role: resolvedRole,
      auth_provider: provider || 'google',
      email_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      registration_domain: registrationDomain || hostDomain
    }

    if (name) {
      payload.name = name
    }

    const { data: upsertedUser, error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert(payload, { onConflict: 'email,role', ignoreDuplicates: false })
      .select()
      .single()

    if (upsertError || !upsertedUser) {
      console.error('[login-from-supabase] upsert error', upsertError)
      if (upsertError) {
        console.error('[login-from-supabase] upsert error detail', {
          message: upsertError.message,
          details: upsertError.details,
          hint: upsertError.hint,
          code: upsertError.code
        })
      }
      return NextResponse.json(
        { success: false, error: 'UPSERT_FAILED' },
        { status: 500 }
      )
    }

    const authToken = createToken({
      id: upsertedUser.id,
      email: upsertedUser.email,
      role: upsertedUser.role
    })

    console.log('[login-from-supabase] success', {
      email: upsertedUser.email,
      role: upsertedUser.role
    })

    return NextResponse.json({
      success: true,
      auth_token: authToken,
      userSession: upsertedUser
    })
  } catch (error) {
    console.error('[login-from-supabase] exception', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

