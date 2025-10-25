#!/usr/bin/env node

/**
 * 数据访问层最小验证脚本
 * 测试关键函数是否正常工作
 */

async function testGetOrderByStripeSession() {
  console.log('\n📋 Test: getOrderByStripeSession');
  
  try {
    const { getOrderByStripeSession } = await import('../lib/db/index.ts');
    
    // 测试不存在的订单
    const result = await getOrderByStripeSession('nonexistent_session_id');
    
    if (result === null) {
      console.log('✅ getOrderByStripeSession 返回 null（符合预期）');
      return true;
    } else {
      console.error('❌ getOrderByStripeSession 应该返回 null');
      return false;
    }
  } catch (error) {
    console.error('❌ getOrderByStripeSession 失败:', error.message);
    return false;
  }
}

async function testCreateOrderFromStripeSessionWithMissingFields() {
  console.log('\n📋 Test: createOrderFromStripeSession (缺少字段)');
  
  try {
    const { createOrderFromStripeSession } = await import('../lib/db/index.ts');
    
    // 创建缺少必要字段的 session 对象
    const invalidSession = {
      id: 'cs_test_123'
      // 缺少 customer_email, amount_total 等必要字段
    };
    
    await createOrderFromStripeSession(invalidSession);
    console.error('❌ 应该抛出错误（缺少必要字段）');
    return false;
  } catch (error) {
    if (error.message.includes('Missing required field')) {
      console.log('✅ createOrderFromStripeSession 正确抛出字段缺失错误');
      return true;
    } else {
      console.error('❌ 错误消息不正确:', error.message);
      return false;
    }
  }
}

async function main() {
  console.log('🧪 Running smoke tests for data access layer\n');
  
  const results = [];
  
  // 测试 1: 查询不存在的订单
  results.push(await testGetOrderByStripeSession());
  
  // 测试 2: 缺少字段时抛出错误
  results.push(await testCreateOrderFromStripeSessionWithMissingFields());
  
  // 汇总
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n📊 Results: ${passed}/${total} tests passed\n`);
  
  process.exit(passed === total ? 0 : 1);
}

main().catch(console.error);
