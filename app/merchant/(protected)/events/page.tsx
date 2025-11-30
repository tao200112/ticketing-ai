import MerchantEventsClient from './_components/MerchantEventsClient'
import { getMerchantProfile } from '@/lib/auth/getMerchant'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function MerchantEventsPage() {
  const merchant = await getMerchantProfile()

  if (!merchant) {
    redirect('/merchant/auth/login?next=/merchant/events')
  }

  return <MerchantEventsClient merchant={merchant} />
}


