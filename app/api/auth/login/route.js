import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { getPortalFromHostname, getRoleFromPortal } from '@/lib/domain-detector'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'

// Get Supabase configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const logger = createLogger('login-api')

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password, role: explicitRole } = body

    // Validate required fields
    if (!email || !password) {
      throw ErrorHandler.validationError(
        'MISSING_FIELDS',
        'Email and password are required'
      )
    }

    // If Supabase is not configured, return configuration error
    if (!supabaseUrl || !supabaseKey) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase is not configured, login is not available'
      )
    }

    // Detect role from domain/path if not explicitly provided
    const portal = getPortalFromHostname(request)
    const roleBasedOnPortal = explicitRole || getRoleFromPortal(portal)

    // Use Supabase for login
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Find user with matching email AND role (for multi-role support)
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('role', roleBasedOnPortal)
      .single()

    // Handle database errors
    if (error) {
      if (error.code === 'PGRST116') {
        // No user found with this email and role
        throw ErrorHandler.authenticationError(
          'INVALID_CREDENTIALS',
          'Invalid email or password'
        )
      }
      throw ErrorHandler.fromSupabaseError(error, 'DATABASE_QUERY_ERROR')
    }

    if (!user) {
      throw ErrorHandler.authenticationError(
        'INVALID_CREDENTIALS',
        'Invalid email or password'
      )
    }

    // Validate password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      throw ErrorHandler.authenticationError(
        'INVALID_CREDENTIALS',
        'Invalid email or password'
      )
    }

    // Check email verification based on REQUIRE_EMAIL_VERIFICATION environment variable
    // Default: allow login without verification (REQUIRE_EMAIL_VERIFICATION !== 'true')
    // If REQUIRE_EMAIL_VERIFICATION === 'true', block login for unverified users
    const requireEmailVerification = process.env.REQUIRE_EMAIL_VERIFICATION === 'true'
    
    if (!user.email_verified_at && requireEmailVerification) {
      logger.info('Login blocked: email not verified', { userId: user.id, email: user.email })
      throw ErrorHandler.authenticationError(
        'EMAIL_NOT_VERIFIED',
        'Please verify your email before logging in',
        {
          email: user.email,
          needsVerification: true,
          requiresEmailVerification: true
        }
      )
    }
    
    // Log verification status for monitoring (even if not required)
    if (!user.email_verified_at) {
      logger.info('User logged in with unverified email', { userId: user.id, email: user.email })
    }

    // Update last login domain
    const hostname = request.headers.get('host') || ''
    const loginDomain = hostname.split(':')[0]
    try {
      await supabase
        .from('users')
        .update({ last_login_domain: loginDomain })
        .eq('id', user.id)
    } catch (updateError) {
      logger.warn('Failed to update last_login_domain', { error: updateError })
      // Don't block login if this fails
    }

    // Remove sensitive data
    delete user.password_hash

    // Return consistent data format
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: user,
      user: user // Also include 'user' field for compatibility
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}
