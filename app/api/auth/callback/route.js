import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseClient } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import {
  GOOGLE_OAUTH_PASSWORD_PLACEHOLDER_HASH,
  requiresPasswordSetup
} from '@/lib/auth/password-placeholder'

const logger = createLogger('oauth-callback')

function isPasswordHashConstraintError(error) {
  if (!error) return false
  const rawCode =
    error.code ||
    error.error_code ||
    error?.originalError?.code ||
    error?.originalError?.error_code
  if (rawCode && String(rawCode) === '23502') {
    const columnName =
      error.column ||
      error.details?.match(/column "(\w+)"/)?.[1] ||
      error.message?.match(/column "(\w+)"/)?.[1] ||
      null
    return !columnName || columnName === 'password_hash'
  }
  const combinedMessage = [
    error.message,
    error.details,
    error.hint,
    error.errorMessage,
    error?.originalError?.message,
    error?.originalError?.details
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return (
    combinedMessage.includes('password_hash') &&
    (combinedMessage.includes('null') ||
      combinedMessage.includes('not null') ||
      combinedMessage.includes('required'))
  )
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    const state = searchParams.get('state') // Supabase state (used for CSRF)
    const targetRoleFromQuery = searchParams.get('target_role')
    
    // Determine role from state or referer
    // Default to 'user' if not specified
    let targetRole = 'user'
    if (targetRoleFromQuery && ['user', 'merchant', 'admin'].includes(targetRoleFromQuery)) {
      targetRole = targetRoleFromQuery
    }
    
    // Check if state contains role information
    if (state && !targetRoleFromQuery) {
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
    // IMPORTANT: First check by Supabase auth user ID (most reliable)
    // Then check by email as fallback
    // This prevents duplicate user creation when email is UNIQUE
    let existingUser = null
    let userQueryError = null
    
    // First, try to find user by Supabase auth ID (most reliable match)
    const { data: userById, error: userByIdError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('id', supabaseUser.id)
      .single()
    
    if (userById && !userByIdError) {
      // User exists with matching ID
      existingUser = userById
      logger.info('Found existing user by ID', { 
        userId: supabaseUser.id,
        email: userEmail,
        existingRole: existingUser.role
      })
    } else {
      // If not found by ID, try to find by email (fallback)
      // This handles cases where user exists in auth.users but not in public.users
      const { data: allUsers, error: allUsersError } = await adminSupabase
        .from('users')
        .select('*')
        .eq('email', userEmail)
      
      if (allUsersError && allUsersError.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is expected for new users
        userQueryError = allUsersError
      } else if (allUsers && allUsers.length > 0) {
        // User exists - use the first one (email should be unique, so there should only be one)
        existingUser = allUsers[0]
        
        // Log if ID mismatch (user exists with same email but different ID)
        if (existingUser.id !== supabaseUser.id) {
          logger.warn('User exists with same email but different ID', {
            email: userEmail,
            existingUserId: existingUser.id,
            supabaseUserId: supabaseUser.id,
            note: 'This may indicate a data inconsistency'
          })
        }
        
        // Log if role mismatch
        if (existingUser.role !== targetRole) {
          logger.info('User exists with different role', {
            email: userEmail,
            existingRole: existingUser.role,
            requestedRole: targetRole,
            note: 'Will update auth_provider but keep existing role'
          })
        }
      }
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
      // NOTE: We keep the existing role - don't change role via OAuth
      // Role changes should be done through proper admin/merchant registration channels
      logger.info('Updating existing user for Google OAuth', { 
        userId: existingUser.id,
        existingRole: existingUser.role,
        requestedRole: targetRole
      })
      
      const updateData = {
        auth_provider: 'google',
        email_verified_at: supabaseUser.email_confirmed_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Only update name if it's not set or if Google provides a better name
      if (!existingUser.name || existingUser.name === existingUser.email?.split('@')[0]) {
        updateData.name = userName
      }
      
      // DO NOT update role - keep existing role
      // If user wants to change role, they should use proper registration flow

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
        // Extract error code (handle both string and number codes)
        const updateErrorCode = updateError.code || updateError.error_code || null
        
        if (updateErrorCode === '23505' || updateErrorCode === 23505 || String(updateErrorCode) === '23505') {
          errorMessage = 'User data conflict. Please contact support.'
        } else if (updateErrorCode === '23502' || updateErrorCode === 23502 || String(updateErrorCode) === '23502') {
          const fieldName = updateError.column || updateError.details?.match(/column "(\w+)"/)?.[1] || 'unknown field'
          errorMessage = `Missing required field: ${fieldName}`
        } else if (updateErrorCode === '23514' || updateErrorCode === 23514 || String(updateErrorCode) === '23514') {
          const constraintName = updateError.constraint || 'validation'
          errorMessage = `Data validation failed: ${constraintName}`
          if (updateError.details) {
            errorMessage += ` - ${updateError.details}`
          }
        } else if (updateErrorCode === '42P01' || String(updateErrorCode) === '42P01') {
          errorMessage = 'Database table not found. Please contact support.'
        } else if (updateErrorCode === '42703' || String(updateErrorCode) === '42703') {
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
      
      // Get registration domain for tracking (same as email registration)
      const hostname = request.headers.get('host') || ''
      const registrationDomain = hostname.split(':')[0]
      
      // Use targetRole determined from state/referer
      // Note: password_hash can be null for OAuth users
      // For merchant role, user should have already registered with invite code
      // But we allow Google OAuth to create merchant users (they can complete registration later)
      // IMPORTANT: Use Supabase auth user ID as the primary key
      // This ensures consistency between auth.users and public.users
      const newUserData = {
        id: supabaseUser.id, // Use Supabase auth user ID as primary key
        email: userEmail,
        name: userName || 'User', // Ensure name is not empty
        age: 18, // Default age, user can update later (must be >= 16)
        auth_provider: 'google',
        email_verified_at: supabaseUser.email_confirmed_at || new Date().toISOString(),
        role: targetRole, // Use the determined role (user, merchant, or admin)
        password_hash: null, // Explicitly set to NULL for Google OAuth users (can be set later in settings)
        registration_domain: registrationDomain // Track registration domain (same as email registration)
      }
      
      // For merchant role, log a note that they may need to complete registration
      if (targetRole === 'merchant') {
        logger.info('Creating merchant user via Google OAuth', { 
          email: userEmail,
          note: 'User may need to complete merchant registration with invite code'
        })
      }

      logger.info('Attempting to create user with data:', {
        id: newUserData.id,
        email: newUserData.email,
        name: newUserData.name,
        age: newUserData.age,
        auth_provider: newUserData.auth_provider,
        role: newUserData.role,
        hasEmailVerified: !!newUserData.email_verified_at,
        note: 'Using Supabase auth user ID as primary key'
      })

      let usedPasswordPlaceholder = false
      let fallbackOriginalError = null

      const { data: createdUser, error: createError } = await adminSupabase
        .from('users')
        .insert(newUserData)
        .select()
        .single()

      let finalCreateError = createError
      let finalCreatedUser = createdUser

      if (finalCreateError && isPasswordHashConstraintError(finalCreateError)) {
        fallbackOriginalError = finalCreateError
        logger.warn(
          'Password hash NOT NULL constraint detected when creating OAuth user, retrying with placeholder hash',
          {
            errorCode: finalCreateError.code,
            errorMessage: finalCreateError.message,
            errorDetails: finalCreateError.details,
            userId: newUserData.id,
            email: newUserData.email
          }
        )

        const fallbackData = {
          ...newUserData,
          password_hash: GOOGLE_OAUTH_PASSWORD_PLACEHOLDER_HASH
        }

        const {
          data: fallbackUser,
          error: fallbackError
        } = await adminSupabase
          .from('users')
          .insert(fallbackData)
          .select()
          .single()

        if (fallbackError) {
          logger.error('Fallback user creation with placeholder hash failed', {
            error: fallbackError,
            originalError: finalCreateError,
            fallbackErrorCode: fallbackError.code,
            fallbackErrorMessage: fallbackError.message,
            fallbackErrorDetails: fallbackError.details,
            userId: newUserData.id,
            email: newUserData.email
          })
          finalCreateError = fallbackError
        } else {
          usedPasswordPlaceholder = true
          finalCreateError = null
          finalCreatedUser = fallbackUser
          logger.info('Created OAuth user with password placeholder hash', {
            userId: fallbackUser.id,
            email: fallbackUser.email
          })
        }
      }

      if (finalCreateError) {
        // Log full error details for debugging - including all possible error properties
        // Try to extract error from nested structures (Supabase sometimes wraps errors)
        const actualError =
          finalCreateError.error || finalCreateError.originalError || finalCreateError
        const errorInfo = {
          error: finalCreateError,
          actualError: actualError,
          errorType: typeof finalCreateError,
          errorCode:
            finalCreateError.code ||
            actualError?.code ||
            finalCreateError.error_code ||
            actualError?.error_code,
          errorMessage:
            finalCreateError.message ||
            actualError?.message ||
            finalCreateError.msg ||
            actualError?.msg,
          errorDetails:
            finalCreateError.details ||
            actualError?.details ||
            finalCreateError.detail ||
            actualError?.detail,
          errorHint: finalCreateError.hint || actualError?.hint,
          errorColumn: finalCreateError.column || actualError?.column,
          errorConstraint: finalCreateError.constraint || actualError?.constraint,
          errorTable: finalCreateError.table || actualError?.table,
          errorSchema: finalCreateError.schema || actualError?.schema,
          userData: newUserData,
          // Try to stringify the entire error object
          fullError: JSON.stringify(
            finalCreateError,
            Object.getOwnPropertyNames(finalCreateError),
            2
          ),
          fullActualError: actualError ? JSON.stringify(actualError, Object.getOwnPropertyNames(actualError), 2) : null,
          // Also log as plain object to see all properties
          errorKeys: Object.keys(finalCreateError),
          actualErrorKeys: actualError ? Object.keys(actualError) : [],
          errorString: String(finalCreateError),
          actualErrorString: actualError ? String(actualError) : null
        }

        if (fallbackOriginalError) {
          errorInfo.originalPasswordHashError = fallbackOriginalError
        }
        logger.error('Error creating user - Full error details:', errorInfo)
        
        // Provide specific error message based on error type
        // Priority: code-based messages > message > details > hint > default
        let errorMessage = 'Database error saving new user' // Default fallback (should rarely be used)
        
        // Extract error code (handle both string and number codes)
        // Check multiple possible locations for error code
        const errorCode = finalCreateError.code || 
                         finalCreateError.error_code || 
                         actualError?.code || 
                         actualError?.error_code ||
                         null
        
        // Handle specific PostgreSQL error codes
        // Note: PostgreSQL error codes are strings (e.g., '23505', '42P01')
        // Some may also come as numbers (e.g., 23505), so we check both
        if (errorCode === '23505' || errorCode === 23505 || String(errorCode) === '23505') {
          // Unique constraint violation
          errorMessage = 'User with this email already exists'
        } else if (errorCode === '23502' || errorCode === 23502 || String(errorCode) === '23502') {
          // Not null constraint violation
          const fieldName = finalCreateError.column || 
                           finalCreateError.details?.match(/column "(\w+)"/)?.[1] || 
                           finalCreateError.message?.match(/column "(\w+)"/)?.[1] ||
                           'unknown field'
          errorMessage = `Missing required field: ${fieldName}`
          if (fieldName === 'password_hash') {
            errorMessage = 'Password setup is required for this account. Please contact support.'
          }
        } else if (errorCode === '23514' || errorCode === 23514 || String(errorCode) === '23514') {
          // Check constraint violation
          const constraintName = finalCreateError.constraint || 
                                finalCreateError.details?.match(/constraint "(\w+)"/)?.[1] ||
                                'validation'
          errorMessage = `Data validation failed: ${constraintName}`
          if (finalCreateError.details) {
            errorMessage += ` - ${finalCreateError.details}`
          }
        } else if (errorCode === '42P01' || String(errorCode) === '42P01') {
          // Table does not exist (PostgreSQL codes with letters are always strings)
          errorMessage = 'Database table not found. Please contact support.'
        } else if (errorCode === '42703' || String(errorCode) === '42703') {
          // Column does not exist (PostgreSQL codes with letters are always strings)
          const columnName = finalCreateError.column || 
                            finalCreateError.details?.match(/column "(\w+)"/)?.[1] || 
                            'unknown column'
          errorMessage = `Database column not found: ${columnName}. Please contact support.`
        } else if (errorCode === 'PGRST116' || createError.code === 'PGRST116' || String(errorCode) === 'PGRST116') {
          // PostgREST: no rows returned (shouldn't happen on insert, but handle it)
          errorMessage = 'Failed to create user account. Please try again.'
        } else {
          // No matching error code - use message/details/hint
          // Priority: message > details > hint > string representation > default
          
          // Try to get message from various possible locations
          const possibleMessage = finalCreateError.message || 
                                 finalCreateError.error?.message || 
                                 actualError?.message ||
                                 finalCreateError.msg || 
                                 actualError?.msg ||
                                 finalCreateError.errorMessage ||
                                 actualError?.errorMessage ||
                                 null
          
          // Try to get details from various possible locations
          const possibleDetails = finalCreateError.details || 
                                 finalCreateError.error?.details || 
                                 actualError?.details ||
                                 finalCreateError.detail ||
                                 actualError?.detail ||
                                 null
          
          // Try to get hint from various possible locations
          const possibleHint = finalCreateError.hint || 
                              finalCreateError.error?.hint ||
                              actualError?.hint ||
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
              const errorStr = String(finalCreateError)
              if (errorStr && errorStr !== '[object Object]' && errorStr.length > 0) {
                errorMessage = errorStr
              } else {
                // Try JSON stringify
                const errorJson = JSON.stringify(finalCreateError)
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
                errorType: typeof finalCreateError,
                errorKeys: Object.keys(finalCreateError),
                errorString: String(finalCreateError),
                errorJson: JSON.stringify(finalCreateError),
                fullErrorObject: finalCreateError
              })
              // Even with default message, try to add any available info
              if (Object.keys(finalCreateError).length > 0) {
                errorMessage = `Database error: ${Object.keys(finalCreateError).join(', ')}`
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

      userRecord = finalCreatedUser
      if (usedPasswordPlaceholder) {
        userRecord.password_hash = GOOGLE_OAUTH_PASSWORD_PLACEHOLDER_HASH
      }
    }

    // Remove sensitive data
    const passwordNeedsSetup = requiresPasswordSetup(userRecord)
    const hasPassword = !!userRecord.password_hash && !passwordNeedsSetup
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
      updated_at: userRecord.updated_at,
      has_password: hasPassword,
      requires_password_setup: passwordNeedsSetup
    }

    // Redirect to account page with session data in URL hash (will be handled client-side)
    // We'll use a temporary token approach instead
    const redirectUrl = new URL('/auth/oauth-success', request.url)
    redirectUrl.searchParams.set('session', JSON.stringify(sessionData))

    return NextResponse.redirect(redirectUrl)

  } catch (error) {
    // Log comprehensive error information
    const errorInfo = {
      error,
      errorType: typeof error,
      errorMessage: error?.message,
      errorDetails: error?.details,
      errorHint: error?.hint,
      errorCode: error?.code,
      errorStack: error?.stack,
      errorKeys: error ? Object.keys(error) : [],
      errorString: String(error),
      errorJson: error ? JSON.stringify(error, Object.getOwnPropertyNames(error), 2) : null
    }
    logger.error('OAuth callback error', errorInfo)
    
    // Extract meaningful error message with multiple fallbacks
    let errorMessage = 'OAuth authentication failed' // Default fallback
    
    // Try various possible error message locations
    const possibleMessage = error?.message || 
                           error?.error?.message || 
                           error?.msg || 
                           error?.errorMessage ||
                           error?.details ||
                           error?.error?.details ||
                           null
    
    if (possibleMessage && possibleMessage.trim()) {
      errorMessage = possibleMessage.trim()
    } else if (error?.hint) {
      errorMessage = `OAuth error: ${error.hint}`
    } else if (error?.code) {
      errorMessage = `OAuth error (code: ${error.code})`
    } else {
      // Last resort: try to extract from error string
      const errorStr = String(error)
      if (errorStr && errorStr !== '[object Object]' && errorStr.length > 0) {
        errorMessage = errorStr
      }
    }
    
    // Truncate if too long for URL
    if (errorMessage.length > 200) {
      errorMessage = errorMessage.substring(0, 197) + '...'
    }
    
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(errorMessage)}`, request.url)
    )
  }
}

