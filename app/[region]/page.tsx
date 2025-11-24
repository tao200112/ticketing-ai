import { notFound } from 'next/navigation'
import RegionExperienceClient from '@/components/regions/RegionExperienceClient'
import { getRegionBySlug } from '@/lib/regions'

export const dynamic = 'force-dynamic'

type RegionPageParams = {
  region: string
}

export default async function RegionPage({ params }: { params: Promise<RegionPageParams> }) {
  const resolvedParams = await params
  const slug = resolvedParams?.region

  if (!slug) {
    notFound()
  }

  const region = await getRegionBySlug(slug)

  if (!region || !region.is_active) {
    notFound()
  }

  return <RegionExperienceClient region={region} />
}

