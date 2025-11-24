import 'server-only'

import { cache } from 'react'
import { getSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'

export type RegionRecord = {
  id: string
  name: string
  slug: string
  subtitle?: string | null
  cover_image?: string | null
  is_active: boolean
  created_at?: string | null
}

const DEFAULT_REGION_SLUG = 'blacksburg'

async function getSupabase() {
  const serverClient = getSupabaseServer()
  if (serverClient) {
    return serverClient
  }

  if (!isSupabaseConfigured()) {
    return null
  }

  return createSupabaseClient()
}

export const fetchRegions = cache(async (includeInactive = false) => {
  const supabase = await getSupabase()
  if (!supabase) {
    return [] as RegionRecord[]
  }

  let query = supabase
    .from('regions')
    .select('*')
    .order('created_at', { ascending: true })

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error || !data) {
    console.warn('[regions] Failed to fetch regions', error)
    return []
  }

  return data as RegionRecord[]
})

export const fetchActiveRegions = cache(async () => {
  return fetchRegions(false)
})

export const getRegionBySlug = cache(async (slug: string) => {
  const supabase = await getSupabase()
  if (!supabase || !slug) {
    return null
  }

  const { data, error } = await supabase
    .from('regions')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.warn('[regions] Failed to fetch region by slug', { slug, error })
    return null
  }

  return data as RegionRecord | null
})

export const getDefaultRegion = cache(async () => {
  const supabase = await getSupabase()
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('regions')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn('[regions] Failed to fetch default region', error)
    return null
  }

  return data as RegionRecord | null
})

export async function getDefaultRegionSlug() {
  const region = await getDefaultRegion()
  return region?.slug || DEFAULT_REGION_SLUG
}

export async function ensureRegionId(options: { regionId?: string | null; regionSlug?: string | null } = {}) {
  if (options.regionId) {
    return options.regionId
  }

  if (options.regionSlug) {
    const region = await getRegionBySlug(options.regionSlug)
    if (region) {
      return region.id
    }
  }

  const fallback = await getDefaultRegion()
  if (fallback) {
    return fallback.id
  }

  return null
}

