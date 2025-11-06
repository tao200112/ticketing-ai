import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'

const logger = createLogger('upload-api')

export async function POST(request) {
  try {
    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase is not configured'
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      throw ErrorHandler.validationError(
        'MISSING_FILE',
        'No file provided'
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      throw ErrorHandler.validationError(
        'INVALID_FILE_TYPE',
        'Only image files (JPEG, PNG, GIF, WebP) are allowed'
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      throw ErrorHandler.validationError(
        'FILE_TOO_LARGE',
        'File size must be less than 5MB'
      )
    }

    const supabase = createSupabaseClient()

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExt = file.name.split('.').pop()
    const fileName = `activities/${timestamp}-${randomString}.${fileExt}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('activities')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      logger.error('Upload error:', uploadError)
      throw ErrorHandler.fromSupabaseError(uploadError, 'UPLOAD_ERROR')
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('activities')
      .getPublicUrl(fileName)

    const publicUrl = urlData.publicUrl

    logger.success('File uploaded successfully', { fileName, publicUrl })

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: fileName
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

