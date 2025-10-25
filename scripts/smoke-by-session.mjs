#!/usr/bin/env node

/**
 * by-session API 验证脚本
 * 
 * 验证：
 * 1. 能正确拉取订单和票据数据
 * 2. 错误处理正确
 * 3. 响应格式符合契约
 */

import 'dotenv/config'

async function testBySessionAPI() {
  console.log('🧪 Testing by-session API...\n')

  try {
    // 测试 1: 正常情况
    console.log('📋 Test 1: Valid session ID')
    
    const validSessionId = 'cs_test_' + Date.now()
    
    // 先创建一些测试数据
    const { createOrderFromStripeSession, issueTicketsForOrder } = await import('../lib/db/index.ts')
    
    const mockSession = {
      id: validSessionId,
      customer_email: 'test@example.com',
      amount_total: 1500,
      currency: 'usd',
      metadata: {
        event_id: 'test-event-123',
        tier: 'regular',
        user_id: 'user-123'
      }
    }
    
    // 创建订单和票据
    const order = await createOrderFromStripeSession(mockSession)
    await issueTicketsForOrder(order, {
      quantity: 2,
      userEmail: mockSession.customer_email,
      eventId: mockSession.metadata.event_id
    })
    
    console.log(`✅ Test data created: ${validSessionId}`)
    
    // 测试 API
    const response1 = await fetch(`http://localhost:3000/api/orders/by-session?session_id=${validSessionId}`)
    const data1 = await response1.json()
    
    console.log(`📊 Response status: ${response1.status}`)
    console.log(`📊 Response ok: ${data1.ok}`)
    
    if (data1.ok) {
      console.log(`✅ Order ID: ${data1.order.id}`)
      console.log(`✅ Customer Email: ${data1.order.email}`)
      console.log(`✅ Ticket Count: ${data1.tickets.length}`)
      console.log(`✅ First Ticket ID: ${data1.tickets[0]?.id}`)
      console.log(`✅ QR Payload Present: ${data1.tickets[0]?.qrPayload ? 'Yes' : 'No'}`)
    } else {
      console.log(`❌ API Error: ${data1.message}`)
    }

    // 测试 2: 缺少参数
    console.log('\n📋 Test 2: Missing session_id parameter')
    
    const response2 = await fetch('http://localhost:3000/api/orders/by-session')
    const data2 = await response2.json()
    
    console.log(`📊 Response status: ${response2.status}`)
    console.log(`📊 Error code: ${data2.code}`)
    console.log(`📊 Error message: ${data2.message}`)
    
    const missingParamTest = response2.status === 400 && data2.code === 'MISSING_PARAM'
    console.log(`${missingParamTest ? '✅' : '❌'} Missing parameter handled correctly`)

    // 测试 3: 不存在的 session
    console.log('\n📋 Test 3: Non-existent session ID')
    
    const response3 = await fetch('http://localhost:3000/api/orders/by-session?session_id=cs_nonexistent_123')
    const data3 = await response3.json()
    
    console.log(`📊 Response status: ${response3.status}`)
    console.log(`📊 Error code: ${data3.code}`)
    console.log(`📊 Error message: ${data3.message}`)
    
    const notFoundTest = response3.status === 404 && data3.code === 'ORDER_NOT_FOUND'
    console.log(`${notFoundTest ? '✅' : '❌'} Not found handled correctly`)

    // 测试 4: 验证响应格式
    console.log('\n📋 Test 4: Response format validation')
    
    if (data1.ok) {
      const hasOrder = !!data1.order
      const hasTickets = Array.isArray(data1.tickets)
      const orderHasRequiredFields = data1.order && 
        data1.order.id && 
        data1.order.sessionId && 
        data1.order.email
      const ticketsHaveRequiredFields = data1.tickets.length > 0 && 
        data1.tickets[0].id && 
        data1.tickets[0].qrPayload
      
      console.log(`   - Has order: ${hasOrder ? '✅' : '❌'}`)
      console.log(`   - Has tickets array: ${hasTickets ? '✅' : '❌'}`)
      console.log(`   - Order has required fields: ${orderHasRequiredFields ? '✅' : '❌'}`)
      console.log(`   - Tickets have required fields: ${ticketsHaveRequiredFields ? '✅' : '❌'}`)
    }

    // 总结
    const allTestsPassed = data1.ok && missingParamTest && notFoundTest
    
    console.log(`\n📊 Results:`)
    console.log(`   - Valid session: ${data1.ok ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`   - Missing param: ${missingParamTest ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`   - Not found: ${notFoundTest ? '✅ PASS' : '❌ FAIL'}`)
    
    if (allTestsPassed) {
      console.log('\n🎉 All by-session API tests passed!')
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

testBySessionAPI()
