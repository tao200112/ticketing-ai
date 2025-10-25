#!/usr/bin/env node

const testDynamicRoute = async () => {
  console.log('🔍 测试动态路由页面\n');

  try {
    // 测试Ridiculous Chicken活动页面
    console.log('📋 测试 /events/dynamic/ridiculous-chicken-event...');
    const response = await fetch('http://localhost:3000/events/dynamic/ridiculous-chicken-event');
    
    console.log('📊 响应状态:', response.status);
    
    if (response.ok) {
      console.log('✅ Ridiculous Chicken活动页面加载成功');
    } else {
      console.log('❌ Ridiculous Chicken活动页面加载失败:', response.status);
    }

  } catch (error) {
    console.log('❌ 测试过程中出现错误:', error.message);
  }
};

// 运行测试
testDynamicRoute();
