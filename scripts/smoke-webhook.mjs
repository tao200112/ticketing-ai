#!/usr/bin/env node

/**
 * Webhook 幂等验证脚本
 * 
 * 验证：
 * 1. 第一次调用 → 创建订单 + 出票 + qr_payload 存在
 * 2. 第二次调用（相同 sessionId）→ 不重复出票
 */

import 'dotenv/config'

async function testWebhookIdempotency() {
  console.log('🧪 Testing webhook idempotency...\n')

  try {
    // 动态导入数据访问层
    const { 
      createOrderFromStripeSession, 
      getOrderByStripeSession, 
      issueTicketsForOrder 
    } = await import('../lib/db/index.ts')

    // 创建模拟 Stripe Session
    const mockSession = {
      id: 'cs_test_' + Date.now(),
      customer_email: 'test@example.com',
      amount_total: 1500, // $15.00
      currency: 'usd',
      metadata: {
        event_id: 'test-event-123',
        tier: 'regular',
        user_id: 'user-123'
      }
    }

    console.log(`📋 Test Session ID: ${mockSession.id}`)

    // 第一次调用：创建订单和票据
    console.log('\n🔄 First call: Creating order and tickets...')
    
    const order1 = await createOrderFromStripeSession(mockSession)
    console.log(`✅ Order created: ${order1.id}`)

    const tickets1 = await issueTicketsForOrder(order1, {
      quantity: 1,
      userEmail: mockSession.customer_email,
      eventId: mockSession.metadata.event_id
    })
    console.log(`✅ Tickets created: ${tickets1.length} tickets`)
    console.log(`   - Ticket ID: ${tickets1[0]?.shortId}`)
    console.log(`   - QR Payload: ${tickets1[0]?.qrPayload ? 'Present' : 'Missing'}`)

    // 第二次调用：应该幂等
    console.log('\n🔄 Second call: Testing idempotency...')
    
    const order2 = await createOrderFromStripeSession(mockSession)
    console.log(`✅ Order retrieved: ${order2.id}`)

    const tickets2 = await issueTicketsForOrder(order2, {
      quantity: 1,
      userEmail: mockSession.customer_email,
      eventId: mockSession.metadata.event_id
    })
    console.log(`✅ Tickets retrieved: ${tickets2.length} tickets`)

    // 验证幂等性
    console.log('\n🔍 Verifying idempotency...')
    
    const isSameOrder = order1.id === order2.id
    const isSameTicketCount = tickets1.length === tickets2.length
    const isSameTicketId = tickets1[0]?.shortId === tickets2[0]?.shortId
    const isSameQRPayload = tickets1[0]?.qrPayload === tickets2[0]?.qrPayload

    console.log(`   - Same order: ${isSameOrder ? '✅' : '❌'}`)
    console.log(`   - Same ticket count: ${isSameTicketCount ? '✅' : '❌'}`)
    console.log(`   - Same ticket ID: ${isSameTicketId ? '✅' : '❌'}`)
    console.log(`   - Same QR payload: ${isSameQRPayload ? '✅' : '❌'}`)

    // 通过 by-session API 验证
    console.log('\n🌐 Testing by-session API...')
    
    const response = await fetch(`http://localhost:3000/api/orders/by-session?session_id=${mockSession.id}`)
    const apiData = await response.json()
    
    if (apiData.ok) {
      console.log(`✅ API response: ${apiData.tickets.length} tickets`)
      console.log(`   - Order ID: ${apiData.order.id}`)
      console.log(`   - Customer Email: ${apiData.order.email}`)
      console.log(`   - Ticket Status: ${apiData.tickets[0]?.status}`)
    } else {
      console.log(`❌ API error: ${apiData.message}`)
    }

    // 总结
    const allPassed = isSameOrder && isSameTicketCount && isSameTicketId && isSameQRPayload
    
    console.log(`\n📊 Results:`)
    console.log(`   - Idempotency: ${allPassed ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`   - API Integration: ${apiData.ok ? '✅ PASS' : '❌ FAIL'}`)
    
    if (allPassed && apiData.ok) {
      console.log('\n🎉 All tests passed! Webhook is idempotent.')
      process.exit(0)
    } else {
      console.log('\n❌ Some tests failed.')
      process.exit(1)
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

testWebhookIdempotency()
