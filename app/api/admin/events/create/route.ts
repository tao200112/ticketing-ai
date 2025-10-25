// @ts-nocheck
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      location,
      maxAttendees,
      ticketTypes,
      merchantId
    } = await request.json()

    // 检查Supabase配置
    if (!supabaseAdmin) {
      console.log('Supabase not configured, returning mock success')
      // 返回模拟成功响应，用于演示
      return NextResponse.json({
        success: true,
        event: {
          id: `event-${Date.now()}`,
          title,
          description,
          start_date: startDate,
          end_date: endDate,
          location,
          max_attendees: maxAttendees,
          merchant_id: 'admin-created',
          status: 'active',
          created_at: new Date().toISOString()
        }
      })
    }

    if (!title || !description || !startDate || !endDate || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 如果没有merchantId，查找或创建默认商家
    let finalMerchantId = merchantId
    if (!merchantId || merchantId === 'admin-created') {
      // 首先尝试查找现有的默认商家
      const { data: existingMerchant } = await supabaseAdmin
        .from('merchants')
        .select('id')
        .eq('name', 'Admin Created Events')
        .single()

      if (existingMerchant) {
        finalMerchantId = existingMerchant.id
      } else {
        // 创建默认商家记录
        const { data: defaultMerchant, error: merchantError } = await supabaseAdmin
          .from('merchants')
          .insert({
            name: 'Admin Created Events',
            contact_email: 'admin@partytix.com',
            status: 'active',
            verified: true
          })
          .select('id')
          .single()

        if (merchantError) {
          console.error('Failed to create default merchant:', merchantError)
          return NextResponse.json(
            { error: 'Failed to create event: no merchant available' },
            { status: 500 }
          )
        }
        finalMerchantId = defaultMerchant.id
      }
    }

    // Create event - 使用正确的字段名
    const { data: event, error } = await supabaseAdmin
      .from('events')
      .insert({
        title,
        description,
        start_at: startDate,
        end_at: endDate,
        venue_name: location,
        max_attendees: maxAttendees || null,
        merchant_id: finalMerchantId,
        status: 'draft'
      })
      .select('*')
      .single()

    if (error) {
      console.error('Event creation error:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: 'Failed to create event', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      event
    })
  } catch (error) {
    console.error('Event creation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
