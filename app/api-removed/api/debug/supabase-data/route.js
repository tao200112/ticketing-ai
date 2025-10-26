import { supabaseAdmin } from '../../../../lib/supabase-admin'

export async function GET() {
  try {
    console.log('[SupabaseData] Starting data summary check...')
    
    if (!supabaseAdmin) {
      console.error('[SupabaseData] Supabase admin client is null')
      return Response.json({
        success: false,
        message: 'Supabase admin client is not configured',
        summary: 'No data available'
      }, { status: 503 })
    }

    const dataSummary = {
      users: 0,
      merchants: 0,
      events: 0,
      prices: 0,
      orders: 0,
      tickets: 0
    }

    const errors = []

    // 检查用户数据
    try {
      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id')
        .limit(1000)

      if (usersError) {
        errors.push(`Users: ${usersError.message}`)
      } else {
        dataSummary.users = users?.length || 0
      }
    } catch (err) {
      errors.push(`Users: ${err.message}`)
    }

    // 检查商家数据
    try {
      const { data: merchants, error: merchantsError } = await supabaseAdmin
        .from('merchants')
        .select('id')
        .limit(1000)

      if (merchantsError) {
        errors.push(`Merchants: ${merchantsError.message}`)
      } else {
        dataSummary.merchants = merchants?.length || 0
      }
    } catch (err) {
      errors.push(`Merchants: ${err.message}`)
    }

    // 检查事件数据
    try {
      const { data: events, error: eventsError } = await supabaseAdmin
        .from('events')
        .select('id')
        .limit(1000)

      if (eventsError) {
        errors.push(`Events: ${eventsError.message}`)
      } else {
        dataSummary.events = events?.length || 0
      }
    } catch (err) {
      errors.push(`Events: ${err.message}`)
    }

    // 检查价格数据
    try {
      const { data: prices, error: pricesError } = await supabaseAdmin
        .from('prices')
        .select('id')
        .limit(1000)

      if (pricesError) {
        errors.push(`Prices: ${pricesError.message}`)
      } else {
        dataSummary.prices = prices?.length || 0
      }
    } catch (err) {
      errors.push(`Prices: ${err.message}`)
    }

    // 检查订单数据
    try {
      const { data: orders, error: ordersError } = await supabaseAdmin
        .from('orders')
        .select('id')
        .limit(1000)

      if (ordersError) {
        errors.push(`Orders: ${ordersError.message}`)
      } else {
        dataSummary.orders = orders?.length || 0
      }
    } catch (err) {
      errors.push(`Orders: ${err.message}`)
    }

    // 检查票据数据
    try {
      const { data: tickets, error: ticketsError } = await supabaseAdmin
        .from('tickets')
        .select('id')
        .limit(1000)

      if (ticketsError) {
        errors.push(`Tickets: ${ticketsError.message}`)
      } else {
        dataSummary.tickets = tickets?.length || 0
      }
    } catch (err) {
      errors.push(`Tickets: ${err.message}`)
    }

    const totalRecords = Object.values(dataSummary).reduce((sum, count) => sum + count, 0)
    const summary = `Total: ${totalRecords} records (Users: ${dataSummary.users}, Merchants: ${dataSummary.merchants}, Events: ${dataSummary.events}, Prices: ${dataSummary.prices}, Orders: ${dataSummary.orders}, Tickets: ${dataSummary.tickets})`

    console.log(`[SupabaseData] Data summary: ${summary}`)

    return Response.json({
      success: true,
      message: 'Data summary retrieved successfully',
      data: dataSummary,
      summary: summary,
      errors: errors,
      details: {
        hasUsers: dataSummary.users > 0,
        hasMerchants: dataSummary.merchants > 0,
        hasEvents: dataSummary.events > 0,
        hasPrices: dataSummary.prices > 0,
        hasOrders: dataSummary.orders > 0,
        hasTickets: dataSummary.tickets > 0,
        totalRecords: totalRecords
      }
    })

  } catch (error) {
    console.error('[SupabaseData] Unexpected error:', error)
    return Response.json({
      success: false,
      message: 'Unexpected error occurred',
      error: error.message,
      summary: 'Error occurred'
    }, { status: 500 })
  }
}
