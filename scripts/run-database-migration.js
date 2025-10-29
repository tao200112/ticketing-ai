/**
 * 数据库迁移脚本
 * 在 Supabase 中运行邮箱验证相关的数据库迁移
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// 加载环境变量
const envPath = path.join(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🗄️ 开始数据库迁移...\n');

try {
  // 读取迁移文件
  const migrationFile = path.join(process.cwd(), 'supabase/migrations/email_verification_schema.sql');
  const migrationSQL = fs.readFileSync(migrationFile, 'utf8');
  
  console.log('📄 迁移文件已读取');
  console.log('📊 文件大小:', migrationSQL.length, '字符');
  
  // 执行迁移
  console.log('🚀 正在执行数据库迁移...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: migrationSQL
  });
  
  if (error) {
    console.error('❌ 数据库迁移失败:', error);
    console.log('\n📝 请手动在 Supabase SQL Editor 中运行以下文件:');
    console.log('supabase/migrations/email_verification_schema.sql');
    process.exit(1);
  }
  
  console.log('✅ 数据库迁移成功！');
  console.log('📋 迁移结果:', data);
  
  // 验证迁移结果
  console.log('\n🔍 验证迁移结果...');
  
  // 检查用户表新增字段
  const { data: userColumns, error: userError } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_name', 'users')
    .in('column_name', [
      'email_verified_at',
      'last_password_reset_sent_at',
      'reset_token_hash',
      'reset_token_expire_at',
      'email_verification_token',
      'email_verification_expire_at'
    ]);

  if (userError) {
    console.error('❌ 验证用户表字段失败:', userError);
  } else {
    const expectedFields = [
      'email_verified_at',
      'last_password_reset_sent_at',
      'reset_token_hash',
      'reset_token_expire_at',
      'email_verification_token',
      'email_verification_expire_at'
    ];
    const actualFields = userColumns.map(col => col.column_name);
    const missingFields = expectedFields.filter(field => !actualFields.includes(field));
    
    if (missingFields.length === 0) {
      console.log('✅ 用户表字段验证成功');
    } else {
      console.log('⚠️ 缺少字段:', missingFields.join(', '));
    }
  }
  
  // 检查新增表
  const { data: tables, error: tableError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .in('table_name', ['rate_limits', 'email_verification_logs']);

  if (tableError) {
    console.error('❌ 验证表结构失败:', tableError);
  } else {
    const expectedTables = ['rate_limits', 'email_verification_logs'];
    const actualTables = tables.map(table => table.table_name);
    const missingTables = expectedTables.filter(table => !actualTables.includes(table));
    
    if (missingTables.length === 0) {
      console.log('✅ 新增表验证成功');
    } else {
      console.log('⚠️ 缺少表:', missingTables.join(', '));
    }
  }
  
  console.log('\n🎉 数据库迁移完成！');
  console.log('📧 邮箱验证功能已就绪');
  console.log('🔒 找回密码功能已就绪');
  console.log('🚦 限流功能已就绪');
  
} catch (error) {
  console.error('❌ 迁移过程中发生错误:', error);
  console.log('\n📝 请手动在 Supabase SQL Editor 中运行以下文件:');
  console.log('supabase/migrations/email_verification_schema.sql');
}
