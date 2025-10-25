import { getPublishedEventBySlug, listActivePrices } from '@/lib/db'
import { EventHero } from './components/EventHero'
import { EventDescription } from './components/EventDescription'
import { PriceSelector } from './components/PriceSelector'
import { ErrorState } from './components/ErrorState'
import { NoTicketsAvailable } from './components/NoTicketsAvailable'

/**
 * 事件详情页 - 动态路由
 * 
 * URL: /event/[slug]
 * 
 * 功能:
 * - 从数据库加载事件和价格
 * - 支持 slug-based 路由
 * - 空态和错误处理
 */
export default async function EventPage({ params }) {
  const { slug } = params

  try {
    // 从数据库加载事件
    const event = await getPublishedEventBySlug(slug)
    
    if (!event) {
      return <ErrorState message="Event not found or unpublished." />
    }

    // 加载活跃价格
    const prices = await listActivePrices(event.id)

    // 无票可售
    if (!prices || prices.length === 0) {
      return (
        <div>
          <EventHero 
            title={event.title} 
            date={formatDate(event.startAt)} 
            poster={event.posterUrl}
          />
          <NoTicketsAvailable />
        </div>
      )
    }

    // 正常渲染
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <EventHero 
          title={event.title} 
          date={formatDate(event.startAt)}
          poster={event.posterUrl}
          venue={event.venueName}
        />
        <EventDescription text={event.description} />
        <PriceSelector prices={prices} eventSlug={slug} />
      </div>
    )

  } catch (error) {
    console.error('[EventPage] Error loading event:', error)
    return <ErrorState message="Unable to load event data." />
  }
}

/**
 * 格式化日期显示
 */
function formatDate(isoString) {
  const date = new Date(isoString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
