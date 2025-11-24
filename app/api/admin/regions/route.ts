import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'

const logger = createLogger('admin-regions-api')

const slugify = (value: string) =>
  value
    ?.toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || ''

export async function GET(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, data: [] })
    }

    const supabase = createSupabaseClient()
    const url = new URL(request.url)
    const includeInactive = url.searchParams.get('include_inactive') === 'true'

    let query = supabase
      .from('regions')
      .select('*')
      .order('created_at', { ascending: true })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      throw ErrorHandler.fromSupabaseError(error, 'DATABASE_QUERY_ERROR')
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase is not configured'
      )
    }

    const body = await request.json()
    const name = body?.name?.toString().trim()
    const slugInput = body?.slug?.toString().trim()
    const subtitle =
      body?.subtitle?.toString().trim() || null
    const coverImage =
      body?.cover_image?.toString().trim() || null
    const isActive =
      body?.is_active === undefined ? true : Boolean(body.is_active)

    if (!name) {
      throw ErrorHandler.validationError('INVALID_REGION', 'Name is required')
    }

    const slug = slugify(slugInput || name)

    if (!slug) {
      throw ErrorHandler.validationError('INVALID_SLUG', 'Slug is required')
    }

    const supabase = createSupabaseClient()

    const { data, error } = await supabase
      .from('regions')
      .insert([
        {
          name,
          slug,
          subtitle,
          cover_image: coverImage,
          is_active: isActive,
        },
      ])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw ErrorHandler.validationError(
          'DUPLICATE_SLUG',
          'Slug already exists'
        )
      }
      throw ErrorHandler.fromSupabaseError(error, 'CREATE_ERROR')
    }

    logger.success('Region created', { id: data.id, slug })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

