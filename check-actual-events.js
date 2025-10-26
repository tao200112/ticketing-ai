#!/usr/bin/env node

/**
 * 🔍 检查数据库中实际的活动数据
 */

const https = require('https');

const BASE_URL = 'https://ticketing-ai-ypyj.vercel.app';

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            success: res.statusCode >= 200 && res.statusCode < 300,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            success: false,
            data: data,
            error: error.message
          });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

async function checkEvents() {
  console.log('🔍 检查数据库中的实际活动数据...\n');
  
  try {
    // 获取所有活动
    const eventsResult = await makeRequest(`${BASE_URL}/api/events`);
    
    if (eventsResult.success) {
      console.log('📋 数据库中的活动列表:');
      console.log('='.repeat(50));
      
      if (Array.isArray(eventsResult.data) && eventsResult.data.length > 0) {
        eventsResult.data.forEach((event, index) => {
          console.log(`${index + 1}. ID: ${event.id}`);
          console.log(`   标题: ${event.title}`);
          console.log(`   状态: ${event.status}`);
          console.log(`   商家: ${event.merchants?.name || 'N/A'}`);
          console.log(`   价格数量: ${event.prices?.length || 0}`);
          console.log('');
        });
        
        // 尝试访问第一个活动
        const firstEvent = eventsResult.data[0];
        if (firstEvent && firstEvent.id) {
          console.log(`🔗 测试访问第一个活动: ${firstEvent.id}`);
          const detailResult = await makeRequest(`${BASE_URL}/api/events/${firstEvent.id}`);
          
          if (detailResult.success) {
            console.log('✅ 活动详情API正常');
            console.log(`📄 活动标题: ${detailResult.data.event?.title || 'N/A'}`);
          } else {
            console.log('❌ 活动详情API失败');
            console.log(`📄 错误: ${detailResult.data.error || detailResult.data}`);
          }
        }
      } else {
        console.log('❌ 数据库中没有活动数据');
      }
    } else {
      console.log('❌ 无法获取活动列表');
      console.log(`📄 错误: ${eventsResult.data.error || eventsResult.data}`);
    }
    
    // 检查Supabase数据详情
    console.log('\n📊 检查Supabase数据详情...');
    const dataResult = await makeRequest(`${BASE_URL}/api/debug/supabase-data`);
    
    if (dataResult.success) {
      console.log('📈 数据统计:');
      console.log(`- 用户: ${dataResult.data.data.users}`);
      console.log(`- 商家: ${dataResult.data.data.merchants}`);
      console.log(`- 活动: ${dataResult.data.data.events}`);
      console.log(`- 价格: ${dataResult.data.data.prices}`);
      console.log(`- 订单: ${dataResult.data.data.orders}`);
      console.log(`- 票据: ${dataResult.data.data.tickets}`);
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
}

checkEvents();

