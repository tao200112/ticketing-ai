#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://htaqcvnyipiqdbmvvfvj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YXFjdm55aXBpcWRibXZ2ZnZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA3NjA5OCwiZXhwIjoyMDc2NjUyMDk4fQ.84ZGW8t9veGNDJwvy-grFeOa67jtsp1UMLFRcw5hEKM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkUserConstraints() {
  console.log('🔍 检查用户表约束...\n');

  try {
    // 检查现有用户
    const { data: users, error } = await supabase
      .from('users')
      .select('role')
      .limit(5);

    if (error) {
      console.log(`❌ 查询用户表失败: ${error.message}`);
      return;
    }

    console.log('👤 现有用户角色:');
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. 角色: "${user.role}"`);
    });

    // 尝试不同的角色值
    const testRoles = ['customer', 'admin', 'merchant', 'user', 'CUSTOMER', 'ADMIN', 'MERCHANT'];
    
    console.log('\n🧪 测试角色值:');
    for (const role of testRoles) {
      try {
        const { error: testError } = await supabase
          .from('users')
          .insert({
            email: `test-${Date.now()}@example.com`,
            name: 'Test User',
            age: 25,
            password_hash: 'test_hash',
            role: role
          });
        
        if (testError) {
          console.log(`  ❌ "${role}" - 错误: ${testError.message}`);
        } else {
          console.log(`  ✅ "${role}" - 成功`);
          // 删除测试用户
          await supabase
            .from('users')
            .delete()
            .eq('email', `test-${Date.now()}@example.com`);
        }
      } catch (e) {
        console.log(`  ❌ "${role}" - 异常: ${e.message}`);
      }
    }

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
}

if (require.main === module) {
  checkUserConstraints().then(() => {
    console.log('\n✅ 约束检查完成');
  });
}

module.exports = { checkUserConstraints };
