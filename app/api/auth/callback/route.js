// Google OAuth integration – Supabase Auth (2025-11-08) – dedupe existing users and avoid RLS issues
// Data flow:
// 1. auth.users receives the OAuth account; database trigger (handle_new_auth_user_to_users) upserts into public.users by (email, role).
// 2. This route enriches the business row (name, role overrides, domains, placeholders) via the same onConflict strategy.
// 3. public.users must only ever be touched through upsert/email+role aware logic to honour users_email_role_unique.
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

function isDuplicateKeyError(error) {
  if (!error) return false
  const code = error.code || error.error_code || error?.originalError?.code
  if (code && String(code) === '23505') return true
  const message = (error.message || error.details || '').toLowerCase()
  return message.includes('duplicate key') || message.includes('unique constraint')
}

function isTransactionAbortedError(error) {
  if (!error) return false
  const code = error.code || error.error_code || error?.originalError?.code
  if (code && String(code) === '25P02') return true
  const message = (error.message || error.details || '').toLowerCase()
  return message.includes('current transaction is aborted')
}

function isRlsError(error) {
  if (!error) return false
  const message = [
    error.message,
    error.details,
    error.hint,
    error?.originalError?.message,
    error?.originalError?.details
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return message.includes('row-level security') || message.includes('rls')
}

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
    const rawAgeMetadata = supabaseUser.user_metadata?.age
    let defaultAge = null
    if (typeof rawAgeMetadata === 'number' && Number.isFinite(rawAgeMetadata)) {
      defaultAge = Math.max(16, Math.floor(rawAgeMetadata))
    } else if (typeof rawAgeMetadata === 'string') {
      const parsedAge = parseInt(rawAgeMetadata, 10)
      if (!Number.isNaN(parsedAge) && Number.isFinite(parsedAge)) {
        defaultAge = Math.max(16, parsedAge)
      }
    }

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
        const desiredRole =
          targetRole && ['user', 'merchant', 'admin'].includes(targetRole)
            ? targetRole
            : 'user'
        const sameRoleUser =
          allUsers.find((candidate) => candidate.role === desiredRole) || null
        const matchingSupabaseId = allUsers.find(
          (candidate) => candidate.id === supabaseUser.id
        )
        existingUser =
          matchingSupabaseId ||
          sameRoleUser ||
          allUsers.find((candidate) => candidate.role === 'user') ||
          allUsers[0]
        
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

    let userTarget = existingUser

    if (!userTarget) {
      const { data: preInsertUsers, error: preInsertError } = await adminSupabase
        .from('users')
        .select('*')
        .eq('email', userEmail)
        .limit(1)

      if (preInsertError && preInsertError.code !== 'PGRST116') {
        logger.error('Pre-insert email dedupe query failed', {
          error: preInsertError,
          errorCode: preInsertError.code,
          errorMessage: preInsertError.message,
          errorDetails: preInsertError.details,
          email: userEmail
        })
      } else if (preInsertUsers && preInsertUsers.length > 0) {
        userTarget = preInsertUsers[0]
        logger.info('Existing user found during pre-insert dedupe', {
          userId: userTarget.id,
          email: userTarget.email,
          existingRole: userTarget.role
        })
      }
    }

    let userRecord = null
    const userTargetBeforeUpsert = userTarget

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

    if (userTarget) {
      // User exists - update auth_provider and email_verified_at
      // NOTE: We keep the existing role - don't change role via OAuth
      // Role changes should be done through proper admin/merchant registration channels
      logger.info('Updating existing user for Google OAuth', { 
        userId: userTarget.id,
        existingRole: userTarget.role,
        requestedRole: targetRole
      })
      
      const updateData = {
        auth_provider: 'google',
        email_verified_at: supabaseUser.email_confirmed_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Only update name if it's not set or if Google provides a better name
      if (!userTarget.name || userTarget.name === userTarget.email?.split('@')[0]) {
        updateData.name = userName
      }
      if (
        defaultAge !== null &&
        (typeof userTarget.age !== 'number' || !Number.isFinite(userTarget.age))
      ) {
        updateData.age = defaultAge
      }
      
      // DO NOT update role - keep existing role
      // If user wants to change role, they should use proper registration flow

      const { data: updatedUser, error: updateError } = await adminSupabase
        .from('users')
        .update(updateData)
        .eq('id', userTarget.id)
        .select()
        .single()

      if (updateError) {
        logger.error('Error updating user', { 
          error: updateError,
          errorCode: updateError.code,
          errorMessage: updateError.message,
          errorDetails: updateError.details,
          errorHint: updateError.hint,
          userId: userTarget.id
        })
        if (isRlsError(updateError)) {
          logger.warn(
            `RLS policy blocked insert/update: user id=${userTarget.id ?? 'unknown'}, email=${userTarget.email}, role=${userTarget.role}`,
            {
              userId: userTarget.id,
              email: userTarget.email,
              role: userTarget.role
            }
          )
        }
        
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
      userTarget = updatedUser
      logger.info('Google OAuth: existing user updated', {
        id: updatedUser.id,
        email: userEmail,
        role: updatedUser.role
      })
    } else {
      // User doesn't exist - upsert using email + role
      logger.info('Creating or updating Google OAuth user via upsert', { email: userEmail })
      const hostname = request.headers.get('host') || ''
      const registrationDomain = hostname.split(':')[0]
      const resolvedRole = targetRole || 'user'
      const emailVerifiedAt = supabaseUser.email_confirmed_at || new Date().toISOString()

      const baseUserData = {
        email: userEmail,
        name: userName || 'User',
        auth_provider: 'google',
        email_verified_at: emailVerifiedAt,
        role: resolvedRole,
        password_hash: null,
        registration_domain: registrationDomain,
        updated_at: new Date().toISOString()
      }

      if (defaultAge !== null) {
        baseUserData.age = defaultAge
      }

      const upsertPayload = {
        ...baseUserData,
        id: userTargetBeforeUpsert?.id || supabaseUser.id
      }

      let upsertError = null
      let upsertedUser = null
      let usedPasswordPlaceholder = false
      let fallbackOriginalError = null

      const { data: primaryUpsertUser, error: primaryUpsertError } = await adminSupabase
        .from('users')
        .upsert(upsertPayload, {
          onConflict: 'email,role',
          ignoreDuplicates: false
        })
        .select()
        .single()

      upsertError = primaryUpsertError
      upsertedUser = primaryUpsertUser

      if (upsertError && isPasswordHashConstraintError(upsertError)) {
        fallbackOriginalError = upsertError
        logger.warn(
          'Password hash NOT NULL constraint detected during upsert, retrying with placeholder hash',
          {
            errorCode: upsertError.code,
            errorMessage: upsertError.message,
            errorDetails: upsertError.details,
            email: userEmail,
            role: resolvedRole
          }
        )

        const fallbackUpsertPayload = {
          ...upsertPayload,
          password_hash: GOOGLE_OAUTH_PASSWORD_PLACEHOLDER_HASH
        }

        const { data: fallbackUser, error: fallbackUpsertError } = await adminSupabase
          .from('users')
          .upsert(fallbackUpsertPayload, {
            onConflict: 'email,role',
            ignoreDuplicates: false
          })
          .select()
          .single()

        if (fallbackUpsertError) {
          logger.error('Upsert with password placeholder hash failed', {
            error: fallbackUpsertError,
            originalError: fallbackOriginalError,
            email: userEmail,
            role: resolvedRole
          })
          if (isRlsError(fallbackUpsertError)) {
            logger.warn(
              `RLS policy blocked insert/update: user id=${upsertPayload.id ?? 'unknown'}, email=${userEmail}, role=${resolvedRole}`,
              {
                email: userEmail,
                role: resolvedRole,
                stage: 'upsert-fallback',
                userId: upsertPayload.id
              }
            )
          }
          upsertError = fallbackUpsertError
        } else {
          upsertError = null
          upsertedUser = fallbackUser
          usedPasswordPlaceholder = true
          logger.info('Google OAuth: user upserted with placeholder password hash', {
            id: fallbackUser.id,
            email: fallbackUser.email,
            role: fallbackUser.role
          })
        }
      }

      if (
        upsertError &&
        (isDuplicateKeyError(upsertError) || isTransactionAbortedError(upsertError))
      ) {
        logger.warn('Duplicate key on email+role detected, fallback to update.', {
          email: userEmail,
          role: resolvedRole,
          error: upsertError
        })

        const fallbackUpdateData = {
          auth_provider: 'google',
          email_verified_at: emailVerifiedAt,
          updated_at: new Date().toISOString()
        }

        if (userName) {
          fallbackUpdateData.name = userName
        }
        if (defaultAge !== null) {
          fallbackUpdateData.age = defaultAge
        }

        const {
          data: fallbackUpdatedUser,
          error: fallbackUpdateError
        } = await adminSupabase
          .from('users')
          .update(fallbackUpdateData)
          .eq('email', userEmail)
          .eq('role', resolvedRole)
          .select()
          .single()

        if (fallbackUpdateError) {
          logger.error('Duplicate fallback update failed', {
            error: fallbackUpdateError,
            errorCode: fallbackUpdateError.code,
            errorMessage: fallbackUpdateError.message,
            errorDetails: fallbackUpdateError.details,
            email: userEmail,
            role: resolvedRole
          })
          if (isRlsError(fallbackUpdateError)) {
            logger.warn(
              `RLS policy blocked insert/update: user id=${upsertPayload.id ?? 'unknown'}, email=${userEmail}, role=${resolvedRole}`,
              {
                email: userEmail,
                role: resolvedRole,
                userId: upsertPayload.id
              }
            )
          }
          upsertError = fallbackUpdateError
        } else {
          upsertError = null
          upsertedUser = fallbackUpdatedUser
          logger.info('Google OAuth: existing user updated', {
            id: fallbackUpdatedUser.id,
            email: fallbackUpdatedUser.email,
            role: fallbackUpdatedUser.role
          })
        }
      }

      if (upsertError) {
        // Log full error details for debugging - including all possible error properties
        // Try to extract error from nested structures (Supabase sometimes wraps errors)
        const actualError =
          upsertError.error || upsertError.originalError || upsertError
        const errorInfo = {
          error: upsertError,
          actualError: actualError,
          errorType: typeof upsertError,
          errorCode:
            upsertError.code ||
            actualError?.code ||
            upsertError.error_code ||
            actualError?.error_code,
          errorMessage:
            upsertError.message ||
            actualError?.message ||
            upsertError.msg ||
            actualError?.msg,
          errorDetails:
            upsertError.details ||
            actualError?.details ||
            upsertError.detail ||
            actualError?.detail,
          errorHint: upsertError.hint || actualError?.hint,
          errorColumn: upsertError.column || actualError?.column,
          errorConstraint: upsertError.constraint || actualError?.constraint,
          errorTable: upsertError.table || actualError?.table,
          errorSchema: upsertError.schema || actualError?.schema,
          userData: upsertPayload,
          // Try to stringify the entire error object
          fullError: JSON.stringify(
            upsertError,
            Object.getOwnPropertyNames(upsertError),
            2
          ),
          fullActualError: actualError ? JSON.stringify(actualError, Object.getOwnPropertyNames(actualError), 2) : null,
          // Also log as plain object to see all properties
          errorKeys: Object.keys(upsertError),
          actualErrorKeys: actualError ? Object.keys(actualError) : [],
          errorString: String(upsertError),
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
        const errorCode = upsertError.code || 
                         upsertError.error_code || 
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
          const fieldName = upsertError.column || 
                           upsertError.details?.match(/column "(\w+)"/)?.[1] || 
                           upsertError.message?.match(/column "(\w+)"/)?.[1] ||
                           'unknown field'
          errorMessage = `Missing required field: ${fieldName}`
          if (fieldName === 'password_hash') {
            errorMessage = 'Password setup is required for this account. Please contact support.'
          }
        } else if (errorCode === '23514' || errorCode === 23514 || String(errorCode) === '23514') {
          // Check constraint violation
          const constraintName = upsertError.constraint || 
                                upsertError.details?.match(/constraint "(\w+)"/)?.[1] ||
                                'validation'
          errorMessage = `Data validation failed: ${constraintName}`
          if (upsertError.details) {
            errorMessage += ` - ${upsertError.details}`
          }
        } else if (errorCode === '42P01' || String(errorCode) === '42P01') {
          // Table does not exist (PostgreSQL codes with letters are always strings)
          errorMessage = 'Database table not found. Please contact support.'
        } else if (errorCode === '42703' || String(errorCode) === '42703') {
          // Column does not exist (PostgreSQL codes with letters are always strings)
          const columnName = upsertError.column || 
                            upsertError.details?.match(/column "(\w+)"/)?.[1] || 
                            'unknown column'
          errorMessage = `Database column not found: ${columnName}. Please contact support.`
        } else if (errorCode === 'PGRST116' || String(errorCode) === 'PGRST116') {
          // PostgREST: no rows returned (shouldn't happen on insert, but handle it)
          errorMessage = 'Failed to create user account. Please try again.'
        } else {
          // No matching error code - use message/details/hint
          // Priority: message > details > hint > string representation > default
          
          // Try to get message from various possible locations
          const possibleMessage = upsertError.message || 
                                 upsertError.error?.message || 
                                 actualError?.message ||
                                 upsertError.msg || 
                                 actualError?.msg ||
                                 upsertError.errorMessage ||
                                 actualError?.errorMessage ||
                                 null
          
          // Try to get details from various possible locations
          const possibleDetails = upsertError.details || 
                                 upsertError.error?.details || 
                                 actualError?.details ||
                                 upsertError.detail ||
                                 actualError?.detail ||
                                 null
          
          // Try to get hint from various possible locations
          const possibleHint = upsertError.hint || 
                              upsertError.error?.hint ||
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
              const errorStr = String(upsertError)
              if (errorStr && errorStr !== '[object Object]' && errorStr.length > 0) {
                errorMessage = errorStr
              } else {
                // Try JSON stringify
                const errorJson = JSON.stringify(upsertError)
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
                errorType: typeof upsertError,
                errorKeys: Object.keys(upsertError),
                errorString: String(upsertError),
                errorJson: JSON.stringify(upsertError),
                fullErrorObject: upsertError
              })
              // Even with default message, try to add any available info
              if (Object.keys(upsertError).length > 0) {
                errorMessage = `Database error: ${Object.keys(upsertError).join(', ')}`
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

      userRecord = upsertedUser
      if (usedPasswordPlaceholder && userRecord) {
        userRecord.password_hash = GOOGLE_OAUTH_PASSWORD_PLACEHOLDER_HASH
      }
      if (upsertedUser) {
        userTarget = upsertedUser
        logger.info(
          userTargetBeforeUpsert
            ? 'Google OAuth: existing user updated'
            : 'Google OAuth: user inserted',
          {
            id: upsertedUser.id,
            email: upsertedUser.email,
            role: upsertedUser.role
          }
        )
      }
    }

    // Remove sensitive data
    const passwordNeedsSetup = requiresPasswordSetup(userRecord)
    const hasPassword = !!userRecord.password_hash && !passwordNeedsSetup
    delete userRecord.password_hash

    // Create session data compatible with our existing system
    const userLifecycleScenario = userTargetBeforeUpsert
      ? 'existing_user_updated'
      : 'new_user_created'

    logger.info('Google OAuth manual verification guidance', {
      scenario: userLifecycleScenario,
      email: userRecord.email,
      instruction_new_user: 'Use a fresh Google email to confirm user creation succeeds.',
      instruction_existing_user: 'Sign in again with the same Google email to verify the existing record updates without duplication.'
    })

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
    const redirectBaseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      'https://ticketing-ai-six.vercel.app'
    const redirectUrl = new URL('/auth/oauth-success', redirectBaseUrl)
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

