import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { getSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseClient } from '@/lib/supabase-api'
import { createLogger } from '@/lib/logger'

const logger = createLogger('login-from-supabase')
const SUPPORTED_ROLES = ['user', 'merchant', 'admin']

function createToken(payload) {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not configured')
  }
  return jwt.sign(payload, secret, { expiresIn: '24h' })
}

export async function POST(request) {
  try {
    const supabaseServer = await getSupabaseServer()
    if (!supabaseServer) {
      return NextResponse.json(
        { success: false, error: 'Supabase server client not available' },
        { status: 500 }
      )
    }

    const { data: session, error: userError } = await supabaseServer.auth.getUser()
    if (userError || !session?.user) {
      logger.warn('No Supabase auth user when bridging', { error: userError })
      return NextResponse.json(
        { success: false, error: 'UNAUTHENTICATED' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const requestedRole = body?.role
    const roleFromMetadata = session.user.user_metadata?.role
    const resolvedRole =
      (requestedRole && SUPPORTED_ROLES.includes(requestedRole)
        ? requestedRole
        : undefined) ||
      (roleFromMetadata && SUPPORTED_ROLES.includes(roleFromMetadata)
        ? roleFromMetadata
        : 'user')

    const adminSupabase = createSupabaseClient()

    const registrationDomain =
      body?.registrationDomain ||
      request.headers.get('host')?.split(':')[0] ||
      null

    const upsertPayload = {
      id: session.user.id,
      email: session.user.email,
      name:
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        session.user.user_metadata?.display_name ||
        session.user.email,
      role: resolvedRole,
      auth_provider: session.user.app_metadata?.provider || 'google',
      email_verified_at: session.user.email_confirmed_at || new Date().toISOString(),
      registration_domain: registrationDomain,
      updated_at: new Date().toISOString()
    }

    const { data: upsertedUser, error: upsertError } = await adminSupabase
      .from('users')
      .upsert(upsertPayload, { onConflict: 'email,role', ignoreDuplicates: false })
      .select()
      .single()

    if (upsertError) {
      logger.error('Failed to bridge Supabase user into public.users', {
        error: upsertError,
        email: session.user.email,
        role: resolvedRole
      })
      return NextResponse.json(
        { success: false, error: 'UPSERT_FAILED', details: upsertError.message },
        { status: 500 }
      )
    }

    const token = createToken({
      userId: upsertedUser.id,
      email: upsertedUser.email
    })

    const responseUser = {
      id: upsertedUser.id,
      email: upsertedUser.email,
      name: upsertedUser.name,
      role: upsertedUser.role,
      auth_provider: upsertedUser.auth_provider,
      email_verified_at: upsertedUser.email_verified_at
    }

    logger.info('Bridged Supabase session to local token', {
      email: responseUser.email,
      role: responseUser.role
    })

    return NextResponse.json({
      success: true,
      data: {
        user: responseUser,
        token
      }
    })
  } catch (error) {
    logger.error('Unexpected error during Supabase login bridge', {
      error: error.message
    })
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: error.message },
      { status: 500 }
    )
  }
}

