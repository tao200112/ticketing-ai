#!/usr/bin/env node

/**
 * 日志红线检查脚本
 * 
 * 检查：
 * 1. 生产路径中的 console.log/console.error/console.warn
 * 2. 客户端代码是否意外导入服务端日志工具
 * 3. PII 关键词在日志参数中出现
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// 需要检查的文件扩展名
const CHECK_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

// 排除的目录
const EXCLUDE_DIRS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  'coverage'
];

// 排除的文件
const EXCLUDE_FILES = [
  'lint-logs.mjs',
  'logger.js' // 日志工具本身允许使用 console
];

// PII 关键词
const PII_KEYWORDS = [
  'email', 'phone', 'ssn', 'credit_card', 'card_number',
  'password', 'token', 'secret', 'key', 'authorization',
  'session', 'auth', 'credential', 'private', 'sensitive'
];

// 服务端日志工具路径
const SERVER_LOGGER_PATH = 'lib/logger.js';

let errors = [];
let warnings = [];

/**
 * 递归扫描目录
 */
function scanDirectory(dirPath, relativePath = '') {
  try {
    const items = readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = join(dirPath, item);
      const itemRelativePath = join(relativePath, item);
      
      // 跳过排除的目录
      if (EXCLUDE_DIRS.includes(item)) {
        continue;
      }
      
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath, itemRelativePath);
      } else if (stat.isFile()) {
        const ext = extname(item);
        if (CHECK_EXTENSIONS.includes(ext) && !EXCLUDE_FILES.includes(item)) {
          checkFile(fullPath, itemRelativePath);
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error.message);
  }
}

/**
 * 检查单个文件
 */
function checkFile(filePath, relativePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // 检查 console 使用
    checkConsoleUsage(lines, relativePath);
    
    // 检查服务端日志工具导入
    checkServerLoggerImport(content, relativePath);
    
    // 检查 PII 关键词
    checkPIIKeywords(lines, relativePath);
    
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
  }
}

/**
 * 检查 console 使用
 */
function checkConsoleUsage(lines, relativePath) {
  const isServerFile = relativePath.startsWith('app/api/') || 
                      relativePath.startsWith('lib/') ||
                      relativePath.startsWith('middleware.js');
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // 检查 console.log, console.error, console.warn
    const consoleMatch = line.match(/console\.(log|error|warn|info|debug)\s*\(/);
    if (consoleMatch) {
      const method = consoleMatch[1];
      
      // 允许日志工具内部使用
      if (relativePath === 'lib/logger.js') {
        return;
      }
      
      // 允许服务端文件使用（但建议使用统一日志工具）
      if (isServerFile) {
        warnings.push({
          type: 'console_usage',
          file: relativePath,
          line: lineNum,
          message: `Found console.${method} in server file. Consider using unified logger.`,
          severity: 'warning'
        });
      } else {
        errors.push({
          type: 'console_usage',
          file: relativePath,
          line: lineNum,
          message: `Found console.${method} in client file. Use unified logger instead.`,
          severity: 'error'
        });
      }
    }
  });
}

/**
 * 检查服务端日志工具导入
 */
function checkServerLoggerImport(content, relativePath) {
  // 检查是否导入了服务端日志工具
  const serverLoggerImports = [
    "from '@/lib/logger'",
    "from '../lib/logger'",
    "from '../../lib/logger'",
    "import { createLogger }",
    "import { log }"
  ];
  
  const isClientFile = relativePath.startsWith('app/') && 
                      !relativePath.startsWith('app/api/') &&
                      !relativePath.startsWith('app/health/');
  
  if (isClientFile) {
    serverLoggerImports.forEach(importPattern => {
      if (content.includes(importPattern)) {
        errors.push({
          type: 'server_logger_import',
          file: relativePath,
          line: 0,
          message: `Client file imports server logger: ${importPattern}`,
          severity: 'error'
        });
      }
    });
  }
}

/**
 * 检查 PII 关键词
 */
function checkPIIKeywords(lines, relativePath) {
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // 检查日志调用中的 PII 关键词
    if (line.includes('logger.') || line.includes('log.')) {
      PII_KEYWORDS.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(line)) {
          warnings.push({
            type: 'pii_keyword',
            file: relativePath,
            line: lineNum,
            message: `PII keyword '${keyword}' found in log call. Consider using sanitized field name.`,
            severity: 'warning'
          });
        }
      });
    }
  });
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 Scanning for log compliance issues...\n');
  
  // 扫描项目根目录
  scanDirectory('.');
  
  // 输出结果
  console.log('📊 Scan Results:\n');
  
  if (errors.length > 0) {
    console.log('❌ Errors (must be fixed):');
    errors.forEach(error => {
      console.log(`  ${error.file}:${error.line} - ${error.message}`);
    });
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  Warnings (should be reviewed):');
    warnings.forEach(warning => {
      console.log(`  ${warning.file}:${warning.line} - ${warning.message}`);
    });
    console.log('');
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ No log compliance issues found!');
    process.exit(0);
  }
  
  if (errors.length > 0) {
    console.log(`❌ Found ${errors.length} errors. Please fix them before proceeding.`);
    process.exit(1);
  }
  
  if (warnings.length > 0) {
    console.log(`⚠️  Found ${warnings.length} warnings. Please review them.`);
    process.exit(0);
  }
}

main();
