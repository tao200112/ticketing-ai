import { NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase-api'
import { createLogger } from '@/lib/logger'

const logger = createLogger('debug-user-table')

export async function GET(request) {
  try {
    const adminSupabase = createSupabaseClient()
    
    // Check table structure
    const { data: columns, error: columnsError } = await adminSupabase.rpc('exec_sql', {
      query: `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position;
      `
    }).catch(() => ({ data: null, error: { message: 'RPC not available, using direct query' } }))

    // Try direct query instead
    const structureInfo = {
      message: 'Checking users table structure...',
      note: 'This endpoint helps diagnose table structure issues'
    }

    // Try to get a sample user to see what fields work
    const { data: sampleUser, error: sampleError } = await adminSupabase
      .from('users')
      .select('*')
      .limit(1)
      .single()

    return NextResponse.json({
      success: true,
      structureInfo,
      sampleUser: sampleUser ? Object.keys(sampleUser) : null,
      sampleError: sampleError ? {
        code: sampleError.code,
        message: sampleError.message,
        details: sampleError.details,
        hint: sampleError.hint
      } : null,
      note: 'Check the sampleUser array to see what fields exist in the table'
    })

  } catch (error) {
    logger.error('Debug check error', { error })
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

