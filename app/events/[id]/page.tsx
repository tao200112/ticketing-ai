import { notFound } from 'next/navigation'
import { supabaseAdmin } from '../../../lib/supabase-admin'
import { validateEventDetail } from '../../../lib/schemas/event'
import EventDetailClient from './EventDetailClient'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * 🎫 事件详情页面 - 服务端组件
 * 直接从 Supabase 读取数据，使用 Zod 验证，传递给客户端组件
 */
export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params

  if (!id) {
    notFound()
  }

  try {
    // 检查 Supabase 配置
    if (!supabaseAdmin) {
      console.warn('Supabase not configured for event detail page')
      notFound()
    }

    // 直接从 Supabase 查询事件详情
    const { data: event, error } = await supabaseAdmin
      .from('events')
      .select(`
        id,
        title,
        description,
        start_at,
        end_at,
        venue_name,
        location,
        max_attendees,
        poster_url,
        status,
        created_at,
        updated_at,
        event_prices (
          id,
          label,
          amount,
          currency,
          inventory,
          limit_per_user
        )
      `)
      .eq('id', id)
      .eq('status', 'active') // 只返回活跃状态的事件
      .single()

    if (error || !event) {
      console.error('Event fetch error:', error)
      notFound()
    }

    // 转换数据格式以匹配 Zod 模型
    const formattedEvent = {
      id: event.id,
      title: event.title,
      description: event.description,
      start_time: event.start_at,
      end_time: event.end_at,
      venue: event.venue_name,
      location: event.location,
      max_attendees: event.max_attendees,
      poster_url: event.poster_url,
      status: event.status,
      created_at: event.created_at,
      updated_at: event.updated_at,
      prices: event.event_prices?.map((price: any) => ({
        id: price.id,
        label: price.label,
        amount: price.amount,
        currency: price.currency || 'USD',
        inventory: price.inventory,
        limit_per_user: price.limit_per_user
      })) || []
    }

    // 使用 Zod 验证数据
    const validatedEvent = validateEventDetail(formattedEvent)
    
    if (!validatedEvent) {
      console.error('Event data validation failed for event:', id)
      notFound()
    }

    console.log(`[EventDetail] Successfully loaded event ${id} on server`)

    // 将验证后的数据传递给客户端组件
    return <EventDetailClient event={validatedEvent} />

  } catch (error) {
    console.error('[EventDetail] Server error:', error)
    notFound()
  }
}

/**
 * 生成静态参数（可选，用于静态生成）
 */
export async function generateStaticParams() {
  // 如果需要静态生成，可以在这里预生成一些热门事件的页面
  // 目前返回空数组，使用动态渲染
  return []
}

/**
 * 页面元数据
 */
export async function generateMetadata({ params }: PageProps) {
  const { id } = await params

  try {
    if (!supabaseAdmin) {
      return {
        title: 'Event Not Found',
        description: 'The requested event could not be found.'
      }
    }

    const { data: event } = await supabaseAdmin
      .from('events')
      .select('title, description')
      .eq('id', id)
      .eq('status', 'active')
      .single()

    if (!event) {
      return {
        title: 'Event Not Found',
        description: 'The requested event could not be found.'
      }
    }

    return {
      title: `${event.title} | PartyTix`,
      description: event.description || `Join us for ${event.title} on PartyTix`,
      openGraph: {
        title: event.title,
        description: event.description || `Join us for ${event.title} on PartyTix`,
        type: 'website',
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Event | PartyTix',
      description: 'Discover amazing events on PartyTix'
    }
  }
}
