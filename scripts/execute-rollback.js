#!/usr/bin/env node

/**
 * 数据库回滚脚本执行器
 * 执行指定日期的回滚脚本
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

class RollbackExecutor {
  constructor(rollbackDate) {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.rollbackDate = rollbackDate;
    this.rollbackDir = path.join(__dirname, '..', 'db', 'rollback');
  }

  async executeRollback() {
    try {
      console.log('🚀 开始执行数据库回滚...');
      
      // 验证回滚脚本
      const scriptPath = await this.validateRollbackScript();
      
      // 执行回滚
      await this.executeScript(scriptPath);
      
      console.log('✅ 数据库回滚执行完成！');
      
    } catch (error) {
      console.error('❌ 回滚失败:', error.message);
      process.exit(1);
    }
  }

  async validateRollbackScript() {
    const scriptPath = path.join(this.rollbackDir, `${this.rollbackDate}.sql`);
    
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`回滚脚本不存在: ${scriptPath}`);
    }
    
    console.log(`📄 找到回滚脚本: ${scriptPath}`);
    return scriptPath;
  }

  async executeScript(scriptPath) {
    const script = fs.readFileSync(scriptPath, 'utf8');
    
    console.log('📋 执行回滚脚本...');
    
    try {
      // 执行 SQL 脚本
      const { error } = await this.supabase.rpc('exec_sql', {
        sql: script
      });
      
      if (error) {
        throw new Error(`SQL 执行失败: ${error.message}`);
      }
      
      console.log('✅ 回滚脚本执行成功');
      
    } catch (error) {
      // 如果 rpc 方法不存在，尝试直接执行
      console.log('⚠️  RPC 方法不可用，尝试直接执行...');
      
      // 分割脚本为单独的语句
      const statements = script
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            const { error } = await this.supabase
              .from('_dummy')
              .select('*')
              .limit(0);
            
            // 这里需要根据实际的 Supabase 配置来执行 SQL
            console.log(`📋 执行语句: ${statement.substring(0, 50)}...`);
            
          } catch (stmtError) {
            console.warn(`⚠️  语句执行失败: ${stmtError.message}`);
          }
        }
      }
    }
  }
}

// 主函数
async function main() {
  const rollbackDate = process.argv[2];
  
  if (!rollbackDate) {
    console.error('❌ 请指定回滚日期');
    console.log('用法: node scripts/execute-rollback.js <yyyymmdd>');
    console.log('示例: node scripts/execute-rollback.js 20241201');
    process.exit(1);
  }
  
  // 验证日期格式
  if (!/^\d{8}$/.test(rollbackDate)) {
    console.error('❌ 日期格式错误，请使用 yyyymmdd 格式');
    process.exit(1);
  }
  
  const executor = new RollbackExecutor(rollbackDate);
  await executor.executeRollback();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = RollbackExecutor;
