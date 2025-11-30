import RegionPicker from '@/components/regions/RegionPicker'
import { fetchActiveRegions } from '@/lib/regions'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const regions = await fetchActiveRegions()
  return <RegionPicker regions={regions} variant="home" />
}

