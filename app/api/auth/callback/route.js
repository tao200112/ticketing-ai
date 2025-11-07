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
    const state = searchParams.get('state') // Get state parameter (may contain role info)
    
    // Determine role from state or referer
    // Default to 'user' if not specified
    let targetRole = 'user'
    
    // Check if state contains role information
    if (state) {
      try {
        const stateData = JSON.parse(decodeURIComponent(state))
        if (stateData.role && ['user', 'merchant', 'admin'].includes(stateData.role)) {
          targetRole = stateData.role
        }
      } catch (e) {
        // State might not be JSON, check if it's a simple role string
        if (['user', 'merchant', 'admin'].includes(state)) {
          targetRole = state
        }
      }
    }
    
    // Fallback: Check referer header to determine if from merchant login
    const referer = request.headers.get('referer') || ''
    if (referer.includes('/merchant/auth/login') && targetRole === 'user') {
      targetRole = 'merchant'
    }
    
    logger.info('OAuth callback received', { 
      hasCode: !!code, 
      hasError: !!error,
      targetRole,
      referer: referer.substring(0, 100) // Log first 100 chars
    })

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
    // For merchant role, check specifically for merchant users
    // For user role, check for any user with this email
    let existingUser = null
    let userQueryError = null
    
    if (targetRole === 'merchant') {
      // For merchant login, only check merchant role users
      const { data, error } = await adminSupabase
        .from('users')
        .select('*')
        .eq('email', userEmail)
        .eq('role', 'merchant')
        .single()
      existingUser = data
      userQueryError = error
    } else {
      // For user/admin login, check any user with this email
      const { data, error } = await adminSupabase
        .from('users')
        .select('*')
        .eq('email', userEmail)
        .single()
      existingUser = data
      userQueryError = error
    }

    let userRecord = null

    if (userQueryError && userQueryError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is expected for new users
      logger.error('Error querying user', { 
        error: userQueryError,
        errorCode: userQueryError.code,
        errorMessage: userQueryError.message,
        errorDetails: userQueryError.details,
        errorHint: userQueryError.hint,
        email: userEmail
      })
      
      // Provide specific error message
      let errorMessage = 'Database query error'
      
      if (userQueryError.code === '42P01') {
        errorMessage = 'Database table not found. Please contact support.'
      } else if (userQueryError.code === '42703') {
        const columnName = userQueryError.column || userQueryError.details?.match(/column "(\w+)"/)?.[1] || 'unknown column'
        errorMessage = `Database column not found: ${columnName}. Please contact support.`
      } else if (userQueryError.message) {
        errorMessage = userQueryError.message
        if (userQueryError.details && !errorMessage.includes(userQueryError.details)) {
          errorMessage += ` - ${userQueryError.details}`
        }
      } else if (userQueryError.details) {
        errorMessage = userQueryError.details
      }
      
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(errorMessage)}`, request.url)
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
          errorDetails: updateError.details,
          errorHint: updateError.hint,
          userId: existingUser.id
        })
        
        // Provide specific error message based on error type
        let errorMessage = 'Database error updating user' // Default fallback
        
        // Handle specific PostgreSQL error codes
        if (updateError.code === '23505') {
          errorMessage = 'User data conflict. Please contact support.'
        } else if (updateError.code === '23502') {
          const fieldName = updateError.column || updateError.details?.match(/column "(\w+)"/)?.[1] || 'unknown field'
          errorMessage = `Missing required field: ${fieldName}`
        } else if (updateError.code === '23514') {
          const constraintName = updateError.constraint || 'validation'
          errorMessage = `Data validation failed: ${constraintName}`
          if (updateError.details) {
            errorMessage += ` - ${updateError.details}`
          }
        } else if (updateError.code === '42P01') {
          errorMessage = 'Database table not found. Please contact support.'
        } else if (updateError.code === '42703') {
          const columnName = updateError.column || updateError.details?.match(/column "(\w+)"/)?.[1] || 'unknown column'
          errorMessage = `Database column not found: ${columnName}. Please contact support.`
        } else if (updateError.message) {
          errorMessage = updateError.message
          if (updateError.details && !errorMessage.includes(updateError.details)) {
            errorMessage += ` - ${updateError.details}`
          }
          if (updateError.hint && !errorMessage.includes(updateError.hint)) {
            errorMessage += ` (Hint: ${updateError.hint})`
          }
        } else if (updateError.details) {
          errorMessage = updateError.details
        } else if (updateError.hint) {
          errorMessage = `Database error: ${updateError.hint}`
        }
        
        // Truncate if too long for URL
        if (errorMessage.length > 200) {
          errorMessage = errorMessage.substring(0, 197) + '...'
        }
        
        return NextResponse.redirect(
          new URL(`/auth/login?error=${encodeURIComponent(errorMessage)}`, request.url)
        )
      }

      userRecord = updatedUser
    } else {
      // User doesn't exist - create new user
      logger.info('Creating new user for Google OAuth', { email: userEmail })
      
      // Use targetRole determined from state/referer
      // Note: password_hash can be null for OAuth users
      // For merchant role, user should have already registered with invite code
      // But we allow Google OAuth to create merchant users (they can complete registration later)
      const newUserData = {
        email: userEmail,
        name: userName || 'User', // Ensure name is not empty
        age: 18, // Default age, user can update later (must be >= 16)
        auth_provider: 'google',
        email_verified_at: supabaseUser.email_confirmed_at || new Date().toISOString(),
        role: targetRole, // Use the determined role (user, merchant, or admin)
        password_hash: null // Explicitly set to NULL for Google OAuth users (can be set later in settings)
      }
      
      // For merchant role, log a note that they may need to complete registration
      if (targetRole === 'merchant') {
        logger.info('Creating merchant user via Google OAuth', { 
          email: userEmail,
          note: 'User may need to complete merchant registration with invite code'
        })
      }

      logger.info('Attempting to create user with data:', {
        email: newUserData.email,
        name: newUserData.name,
        age: newUserData.age,
        auth_provider: newUserData.auth_provider,
        role: newUserData.role,
        hasEmailVerified: !!newUserData.email_verified_at
      })

      const { data: createdUser, error: createError } = await adminSupabase
        .from('users')
        .insert(newUserData)
        .select()
        .single()

      if (createError) {
        // Log full error details for debugging - including all possible error properties
        const errorInfo = {
          error: createError,
          errorType: typeof createError,
          errorCode: createError.code,
          errorMessage: createError.message,
          errorDetails: createError.details,
          errorHint: createError.hint,
          errorColumn: createError.column,
          errorConstraint: createError.constraint,
          errorTable: createError.table,
          errorSchema: createError.schema,
          userData: newUserData,
          // Try to stringify the entire error object
          fullError: JSON.stringify(createError, Object.getOwnPropertyNames(createError), 2),
          // Also log as plain object to see all properties
          errorKeys: Object.keys(createError),
          errorString: String(createError)
        }
        logger.error('Error creating user', errorInfo)
        
        // Provide specific error message based on error type
        // Priority: code-based messages > message > details > hint > default
        let errorMessage = 'Database error saving new user' // Default fallback (should rarely be used)
        
        // Extract error code (handle both string and number codes)
        const errorCode = createError.code || createError.error_code || null
        
        // Handle specific PostgreSQL error codes
        if (errorCode === '23505' || errorCode === 23505) {
          // Unique constraint violation
          errorMessage = 'User with this email already exists'
        } else if (errorCode === '23502' || errorCode === 23502) {
          // Not null constraint violation
          const fieldName = createError.column || 
                           createError.details?.match(/column "(\w+)"/)?.[1] || 
                           createError.message?.match(/column "(\w+)"/)?.[1] ||
                           'unknown field'
          errorMessage = `Missing required field: ${fieldName}`
        } else if (errorCode === '23514' || errorCode === 23514) {
          // Check constraint violation
          const constraintName = createError.constraint || 
                                createError.details?.match(/constraint "(\w+)"/)?.[1] ||
                                'validation'
          errorMessage = `Data validation failed: ${constraintName}`
          if (createError.details) {
            errorMessage += ` - ${createError.details}`
          }
        } else if (errorCode === '42P01' || errorCode === 42P01) {
          // Table does not exist
          errorMessage = 'Database table not found. Please contact support.'
        } else if (errorCode === '42703' || errorCode === 42703) {
          // Column does not exist
          const columnName = createError.column || 
                            createError.details?.match(/column "(\w+)"/)?.[1] || 
                            'unknown column'
          errorMessage = `Database column not found: ${columnName}. Please contact support.`
        } else if (errorCode === 'PGRST116' || createError.code === 'PGRST116') {
          // PostgREST: no rows returned (shouldn't happen on insert, but handle it)
          errorMessage = 'Failed to create user account. Please try again.'
        } else {
          // No matching error code - use message/details/hint
          // Priority: message > details > hint > string representation > default
          
          // Try to get message from various possible locations
          const possibleMessage = createError.message || 
                                 createError.error?.message || 
                                 createError.msg || 
                                 createError.errorMessage ||
                                 null
          
          // Try to get details from various possible locations
          const possibleDetails = createError.details || 
                                createError.error?.details || 
                                createError.detail ||
                                null
          
          // Try to get hint from various possible locations
          const possibleHint = createError.hint || 
                              createError.error?.hint ||
                              null
          
          if (possibleMessage && possibleMessage.trim()) {
            errorMessage = possibleMessage.trim()
            // Add details if available and not already in message
            if (possibleDetails && !errorMessage.includes(possibleDetails)) {
              errorMessage += ` - ${possibleDetails}`
            }
            // Add hint if available
            if (possibleHint && !errorMessage.includes(possibleHint)) {
              errorMessage += ` (Hint: ${possibleHint})`
            }
          } else if (possibleDetails && possibleDetails.trim()) {
            errorMessage = possibleDetails.trim()
          } else if (possibleHint && possibleHint.trim()) {
            errorMessage = `Database error: ${possibleHint.trim()}`
          } else {
            // Last resort: try to extract from error string or JSON
            try {
              const errorStr = String(createError)
              if (errorStr && errorStr !== '[object Object]' && errorStr.length > 0) {
                errorMessage = errorStr
              } else {
                // Try JSON stringify
                const errorJson = JSON.stringify(createError)
                if (errorJson && errorJson !== '{}' && errorJson.length < 200) {
                  errorMessage = `Database error: ${errorJson}`
                }
              }
            } catch (e) {
              // JSON stringify failed, use default
            }
            
            // If we still have default message, log a warning with full error info
            if (errorMessage === 'Database error saving new user') {
              logger.warn('Using default error message - error object structure may be unexpected', {
                errorType: typeof createError,
                errorKeys: Object.keys(createError),
                errorString: String(createError),
                errorJson: JSON.stringify(createError),
                fullErrorObject: createError
              })
              // Even with default message, try to add any available info
              if (Object.keys(createError).length > 0) {
                errorMessage = `Database error: ${Object.keys(createError).join(', ')}`
              }
            }
          }
        }
        
        // Truncate if too long for URL (keep it readable)
        if (errorMessage.length > 200) {
          errorMessage = errorMessage.substring(0, 197) + '...'
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

