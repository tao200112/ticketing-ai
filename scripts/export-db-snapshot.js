#!/usr/bin/env node

/**
 * 数据库快照导出脚本
 * 导出 Supabase schema + 线上数据快照（红线表脱敏）
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 敏感表列表（需要脱敏）
const SENSITIVE_TABLES = [
  'users',
  'user_profiles', 
  'merchants',
  'admin_users',
  'invite_codes',
  'tickets',
  'orders',
  'payments'
];

// 脱敏字段映射
const SENSITIVE_FIELDS = {
  email: 'user@example.com',
  phone: '138****0000',
  password: '***REDACTED***',
  secret_key: '***REDACTED***',
  token: '***REDACTED***',
  api_key: '***REDACTED***',
  card_number: '****-****-****-0000',
  cvv: '***',
  ssn: '***-**-0000',
  id_number: '***REDACTED***'
};

class DatabaseSnapshotExporter {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.outputDir = path.join(__dirname, '..', 'backups', `snapshot-${this.timestamp}`);
  }

  async exportSnapshot() {
    try {
      console.log('🚀 开始导出数据库快照...');
      
      // 创建输出目录
      await this.createOutputDirectory();
      
      // 导出 schema
      await this.exportSchema();
      
      // 导出数据（脱敏）
      await this.exportData();
      
      // 生成元数据文件
      await this.generateMetadata();
      
      console.log('✅ 数据库快照导出完成！');
      console.log(`📁 输出目录: ${this.outputDir}`);
      
    } catch (error) {
      console.error('❌ 导出失败:', error.message);
      process.exit(1);
    }
  }

  async createOutputDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    console.log('📁 创建输出目录');
  }

  async exportSchema() {
    console.log('📋 导出数据库 schema...');
    
    try {
      // 获取所有表的结构
      const { data: tables, error } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      if (error) throw error;
      
      const schema = {
        timestamp: this.timestamp,
        tables: []
      };
      
      for (const table of tables) {
        const tableName = table.table_name;
        
        // 获取表结构
        const { data: columns, error: columnError } = await this.supabase
          .from('information_schema.columns')
          .select('*')
          .eq('table_name', tableName)
          .eq('table_schema', 'public');
        
        if (columnError) {
          console.warn(`⚠️  无法获取表 ${tableName} 的结构:`, columnError.message);
          continue;
        }
        
        // 获取索引信息
        const { data: indexes, error: indexError } = await this.supabase
          .from('pg_indexes')
          .select('*')
          .eq('tablename', tableName);
        
        schema.tables.push({
          name: tableName,
          columns: columns,
          indexes: indexes || [],
          isSensitive: SENSITIVE_TABLES.includes(tableName)
        });
      }
      
      // 保存 schema 文件
      const schemaFile = path.join(this.outputDir, 'schema.json');
      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));
      
      console.log(`✅ Schema 已导出到: ${schemaFile}`);
      
    } catch (error) {
      console.error('❌ Schema 导出失败:', error.message);
      throw error;
    }
  }

  async exportData() {
    console.log('📊 导出数据（脱敏处理）...');
    
    try {
      // 获取所有表
      const { data: tables, error } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      if (error) throw error;
      
      const dataExport = {
        timestamp: this.timestamp,
        tables: {}
      };
      
      for (const table of tables) {
        const tableName = table.table_name;
        const isSensitive = SENSITIVE_TABLES.includes(tableName);
        
        console.log(`📋 导出表: ${tableName} ${isSensitive ? '(脱敏)' : ''}`);
        
        try {
          // 获取表数据
          const { data: rows, error: dataError } = await this.supabase
            .from(tableName)
            .select('*')
            .limit(1000); // 限制导出数量
          
          if (dataError) {
            console.warn(`⚠️  无法导出表 ${tableName} 的数据:`, dataError.message);
            continue;
          }
          
          // 脱敏处理
          const processedRows = isSensitive ? this.sanitizeData(rows) : rows;
          
          dataExport.tables[tableName] = {
            count: rows.length,
            isSensitive,
            data: processedRows
          };
          
        } catch (error) {
          console.warn(`⚠️  导出表 ${tableName} 时出错:`, error.message);
          dataExport.tables[tableName] = {
            count: 0,
            isSensitive,
            error: error.message
          };
        }
      }
      
      // 保存数据文件
      const dataFile = path.join(this.outputDir, 'data.json');
      fs.writeFileSync(dataFile, JSON.stringify(dataExport, null, 2));
      
      console.log(`✅ 数据已导出到: ${dataFile}`);
      
    } catch (error) {
      console.error('❌ 数据导出失败:', error.message);
      throw error;
    }
  }

  sanitizeData(rows) {
    return rows.map(row => {
      const sanitized = { ...row };
      
      // 脱敏处理
      Object.keys(sanitized).forEach(key => {
        const lowerKey = key.toLowerCase();
        
        // 检查是否包含敏感字段名
        for (const sensitiveField of Object.keys(SENSITIVE_FIELDS)) {
          if (lowerKey.includes(sensitiveField)) {
            sanitized[key] = SENSITIVE_FIELDS[sensitiveField];
          }
        }
        
        // 特殊处理：ID 字段
        if (lowerKey.includes('id') && typeof sanitized[key] === 'string') {
          sanitized[key] = sanitized[key].substring(0, 8) + '***';
        }
      });
      
      return sanitized;
    });
  }

  async generateMetadata() {
    console.log('📄 生成元数据文件...');
    
    const metadata = {
      exportTimestamp: this.timestamp,
      environment: process.env.NODE_ENV || 'unknown',
      version: process.env.VERSION || '1.0.0',
      sensitiveTables: SENSITIVE_TABLES,
      sensitiveFields: Object.keys(SENSITIVE_FIELDS),
      totalTables: 0,
      totalRows: 0,
      sensitiveRows: 0
    };
    
    // 统计信息
    const dataFile = path.join(this.outputDir, 'data.json');
    if (fs.existsSync(dataFile)) {
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      metadata.totalTables = Object.keys(data.tables).length;
      
      Object.values(data.tables).forEach(table => {
        metadata.totalRows += table.count || 0;
        if (table.isSensitive) {
          metadata.sensitiveRows += table.count || 0;
        }
      });
    }
    
    // 保存元数据
    const metadataFile = path.join(this.outputDir, 'metadata.json');
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
    
    console.log(`✅ 元数据已生成: ${metadataFile}`);
  }
}

// 主函数
async function main() {
  const exporter = new DatabaseSnapshotExporter();
  await exporter.exportSnapshot();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = DatabaseSnapshotExporter;
