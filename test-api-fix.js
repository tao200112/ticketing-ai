#!/usr/bin/env node

/**
 * 测试 API 修复
 * 验证 /api/orders/by-session API 是否正常工作
 */

console.log('🧪 测试 API 修复...\n')

async function testAPI() {
  try {
    // 模拟 API 调用
    const sessionId = 'cs_test_123456789'
    const url = `http://localhost:3000/api/orders/by-session?session_id=${sessionId}`
    
    console.log('📡 测试 API 端点:', url)
    
    const response = await fetch(url)
    const data = await response.json()
    
    console.log('📊 响应状态:', response.status)
    console.log('📋 响应数据:', JSON.stringify(data, null, 2))
    
    if (response.ok && data.ok) {
      console.log('\n✅ API 测试成功!')
      console.log('- 订单 ID:', data.order.id)
      console.log('- 票据数量:', data.order.ticketCount)
      console.log('- 票据 ID:', data.tickets[0]?.id)
      console.log('- 二维码载荷:', data.tickets[0]?.qrPayload ? '已生成' : '未生成')
    } else {
      console.log('\n❌ API 测试失败!')
      console.log('- 错误代码:', data.code)
      console.log('- 错误消息:', data.message)
    }
    
  } catch (error) {
    console.log('❌ 测试过程中出错:', error.message)
    console.log('\n💡 可能的原因:')
    console.log('1. 开发服务器未启动 (npm run dev)')
    console.log('2. 端口 3000 被占用')
    console.log('3. API 路由配置错误')
  }
}

// 运行测试
testAPI().then(() => {
  console.log('\n🏁 测试完成')
}).catch(error => {
  console.log('❌ 测试失败:', error.message)
})