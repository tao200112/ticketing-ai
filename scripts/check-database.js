#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// 环境变量
const SUPABASE_URL = 'https://htaqcvnyipiqdbmvvfvj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YXFjdm55aXBpcWRibXZ2ZnZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA3NjA5OCwiZXhwIjoyMDc2NjUyMDk4fQ.84ZGW8t9veGNDJwvy-grFeOa67jtsp1UMLFRcw5hEKM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkDatabase() {
  console.log('🔍 检查数据库结构...\n');

  try {
    // 检查用户表
    console.log('👤 检查用户表:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (usersError) {
      console.log(`  ❌ 用户表错误: ${usersError.message}`);
      console.log(`  📋 错误代码: ${usersError.code}`);
      console.log(`  🔧 建议: 检查用户表是否存在或字段是否正确`);
    } else {
      console.log(`  ✅ 用户表正常`);
      if (users && users.length > 0) {
        console.log(`  📊 用户数量: ${users.length}`);
        console.log(`  📋 用户字段: ${Object.keys(users[0]).join(', ')}`);
      }
    }

    // 检查活动表
    console.log('\n🎪 检查活动表:');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .limit(1);

    if (eventsError) {
      console.log(`  ❌ 活动表错误: ${eventsError.message}`);
    } else {
      console.log(`  ✅ 活动表正常`);
      if (events && events.length > 0) {
        console.log(`  📊 活动数量: ${events.length}`);
        console.log(`  📋 活动字段: ${Object.keys(events[0]).join(', ')}`);
      }
    }

    // 检查商家表
    console.log('\n🏢 检查商家表:');
    const { data: merchants, error: merchantsError } = await supabase
      .from('merchants')
      .select('*')
      .limit(1);

    if (merchantsError) {
      console.log(`  ❌ 商家表错误: ${merchantsError.message}`);
    } else {
      console.log(`  ✅ 商家表正常`);
      if (merchants && merchants.length > 0) {
        console.log(`  📊 商家数量: ${merchants.length}`);
        console.log(`  📋 商家字段: ${Object.keys(merchants[0]).join(', ')}`);
      }
    }

    // 检查订单表
    console.log('\n📦 检查订单表:');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(1);

    if (ordersError) {
      console.log(`  ❌ 订单表错误: ${ordersError.message}`);
    } else {
      console.log(`  ✅ 订单表正常`);
      if (orders && orders.length > 0) {
        console.log(`  📊 订单数量: ${orders.length}`);
        console.log(`  📋 订单字段: ${Object.keys(orders[0]).join(', ')}`);
      }
    }

    // 检查票务表
    console.log('\n🎫 检查票务表:');
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .limit(1);

    if (ticketsError) {
      console.log(`  ❌ 票务表错误: ${ticketsError.message}`);
    } else {
      console.log(`  ✅ 票务表正常`);
      if (tickets && tickets.length > 0) {
        console.log(`  📊 票务数量: ${tickets.length}`);
        console.log(`  📋 票务字段: ${Object.keys(tickets[0]).join(', ')}`);
      }
    }

  } catch (error) {
    console.error('❌ 数据库检查失败:', error.message);
  }
}

// 运行检查
if (require.main === module) {
  checkDatabase().then(() => {
    console.log('\n✅ 数据库检查完成');
  });
}

module.exports = { checkDatabase };
