#!/usr/bin/env node

/**
 * 数据库快照导入脚本
 * 从快照文件恢复数据库
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

class DatabaseSnapshotImporter {
  constructor(snapshotPath) {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.snapshotPath = snapshotPath;
  }

  async importSnapshot() {
    try {
      console.log('🚀 开始导入数据库快照...');
      
      // 验证快照文件
      await this.validateSnapshot();
      
      // 读取快照数据
      const snapshot = await this.loadSnapshot();
      
      // 导入数据
      await this.importData(snapshot);
      
      console.log('✅ 数据库快照导入完成！');
      
    } catch (error) {
      console.error('❌ 导入失败:', error.message);
      process.exit(1);
    }
  }

  async validateSnapshot() {
    const requiredFiles = ['schema.json', 'data.json', 'metadata.json'];
    
    for (const file of requiredFiles) {
      const filePath = path.join(this.snapshotPath, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`缺少必需文件: ${file}`);
      }
    }
    
    console.log('✅ 快照文件验证通过');
  }

  async loadSnapshot() {
    const schemaFile = path.join(this.snapshotPath, 'schema.json');
    const dataFile = path.join(this.snapshotPath, 'data.json');
    const metadataFile = path.join(this.snapshotPath, 'metadata.json');
    
    const schema = JSON.parse(fs.readFileSync(schemaFile, 'utf8'));
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
    
    console.log(`📋 快照信息: ${metadata.totalTables} 个表, ${metadata.totalRows} 行数据`);
    
    return { schema, data, metadata };
  }

  async importData(snapshot) {
    const { data } = snapshot;
    
    for (const [tableName, tableData] of Object.entries(data.tables)) {
      if (tableData.error) {
        console.warn(`⚠️  跳过有错误的表: ${tableName}`);
        continue;
      }
      
      if (tableData.count === 0) {
        console.log(`📋 跳过空表: ${tableName}`);
        continue;
      }
      
      console.log(`📊 导入表: ${tableName} (${tableData.count} 行)`);
      
      try {
        // 批量插入数据
        const { error } = await this.supabase
          .from(tableName)
          .insert(tableData.data);
        
        if (error) {
          console.warn(`⚠️  导入表 ${tableName} 失败:`, error.message);
        } else {
          console.log(`✅ 表 ${tableName} 导入成功`);
        }
        
      } catch (error) {
        console.warn(`⚠️  导入表 ${tableName} 时出错:`, error.message);
      }
    }
  }
}

// 主函数
async function main() {
  const snapshotPath = process.argv[2];
  
  if (!snapshotPath) {
    console.error('❌ 请指定快照路径');
    console.log('用法: node scripts/import-db-snapshot.js <快照路径>');
    process.exit(1);
  }
  
  if (!fs.existsSync(snapshotPath)) {
    console.error(`❌ 快照路径不存在: ${snapshotPath}`);
    process.exit(1);
  }
  
  const importer = new DatabaseSnapshotImporter(snapshotPath);
  await importer.importSnapshot();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = DatabaseSnapshotImporter;
