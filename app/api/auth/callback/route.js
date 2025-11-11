import { NextResponse } from 'next/server'

function deprecationResponse() {
  return NextResponse.json(
    { success: false, error: 'AUTH_API_DEPRECATED', message: 'Use Supabase Auth directly' },
    { status: 410 }
  )
}

export function GET() {
  return deprecationResponse()
}