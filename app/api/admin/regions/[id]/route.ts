import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'

const logger = createLogger('admin-regions-detail-api')

const slugify = (value: string) =>
  value
    ?.toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || ''

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase is not configured'
      )
    }

    const { id } = await context.params
    const body = await request.json()

    if (!id) {
      throw ErrorHandler.validationError('INVALID_REGION', 'Region ID is required')
    }

    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) {
      const name = body.name?.toString().trim()
      if (!name) {
        throw ErrorHandler.validationError('INVALID_NAME', 'Name cannot be empty')
      }
      updateData.name = name
    }

    if (body.slug !== undefined) {
      const slugInput = body.slug?.toString().trim()
      const slug = slugify(slugInput || updateData.name?.toString() || '')
      if (!slug) {
        throw ErrorHandler.validationError('INVALID_SLUG', 'Slug cannot be empty')
      }
      updateData.slug = slug
    }

    if (body.subtitle !== undefined) {
      updateData.subtitle = body.subtitle?.toString().trim() || null
    }

    if (body.cover_image !== undefined) {
      updateData.cover_image = body.cover_image?.toString().trim() || null
    }

    if (body.is_active !== undefined) {
      updateData.is_active = Boolean(body.is_active)
    }

    if (Object.keys(updateData).length === 0) {
      throw ErrorHandler.validationError('INVALID_UPDATE', 'No fields provided')
    }

    const supabase = createSupabaseClient()
    const { data, error } = await supabase
      .from('regions')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      if (error.code === '23505') {
        throw ErrorHandler.validationError(
          'DUPLICATE_SLUG',
          'Slug already exists'
        )
      }
      throw ErrorHandler.fromSupabaseError(error, 'UPDATE_ERROR')
    }

    if (!data) {
      throw ErrorHandler.notFoundError('REGION_NOT_FOUND', 'Region not found')
    }

    logger.success('Region updated', { id })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase is not configured'
      )
    }

    const { id } = await context.params

    if (!id) {
      throw ErrorHandler.validationError('INVALID_REGION', 'Region ID is required')
    }

    const supabase = createSupabaseClient()
    const { data, error } = await supabase
      .from('regions')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      throw ErrorHandler.fromSupabaseError(error, 'DELETE_ERROR')
    }

    if (!data) {
      throw ErrorHandler.notFoundError('REGION_NOT_FOUND', 'Region not found')
    }

    logger.info('Region disabled', { id })

    return NextResponse.json({
      success: true,
      data,
      message: 'Region disabled successfully',
    })
  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

