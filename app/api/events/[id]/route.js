import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  try {
    const { id } = params
    
    // 这里应该从数据库获取事件信息
    // 由于我们使用localStorage，这里返回一个模拟响应
    // 在实际应用中，应该从数据库查询
    
    return NextResponse.json({
      error: 'Event data should be passed from client side',
      message: 'Please pass event data from the client'
    }, { status: 400 })
    
  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

