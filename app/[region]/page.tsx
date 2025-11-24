import { notFound } from 'next/navigation'
import RegionExperienceClient from '@/components/regions/RegionExperienceClient'
import { getRegionBySlug } from '@/lib/regions'

export const dynamic = 'force-dynamic'

export default async function RegionPage({ params }: { params: { region: string } }) {
  const { region } = params || {}

  if (!region) {
    notFound()
  }

  const regionData = await getRegionBySlug(region)

  if (!regionData || !regionData.is_active) {
    notFound()
  }

  return <RegionExperienceClient region={regionData} />
}

