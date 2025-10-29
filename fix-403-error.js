#!/usr/bin/env node

/**
 * 403错误修复脚本
 * 解决Supabase RLS策略导致的权限问题
 */

const { createClient } = require('@supabase/supabase-js');

// 环境变量配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://htaqcvnyipiqdbmvvfvj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YXFjdm55aXBpcWRibXZ2ZnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzYwOTgsImV4cCI6MjA3NjY1MjA5OH0.5fPm5rvK_41wc9XZhzqaVupMlD9EEo4wwjaguQkCRKw';

console.log('🔧 开始修复403错误...\n');

async function fix403Error() {
  try {
    // 1. 检查环境变量
    console.log('1️⃣ 检查环境变量配置...');
    console.log(`   SUPABASE_URL: ${supabaseUrl ? '✅ 已配置' : '❌ 未配置'}`);
    console.log(`   SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ 已配置' : '❌ 未配置'}`);
    console.log(`   ANON_KEY: ${supabaseAnonKey ? '✅ 已配置' : '❌ 未配置'}\n`);

    if (!supabaseServiceKey) {
      console.log('⚠️ 警告: SUPABASE_SERVICE_ROLE_KEY 未配置，将使用 ANON_KEY（可能受RLS限制）\n');
    }

    // 2. 创建Supabase客户端
    const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
    console.log('2️⃣ 创建Supabase客户端... ✅\n');

    // 3. 检查当前活动数据
    console.log('3️⃣ 检查当前活动数据...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, status, created_at')
      .order('created_at', { ascending: false });

    if (eventsError) {
      console.log(`   ❌ 查询失败: ${eventsError.message}`);
      console.log(`   🔍 错误详情: ${JSON.stringify(eventsError, null, 2)}\n`);
    } else {
      console.log(`   📊 找到 ${events?.length || 0} 个活动`);
      if (events && events.length > 0) {
        console.log('   📋 活动状态分布:');
        const statusCount = events.reduce((acc, event) => {
          acc[event.status] = (acc[event.status] || 0) + 1;
          return acc;
        }, {});
        Object.entries(statusCount).forEach(([status, count]) => {
          console.log(`      ${status}: ${count} 个`);
        });
      }
      console.log('');
    }

    // 4. 检查RLS策略状态
    console.log('4️⃣ 检查RLS策略状态...');
    try {
      const { data: policies, error: policiesError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'events');

      if (policiesError) {
        console.log('   ⚠️ 无法查询RLS策略（可能需要管理员权限）');
      } else {
        console.log(`   📋 找到 ${policies?.length || 0} 个RLS策略`);
      }
    } catch (error) {
      console.log('   ⚠️ 无法查询RLS策略（可能需要管理员权限）');
    }
    console.log('');

    // 5. 测试API访问
    console.log('5️⃣ 测试API访问...');
    try {
      const response = await fetch('http://localhost:3000/api/events');
      const result = await response.json();
      
      if (response.ok) {
        console.log('   ✅ API访问成功');
        console.log(`   📊 返回 ${result.data?.length || 0} 个活动`);
      } else {
        console.log(`   ❌ API访问失败: ${response.status} ${response.statusText}`);
        console.log(`   📋 响应内容: ${JSON.stringify(result, null, 2)}`);
      }
    } catch (apiError) {
      console.log(`   ❌ API请求失败: ${apiError.message}`);
    }
    console.log('');

    // 6. 提供修复建议
    console.log('6️⃣ 修复建议:');
    console.log('   🔧 方案1: 确保SUPABASE_SERVICE_ROLE_KEY正确配置');
    console.log('   🔧 方案2: 更新活动状态为"published"');
    console.log('   🔧 方案3: 调整RLS策略以允许更多访问');
    console.log('   🔧 方案4: 临时禁用RLS进行测试');
    console.log('');

    // 7. 自动修复：更新活动状态
    if (events && events.length > 0) {
      console.log('7️⃣ 尝试自动修复...');
      const draftEvents = events.filter(event => event.status === 'draft');
      
      if (draftEvents.length > 0) {
        console.log(`   📝 发现 ${draftEvents.length} 个草稿状态的活动，尝试更新为published...`);
        
        const { error: updateError } = await supabase
          .from('events')
          .update({ status: 'published' })
          .eq('status', 'draft');
        
        if (updateError) {
          console.log(`   ❌ 更新失败: ${updateError.message}`);
        } else {
          console.log('   ✅ 活动状态更新成功');
        }
      } else {
        console.log('   ℹ️ 没有需要更新的草稿活动');
      }
    }

    console.log('\n🎉 修复脚本执行完成！');
    console.log('💡 如果问题仍然存在，请检查：');
    console.log('   1. 环境变量配置是否正确');
    console.log('   2. Supabase项目权限设置');
    console.log('   3. RLS策略是否过于严格');

  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error);
    process.exit(1);
  }
}

// 执行修复
fix403Error();
