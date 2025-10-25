import { prisma } from '../../../../lib/db'

export async function GET() {
  try {
    console.log('[PrismaTest] Starting Prisma connection test...')
    
    // 测试Prisma连接
    try {
      const orders = await prisma.order.findMany({
        take: 1,
        select: {
          id: true,
          email: true,
          status: true
        }
      })

      console.log('[PrismaTest] Prisma query successful:', orders?.length || 0, 'orders found')

      return Response.json({
        success: true,
        message: `Prisma connection successful. Found ${orders?.length || 0} orders.`,
        data: orders,
        details: {
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          ordersCount: orders?.length || 0
        }
      })

    } catch (dbError) {
      console.error('[PrismaTest] Database connection error:', dbError)
      return Response.json({
        success: false,
        message: 'Prisma connection failed',
        error: dbError.message,
        details: {
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          databaseUrl: process.env.DATABASE_URL || 'Not set'
        }
      }, { status: 500 })
    }

  } catch (error) {
    console.error('[PrismaTest] Unexpected error:', error)
    return Response.json({
      success: false,
      message: 'Unexpected error occurred',
      error: error.message
    }, { status: 500 })
  }
}
