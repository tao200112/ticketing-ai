import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseClient } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'

const logger = createLogger('oauth-callback')

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Handle OAuth errors
    if (error) {
      logger.warn('OAuth error received', { error, errorDescription })
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      )
    }

    if (!code) {
      logger.warn('No code parameter in OAuth callback')
      return NextResponse.redirect(
        new URL('/auth/login?error=missing_code', request.url)
      )
    }

    // Exchange code for session using Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      logger.error('Supabase not configured')
      return NextResponse.redirect(
        new URL('/auth/login?error=configuration_error', request.url)
      )
    }

    // Create Supabase client for auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // Exchange code for session
    const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code)

    if (authError || !authData?.user) {
      logger.error('Failed to exchange code for session', { error: authError })
      return NextResponse.redirect(
        new URL('/auth/login?error=authentication_failed', request.url)
      )
    }

    const supabaseUser = authData.user
    const supabaseSession = authData.session

    logger.info('Google OAuth successful', { 
      userId: supabaseUser.id, 
      email: supabaseUser.email 
    })

    // Sync user to our users table
    const adminSupabase = createSupabaseClient()
    
    // Get user metadata from Google
    const userEmail = supabaseUser.email
    const userName = supabaseUser.user_metadata?.full_name || 
                     supabaseUser.user_metadata?.name || 
                     supabaseUser.user_metadata?.display_name ||
                     userEmail?.split('@')[0] || 
                     'User'
    const userAvatar = supabaseUser.user_metadata?.avatar_url || null

    // Check if user already exists in our users table
    const { data: existingUser, error: userQueryError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single()

    let userRecord = null

    if (userQueryError && userQueryError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is expected for new users
      logger.error('Error querying user', { 
        error: userQueryError,
        errorCode: userQueryError.code,
        errorMessage: userQueryError.message,
        email: userEmail
      })
      
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(userQueryError.message || 'Database query error')}`, request.url)
      )
    }

    if (existingUser) {
      // User exists - update auth_provider and email_verified_at
      logger.info('Updating existing user for Google OAuth', { userId: existingUser.id })
      
      const updateData = {
        auth_provider: 'google',
        email_verified_at: supabaseUser.email_confirmed_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Only update name if it's not set or if Google provides a better name
      if (!existingUser.name || existingUser.name === existingUser.email?.split('@')[0]) {
        updateData.name = userName
      }

      const { data: updatedUser, error: updateError } = await adminSupabase
        .from('users')
        .update(updateData)
        .eq('id', existingUser.id)
        .select()
        .single()

      if (updateError) {
        logger.error('Error updating user', { 
          error: updateError,
          errorCode: updateError.code,
          errorMessage: updateError.message,
          userId: existingUser.id
        })
        
        // Provide more specific error message
        let errorMessage = 'Database error updating user'
        if (updateError.message) {
          errorMessage = updateError.message
        }
        
        return NextResponse.redirect(
          new URL(`/auth/login?error=${encodeURIComponent(errorMessage)}`, request.url)
        )
      }

      userRecord = updatedUser
    } else {
      // User doesn't exist - create new user
      logger.info('Creating new user for Google OAuth', { email: userEmail })
      
      // Default role is 'user', age is required but we'll set a default
      const newUserData = {
        email: userEmail,
        name: userName,
        age: 18, // Default age, user can update later
        auth_provider: 'google',
        email_verified_at: supabaseUser.email_confirmed_at || new Date().toISOString(),
        role: 'user',
        password_hash: null // Google users don't have passwords
      }

      const { data: createdUser, error: createError } = await adminSupabase
        .from('users')
        .insert(newUserData)
        .select()
        .single()

      if (createError) {
        logger.error('Error creating user', { 
          error: createError, 
          errorCode: createError.code,
          errorMessage: createError.message,
          userData: newUserData 
        })
        
        // Provide more specific error message
        let errorMessage = 'Database error saving new user'
        if (createError.code === '23505') {
          errorMessage = 'User with this email already exists'
        } else if (createError.code === '23502') {
          errorMessage = 'Missing required field: ' + createError.message
        } else if (createError.message) {
          errorMessage = createError.message
        }
        
        return NextResponse.redirect(
          new URL(`/auth/login?error=${encodeURIComponent(errorMessage)}`, request.url)
        )
      }

      userRecord = createdUser
    }

    // Remove sensitive data
    delete userRecord.password_hash

    // Create session data compatible with our existing system
    const sessionData = {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      age: userRecord.age,
      role: userRecord.role,
      auth_provider: userRecord.auth_provider,
      email_verified_at: userRecord.email_verified_at,
      created_at: userRecord.created_at,
      updated_at: userRecord.updated_at
    }

    // Redirect to account page with session data in URL hash (will be handled client-side)
    // We'll use a temporary token approach instead
    const redirectUrl = new URL('/auth/oauth-success', request.url)
    redirectUrl.searchParams.set('session', encodeURIComponent(JSON.stringify(sessionData)))

    return NextResponse.redirect(redirectUrl)

  } catch (error) {
    logger.error('OAuth callback error', { 
      error,
      errorMessage: error.message,
      errorStack: error.stack
    })
    
    // Extract meaningful error message
    let errorMessage = 'OAuth authentication failed'
    if (error.message) {
      errorMessage = error.message
    } else if (error.details) {
      errorMessage = error.details
    }
    
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(errorMessage)}`, request.url)
    )
  }
}

