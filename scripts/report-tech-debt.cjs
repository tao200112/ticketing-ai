#!/usr/bin/env node

/**
 * 技术债扫描工具
 * 扫描 localStorage/sessionStorage 使用、调试路由、Service Role 使用
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Scanning technical debt...\n');

// 扫描结果
const report = {
  localStorage: [],
  sessionStorage: [],
  debugRoutes: [],
  serviceRoleUsage: [],
  prismaUsage: []
};

// 文件类型模式
const filePatterns = ['.js', '.jsx', '.ts', '.tsx'];
const excludeDirs = ['node_modules', '.next', '.git', 'prisma'];

const scanFile = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const relativePath = path.relative(process.cwd(), filePath);
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // 扫描 localStorage
      if (/localStorage\.(getItem|setItem|removeItem|clear)/.test(line)) {
        report.localStorage.push({
          file: relativePath,
          line: lineNum,
          code: line.trim()
        });
      }
      
      // 扫描 sessionStorage
      if (/sessionStorage\.(getItem|setItem|removeItem|clear)/.test(line)) {
        report.sessionStorage.push({
          file: relativePath,
          line: lineNum,
          code: line.trim()
        });
      }
      
      // 扫描 Service Role Key 使用
      if (/SUPABASE_SERVICE_ROLE_KEY/.test(line) && !/process\.env\.SUPABASE_SERVICE_ROLE_KEY/.test(line)) {
        report.serviceRoleUsage.push({
          file: relativePath,
          line: lineNum,
          code: line.trim()
        });
      }
      
      // 扫描 Prisma 引用
      if (/@prisma\/client|from.*['"]prisma['"]|PrismaClient/.test(line)) {
        report.prismaUsage.push({
          file: relativePath,
          line: lineNum,
          code: line.trim()
        });
      }
    });
  } catch (error) {
    // 跳过无法读取的文件
  }
};

const scanDirectory = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    // 跳过排除目录
    if (excludeDirs.includes(entry.name)) {
      continue;
    }
    
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (filePatterns.some(pattern => entry.name.endsWith(pattern))) {
      scanFile(fullPath);
    }
  }
};

// 扫描调试路由
const findDebugRoutes = () => {
  const appDir = path.join(process.cwd(), 'app');
  
  if (!fs.existsSync(appDir)) {
    return;
  }
  
  const entries = fs.readdirSync(appDir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const dirName = entry.name.toLowerCase();
    
    // 检测调试路由
    if (dirName.startsWith('debug-') || 
        dirName.startsWith('fix-') || 
        dirName === 'debug' ||
        (dirName === 'admin' && fs.existsSync(path.join(entry.path, entry.name, 'fix-production-data')))) {
      
      report.debugRoutes.push({
        route: `/${entry.name}`,
        path: path.join('app', entry.name)
      });
    }
  }
};

// 执行扫描
scanDirectory(process.cwd());
findDebugRoutes();

// 输出报告
console.log('📊 Technical Debt Report\n');
console.log('=' .repeat(80));

// localStorage 使用
console.log(`\n📦 localStorage usage: ${report.localStorage.length} occurrences`);
if (report.localStorage.length > 0) {
  console.log('\nTop 10 files with localStorage usage:');
  const fileCounts = {};
  report.localStorage.forEach(item => {
    fileCounts[item.file] = (fileCounts[item.file] || 0) + 1;
  });
  Object.entries(fileCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([file, count]) => {
      console.log(`  ${file}: ${count} usage(s)`);
    });
}

// sessionStorage 使用
console.log(`\n📦 sessionStorage usage: ${report.sessionStorage.length} occurrences`);
if (report.sessionStorage.length > 0) {
  console.log('\nFiles with sessionStorage usage:');
  [...new Set(report.sessionStorage.map(item => item.file))].forEach(file => {
    console.log(`  ${file}`);
  });
}

// 调试路由
console.log(`\n🛠️  Debug routes found: ${report.debugRoutes.length}`);
if (report.debugRoutes.length > 0) {
  report.debugRoutes.forEach(route => {
    console.log(`  ${route.route} (${route.path})`);
  });
}

// Prisma 引用
console.log(`\n🗄️  Prisma usage: ${report.prismaUsage.length} occurrences`);
if (report.prismaUsage.length > 0) {
  console.log('\nFiles with Prisma references:');
  [...new Set(report.prismaUsage.map(item => item.file))].forEach(file => {
    console.log(`  ${file}`);
  });
}

// Service Role 使用
console.log(`\n🔐 Service Role Key usage: ${report.serviceRoleUsage.length} occurrences`);
if (report.serviceRoleUsage.length > 0) {
  console.log('\nFiles with Service Role Key usage:');
  [...new Set(report.serviceRoleUsage.map(item => item.file))].forEach(file => {
    console.log(`  ${file}`);
  });
}

console.log('\n' + '='.repeat(80));
console.log('\n✅ Scan completed\n');

// 如果发现关键问题，返回警告
if (report.prismaUsage.length > 0) {
  console.log('⚠️  Warning: Prisma references found. Run `npm run check:prisma` for details.\n');
  process.exit(1);
}

process.exit(0);
