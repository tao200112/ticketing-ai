import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import { getPortalFromHostname, getRoleFromPortal } from '@/lib/domain-detector'

// Get Supabase configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const logger = createLogger('register-api')

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password, name, age, role: explicitRole } = body

    // Detect role from domain if not explicitly provided
    const portal = getPortalFromHostname(request)
    const roleBasedOnPortal = explicitRole || getRoleFromPortal(portal)

    // Validate required fields
    if (!email || !password || !name) {
      throw ErrorHandler.validationError(
        'MISSING_FIELDS',
        'Please fill in all required fields (email, password, name)'
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw ErrorHandler.validationError('INVALID_EMAIL')
    }

    // Validate role
    if (!['user', 'merchant', 'admin'].includes(roleBasedOnPortal)) {
      throw ErrorHandler.validationError(
        'INVALID_ROLE',
        'Invalid role. Must be user, merchant, or admin'
      )
    }

    // Validate password length
    if (password.length < 8) {
      throw ErrorHandler.validationError('PASSWORD_TOO_SHORT')
    }

    if (password.length > 128) {
      throw ErrorHandler.validationError('PASSWORD_TOO_LONG')
    }

    // Validate age (if provided)
    if (age !== undefined && age !== null) {
      const ageNum = parseInt(age)
      if (isNaN(ageNum) || ageNum < 16 || ageNum > 150) {
        throw ErrorHandler.validationError('INVALID_AGE')
      }
    }

    // If Supabase is not configured, return configuration error
    if (!supabaseUrl || !supabaseKey) {
      throw ErrorHandler.configurationError('CONFIG_ERROR', 'Supabase is not configured, registration is not available')
    }

    // Use Supabase for registration
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if user with this email AND role already exists
    // This allows same email with different roles
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('role', roleBasedOnPortal)
      .single()

    // Handle check errors
    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is normal (user doesn't exist)
      // Other errors need to be handled
      throw ErrorHandler.fromSupabaseError(checkError, 'DATABASE_QUERY_ERROR')
    }

    // If user with this email AND role already exists, return conflict error
    if (existingUser) {
      throw ErrorHandler.conflictError(
        'EMAIL_ROLE_EXISTS',
        `An account with email ${email} and role ${roleBasedOnPortal} already exists`
      )
    }

    // Hash password
    let hashedPassword
    try {
      hashedPassword = await bcrypt.hash(password, 12)
    } catch (hashError) {
      logger.error('Password hashing failed', hashError)
      throw ErrorHandler.internalError(hashError, 'Password hashing failed, please try again later')
    }

    // Get registration domain for tracking
    const hostname = request.headers.get('host') || ''
    const registrationDomain = hostname.split(':')[0]

    // Create user (unverified status)
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          email,
          password_hash: hashedPassword,
          name,
          age: age ? parseInt(age) : null,
          role: roleBasedOnPortal,
          email_verified_at: null,  // Explicitly set as unverified
          registration_domain: registrationDomain
        }
      ])
      .select()
      .single()

    // Handle insert errors
    if (insertError) {
      // If unique constraint violation (email + role already exists)
      if (insertError.code === '23505') {
        throw ErrorHandler.conflictError(
          'EMAIL_ROLE_EXISTS',
          `An account with email ${email} and role ${roleBasedOnPortal} already exists`
        )
      }
      // Other database errors
      throw ErrorHandler.fromSupabaseError(insertError, 'REGISTRATION_FAILED')
    }

    // Generate email verification token (optional, doesn't block registration)
    try {
      const verificationToken = await supabase.rpc('send_verification_email', {
        p_user_id: newUser.id,
        p_email: newUser.email
      })

      if (verificationToken.error) {
        logger.warn('Failed to generate verification token', { error: verificationToken.error })
        // Don't block registration, but log warning
      }

      // Send verification email (optional, doesn't block registration)
      try {
        const emailService = (await import('../../../../lib/email-service.js')).default
        await emailService.sendVerificationEmail(
          newUser.email,
          newUser.name,
          verificationToken.data
        )
      } catch (emailError) {
        logger.warn('Failed to send verification email', { error: emailError })
        // Don't block registration, but log warning
      }
    } catch (tokenError) {
      logger.warn('Email verification setup failed', { error: tokenError })
      // Don't block registration
    }

    // Remove sensitive data before returning
    delete newUser.password_hash

    return NextResponse.json({
      success: true,
      message: 'Registration successful! Please check your email and click the verification link to complete registration.',
      data: {
        ...newUser,
        emailVerified: false,
        needsVerification: true,
        requiresEmailVerification: true
      },
      requiresEmailVerification: true
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}
