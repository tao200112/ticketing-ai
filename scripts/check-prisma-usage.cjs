#!/usr/bin/env node

/**
 * 检查 Prisma 使用情况
 * 如果发现任何 @prisma/client 引用，脚本将失败
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Checking for Prisma usage...\n');

// 搜索所有包含 @prisma/client 的文件
const findPrismaReferences = () => {
  const results = [];
  
  // 搜索所有 JS/TS 文件
  const searchPattern = /@prisma\/client|from.*['"]prisma['"]/gi;
  
  const searchInDir = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // 跳过 node_modules 和 .next
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') {
        continue;
      }
      
      if (entry.isDirectory()) {
        searchInDir(fullPath);
      } else if (
        entry.name.endsWith('.js') || 
        entry.name.endsWith('.jsx') || 
        entry.name.endsWith('.ts') || 
        entry.name.endsWith('.tsx')
      ) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (searchPattern.test(content)) {
            const lines = content.split('\n');
            lines.forEach((line, index) => {
              if (searchPattern.test(line)) {
                results.push({
                  file: fullPath,
                  line: index + 1,
                  content: line.trim()
                });
              }
            });
          }
        } catch (error) {
          // 跳过无法读取的文件
        }
      }
    }
  };
  
  searchInDir(process.cwd());
  return results;
};

const results = findPrismaReferences();

if (results.length === 0) {
  console.log('✅ No Prisma references found. Safe to remove Prisma dependencies.\n');
  process.exit(0);
} else {
  console.error('❌ Found Prisma references in the following files:\n');
  results.forEach(result => {
    console.error(`  ${result.file}:${result.line}`);
    console.error(`    ${result.content}\n`);
  });
  console.error(`Total: ${results.length} reference(s) found.`);
  console.error('\n⚠️  Please remove all Prisma references before removing dependencies.\n');
  process.exit(1);
}
