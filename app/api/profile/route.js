import { NextResponse } from 'next/server'
import { requireSupabaseUser, getSupabaseUser } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'

const logger = createLogger('profile-api')

/**
 * GET /api/profile
 * Get current user's profile
 * Returns empty profile if not found
 */
export async function GET(request) {
  try {
    // Get current user (optional - return empty profile if not logged in)
    const user = await getSupabaseUser()
    
    if (!user) {
      // Return empty profile structure
      return NextResponse.json({
        success: true,
        profile: {
          id: null,
          full_name: null,
          display_name: null,
          birth_year: null,
          accept_marketing: false,
        }
      })
    }

    const admin = supabaseAdmin
    if (!admin) {
      throw ErrorHandler.configurationError(
        'CONFIGURATION_ERROR',
        'Supabase admin client not configured'
      )
    }

    // Get profile from profiles table
    const { data: profile, error } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching profile:', error)
      throw ErrorHandler.databaseError(
        error,
        'PROFILE_FETCH_ERROR',
        'Failed to fetch profile'
      )
    }

    // Return profile or empty structure
    const profileData = profile || {
      id: user.id,
      full_name: null,
      display_name: null,
      birth_year: null,
      accept_marketing: false,
    }

    return NextResponse.json({
      success: true,
      profile: profileData
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

/**
 * PUT /api/profile
 * Update or create current user's profile
 * Requires authentication
 */
export async function PUT(request) {
  try {
    // Require authentication
    const user = await requireSupabaseUser()

    const admin = supabaseAdmin
    if (!admin) {
      throw ErrorHandler.configurationError(
        'CONFIGURATION_ERROR',
        'Supabase admin client not configured'
      )
    }

    const body = await request.json()
    const { display_name, full_name, birth_year, accept_marketing } = body

    // Validate birth_year if provided
    if (birth_year !== null && birth_year !== undefined) {
      const year = parseInt(birth_year)
      if (isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
        throw ErrorHandler.validationError(
          'INVALID_BIRTH_YEAR',
          'Invalid birth year'
        )
      }
    }

    // Prepare update data
    const updateData = {}
    if (display_name !== undefined) updateData.display_name = display_name || null
    if (full_name !== undefined) updateData.full_name = full_name || null
    if (birth_year !== undefined) updateData.birth_year = birth_year ? parseInt(birth_year) : null
    if (accept_marketing !== undefined) updateData.accept_marketing = accept_marketing === true

    // Upsert profile
    const { data: profile, error } = await admin
      .from('profiles')
      .upsert({
        id: user.id,
        ...updateData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()
      .single()

    if (error) {
      logger.error('Error upserting profile:', error)
      throw ErrorHandler.databaseError(
        error,
        'PROFILE_UPDATE_ERROR',
        'Failed to update profile'
      )
    }

    logger.success('Profile updated', { userId: user.id })

    return NextResponse.json({
      success: true,
      profile: profile
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

