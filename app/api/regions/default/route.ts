import { NextResponse } from 'next/server'
import { getDefaultRegion, getDefaultRegionSlug } from '@/lib/regions'

export async function GET() {
  try {
    const region = await getDefaultRegion()
    if (!region) {
      return NextResponse.json({
        success: true,
        data: { slug: await getDefaultRegionSlug() },
      })
    }

    return NextResponse.json({ success: true, data: region })
  } catch (error) {
    console.error('[regions-default-api] Unexpected error', error)
    return NextResponse.json(
      { success: false, error: 'Unable to resolve default region' },
      { status: 500 }
    )
  }
}

