import { z } from 'zod'

/**
 * 🎫 事件数据模型
 * 用于验证从 Supabase 获取的事件数据
 */

// 价格模型
export const PriceSchema = z.object({
  id: z.string(),
  label: z.string(),
  amount: z.number().min(0),
  currency: z.string().default('USD'),
  inventory: z.number().min(0).optional(),
  limit_per_user: z.number().min(1).optional()
})

// 事件模型
export const EventSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  start_time: z.union([z.string(), z.date()]),
  end_time: z.union([z.string(), z.date()]).optional(),
  venue: z.string().optional(),
  location: z.string().optional(),
  max_attendees: z.number().min(0).optional(),
  poster_url: z.string().url().optional(),
  status: z.enum(['draft', 'active', 'cancelled', 'completed']).default('draft'),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  prices: z.array(PriceSchema).default([])
})

// 事件详情模型（包含价格信息）
export const EventDetailSchema = EventSchema.extend({
  prices: z.array(PriceSchema).min(1, '事件必须至少有一个价格选项')
})

// 类型导出
export type Event = z.infer<typeof EventSchema>
export type EventDetail = z.infer<typeof EventDetailSchema>
export type Price = z.infer<typeof PriceSchema>

/**
 * 验证事件数据
 * @param data 原始数据
 * @returns 验证后的事件数据或 null
 */
export function validateEvent(data: unknown): Event | null {
  try {
    return EventSchema.parse(data)
  } catch (error) {
    console.error('事件数据验证失败:', error)
    return null
  }
}

/**
 * 验证事件详情数据
 * @param data 原始数据
 * @returns 验证后的事件详情数据或 null
 */
export function validateEventDetail(data: unknown): EventDetail | null {
  try {
    return EventDetailSchema.parse(data)
  } catch (error) {
    console.error('事件详情数据验证失败:', error)
    return null
  }
}

/**
 * 安全获取事件字段（带默认值）
 */
export function getSafeEventField(event: Event | null, field: keyof Event, defaultValue: any = '') {
  if (!event) return defaultValue
  return event[field] ?? defaultValue
}

/**
 * 安全获取价格字段（带默认值）
 */
export function getSafePriceField(price: Price | null, field: keyof Price, defaultValue: any = 0) {
  if (!price) return defaultValue
  return price[field] ?? defaultValue
}
