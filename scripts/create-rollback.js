#!/usr/bin/env node

/**
 * 数据库回滚脚本生成器
 * 自动生成回滚脚本到 db/rollback/yyyymmdd.sql
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

class RollbackScriptGenerator {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.rollbackDir = path.join(__dirname, '..', 'db', 'rollback');
    this.timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  }

  async generateRollbackScript() {
    try {
      console.log('🚀 开始生成回滚脚本...');
      
      // 创建回滚目录
      await this.createRollbackDirectory();
      
      // 生成回滚脚本
      await this.generateScript();
      
      console.log('✅ 回滚脚本生成完成！');
      console.log(`📁 脚本位置: ${path.join(this.rollbackDir, `${this.timestamp}.sql`)}`);
      
    } catch (error) {
      console.error('❌ 生成失败:', error.message);
      process.exit(1);
    }
  }

  async createRollbackDirectory() {
    if (!fs.existsSync(this.rollbackDir)) {
      fs.mkdirSync(this.rollbackDir, { recursive: true });
    }
  }

  async generateScript() {
    const scriptPath = path.join(this.rollbackDir, `${this.timestamp}.sql`);
    
    let script = `-- ===========================================
-- 数据库回滚脚本
-- 生成时间: ${new Date().toISOString()}
-- 环境: ${process.env.NODE_ENV || 'unknown'}
-- ===========================================

-- 设置回滚模式
SET client_min_messages = WARNING;
SET log_statement = 'none';

-- 开始事务
BEGIN;

-- ===========================================
-- 1. 删除可能存在的临时表
-- ===========================================

-- 删除临时表（如果存在）
DROP TABLE IF EXISTS temp_migration_log CASCADE;
DROP TABLE IF EXISTS temp_rollback_log CASCADE;

-- ===========================================
-- 2. 恢复表结构
-- ===========================================

-- 这里需要根据具体的迁移内容添加回滚语句
-- 例如：删除新增的列、表、索引等

-- 示例：删除新增的列
-- ALTER TABLE users DROP COLUMN IF EXISTS new_field;

-- 示例：删除新增的表
-- DROP TABLE IF EXISTS new_table CASCADE;

-- 示例：删除新增的索引
-- DROP INDEX IF EXISTS idx_new_field;

-- ===========================================
-- 3. 恢复数据
-- ===========================================

-- 这里需要根据具体的数据变更添加回滚语句
-- 例如：恢复被删除的数据、撤销数据更新等

-- 示例：恢复被删除的数据
-- INSERT INTO users (id, email, created_at) 
-- SELECT id, email, created_at 
-- FROM backup_users 
-- WHERE id NOT IN (SELECT id FROM users);

-- 示例：撤销数据更新
-- UPDATE users 
-- SET field = old_value 
-- WHERE id IN (SELECT id FROM backup_users);

-- ===========================================
-- 4. 恢复权限和策略
-- ===========================================

-- 恢复 RLS 策略
-- 示例：删除新增的策略
-- DROP POLICY IF EXISTS new_policy ON users;

-- 示例：恢复原始策略
-- CREATE POLICY original_policy ON users FOR ALL USING (true);

-- ===========================================
-- 5. 恢复函数和触发器
-- ===========================================

-- 删除新增的函数
-- DROP FUNCTION IF EXISTS new_function();

-- 删除新增的触发器
-- DROP TRIGGER IF EXISTS new_trigger ON users;

-- ===========================================
-- 6. 清理和验证
-- ===========================================

-- 清理临时数据
-- DELETE FROM temp_migration_log WHERE created_at < NOW() - INTERVAL '1 day';

-- 验证回滚结果
-- SELECT 'Rollback completed successfully' as status;

-- 提交事务
COMMIT;

-- ===========================================
-- 回滚完成
-- ===========================================
`;

    // 获取当前数据库状态
    const currentState = await this.getCurrentDatabaseState();
    
    // 添加当前状态信息到脚本
    script += `\n-- ===========================================
-- 当前数据库状态信息
-- ===========================================

-- 表列表
${currentState.tables.map(table => `-- - ${table}`).join('\n')}

-- 函数列表  
${currentState.functions.map(func => `-- - ${func}`).join('\n')}

-- 策略列表
${currentState.policies.map(policy => `-- - ${policy}`).join('\n')}

-- 生成时间: ${new Date().toISOString()}
-- 环境: ${process.env.NODE_ENV || 'unknown'}
-- 版本: ${process.env.VERSION || '1.0.0'}
`;

    // 保存脚本
    fs.writeFileSync(scriptPath, script);
    
    console.log(`📄 回滚脚本已生成: ${scriptPath}`);
  }

  async getCurrentDatabaseState() {
    try {
      // 获取表列表
      const { data: tables } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      // 获取函数列表
      const { data: functions } = await this.supabase
        .from('pg_proc')
        .select('proname')
        .eq('pronamespace', 'public'::regnamespace);
      
      // 获取策略列表
      const { data: policies } = await this.supabase
        .from('pg_policies')
        .select('tablename, policyname');
      
      return {
        tables: tables?.map(t => t.table_name) || [],
        functions: functions?.map(f => f.proname) || [],
        policies: policies?.map(p => `${p.tablename}.${p.policyname}`) || []
      };
      
    } catch (error) {
      console.warn('⚠️  无法获取数据库状态:', error.message);
      return {
        tables: [],
        functions: [],
        policies: []
      };
    }
  }
}

// 主函数
async function main() {
  const generator = new RollbackScriptGenerator();
  await generator.generateRollbackScript();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = RollbackScriptGenerator;
