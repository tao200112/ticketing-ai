import RegionPicker from '@/components/regions/RegionPicker'
import { fetchActiveRegions } from '@/lib/regions'

export const dynamic = 'force-dynamic'

export default async function RegionsPage() {
  const regions = await fetchActiveRegions()
  return <RegionPicker regions={regions} variant="page" />
}

