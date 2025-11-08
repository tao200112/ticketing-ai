import { NextResponse } from 'next/server'
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
    const now = new Date().toISOString()

    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('role', resolvedRole)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[login-from-supabase] fetch existing user error', fetchError)
      return NextResponse.json(
        {
          success: false,
          error: 'FETCH_FAILED',
          dbError: {
            message: fetchError.message,
            details: fetchError.details,
            hint: fetchError.hint,
            code: fetchError.code
          }
        },
        { status: 500 }
      )
    }

    let userRow

    if (existingUser) {
      const updatePayload = {
        name: name || existingUser.name || email,
        auth_provider: provider || existingUser.auth_provider || 'google',
        email_verified_at: now,
        updated_at: now,
        registration_domain: registrationDomain || hostDomain || existingUser.registration_domain
      }

      const { data, error: updateError } = await supabaseAdmin
        .from('users')
        .update(updatePayload)
        .eq('id', existingUser.id)
        .select()
        .single()

      if (updateError || !data) {
        console.error('[login-from-supabase] update error', updateError)
        return NextResponse.json(
          {
            success: false,
            error: 'UPDATE_FAILED',
            dbError: {
              message: updateError?.message,
              details: updateError?.details,
              hint: updateError?.hint,
              code: updateError?.code
            }
          },
          { status: 500 }
        )
      }

      if (existingUser.id !== userId) {
        console.warn('[login-from-supabase] Supabase auth id differs from existing user record', {
          existingId: existingUser.id,
          authUserId: userId,
          email,
          role: resolvedRole
        })
      }

      userRow = data
    } else {
      const insertPayload = {
        id: userId,
        email,
        name: name || email,
        role: resolvedRole,
        auth_provider: provider || 'google',
        email_verified_at: now,
        registration_domain: registrationDomain || hostDomain,
        updated_at: now
      }

      const { data, error: insertError } = await supabaseAdmin
        .from('users')
        .insert(insertPayload)
        .select()
        .single()

      if (insertError || !data) {
        console.error('[login-from-supabase] insert error', insertError)
        return NextResponse.json(
          {
            success: false,
            error: 'INSERT_FAILED',
            dbError: {
              message: insertError?.message,
              details: insertError?.details,
              hint: insertError?.hint,
              code: insertError?.code
            }
          },
          { status: 500 }
        )
      }

      userRow = data
    }

    const authToken = createToken({
      id: userRow.id,
      email: userRow.email,
      role: userRow.role
    })

    console.log('[login-from-supabase] success', {
      email: userRow.email,
      role: userRow.role
    })

    const sanitizedUser = { ...userRow }
    if ('password_hash' in sanitizedUser) {
      delete sanitizedUser.password_hash
    }

    return NextResponse.json({
      success: true,
      auth_token: authToken,
      userSession: sanitizedUser
    })
  } catch (error) {
    console.error('[login-from-supabase] exception', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

