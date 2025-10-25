// 列出商家邀请码的脚本

async function listInviteCodes() {
  try {
    console.log('🔍 正在获取商家邀请码...\n');
    
    // 尝试从本地开发服务器获取
    const response = await fetch('http://localhost:3000/api/admin/invite-codes');
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success && data.inviteCodes) {
        console.log('📋 商家邀请码列表:');
        console.log('=' .repeat(50));
        
        if (data.inviteCodes.length === 0) {
          console.log('❌ 暂无邀请码');
        } else {
          data.inviteCodes.forEach((code, index) => {
            console.log(`${index + 1}. 邀请码: ${code.code}`);
            console.log(`   状态: ${code.is_active ? '✅ 活跃' : '❌ 已停用'}`);
            console.log(`   最大活动数: ${code.max_events || '无限制'}`);
            console.log(`   创建时间: ${code.created_at || '未知'}`);
            console.log(`   过期时间: ${code.expires_at || '永不过期'}`);
            console.log(`   创建者: ${code.created_by || '未知'}`);
            if (code.used_by) {
              console.log(`   使用者: ${code.used_by}`);
            }
            if (code.used_at) {
              console.log(`   使用时间: ${code.used_at}`);
            }
            console.log('   ' + '-'.repeat(40));
          });
        }
        
        console.log(`\n📊 总计: ${data.inviteCodes.length} 个邀请码`);
      } else {
        console.log('❌ 获取邀请码失败:', data.error || '未知错误');
      }
    } else {
      console.log('❌ 服务器响应错误:', response.status, response.statusText);
    }
    
  } catch (error) {
    console.log('❌ 获取邀请码时出错:', error.message);
    console.log('\n💡 请确保:');
    console.log('1. 本地开发服务器正在运行 (npm run dev)');
    console.log('2. 数据库连接正常');
    console.log('3. 已执行数据库修复脚本');
  }
}

// 运行脚本
listInviteCodes();
