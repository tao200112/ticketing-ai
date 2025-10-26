#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 检查 Vercel 部署兼容性...\n');

let issues = [];
let warnings = [];

// 检查必需的文件
const requiredFiles = [
  'package.json',
  'next.config.js',
  'vercel.json',
  'app/layout.js',
  'app/page.js'
];

console.log('📁 检查必需文件:');
requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - 文件不存在`);
    issues.push(`缺少必需文件: ${file}`);
  }
});

// 检查 package.json
console.log('\n📦 检查 package.json:');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// 检查构建脚本
if (packageJson.scripts && packageJson.scripts.build) {
  console.log('  ✅ 构建脚本存在');
} else {
  console.log('  ❌ 缺少构建脚本');
  issues.push('package.json 缺少 build 脚本');
}

// 检查依赖
const requiredDeps = ['next', 'react', 'react-dom'];
requiredDeps.forEach(dep => {
  if (packageJson.dependencies && packageJson.dependencies[dep]) {
    console.log(`  ✅ ${dep} 依赖存在`);
  } else {
    console.log(`  ❌ 缺少 ${dep} 依赖`);
    issues.push(`缺少必需依赖: ${dep}`);
  }
});

// 检查 Next.js 配置
console.log('\n⚙️ 检查 Next.js 配置:');
const nextConfigPath = path.join(process.cwd(), 'next.config.js');
if (fs.existsSync(nextConfigPath)) {
  const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
  
  if (nextConfig.includes('outputFileTracingRoot')) {
    console.log('  ✅ 输出文件跟踪配置存在');
  } else {
    warnings.push('建议配置 outputFileTracingRoot 以优化构建');
  }
  
  if (nextConfig.includes('webpack')) {
    console.log('  ✅ Webpack 配置存在');
  }
  
  if (nextConfig.includes('env')) {
    console.log('  ✅ 环境变量配置存在');
  }
} else {
  console.log('  ❌ next.config.js 不存在');
  issues.push('缺少 next.config.js 文件');
}

// 检查 Vercel 配置
console.log('\n🚀 检查 Vercel 配置:');
const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
if (fs.existsSync(vercelConfigPath)) {
  const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
  
  if (vercelConfig.framework === 'nextjs') {
    console.log('  ✅ Next.js 框架配置正确');
  } else {
    console.log('  ⚠️  框架配置可能不正确');
    warnings.push('Vercel 框架配置可能不正确');
  }
  
  if (vercelConfig.buildCommand) {
    console.log('  ✅ 构建命令配置存在');
  }
  
  if (vercelConfig.headers) {
    console.log('  ✅ 安全头部配置存在');
  }
} else {
  console.log('  ⚠️  vercel.json 不存在，将使用默认配置');
  warnings.push('建议创建 vercel.json 文件以优化部署');
}

// 检查环境变量使用
console.log('\n🔧 检查环境变量使用:');
const appDir = path.join(process.cwd(), 'app');
const libDir = path.join(process.cwd(), 'lib');

function checkEnvUsage(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  files.forEach(file => {
    const filePath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      checkEnvUsage(filePath);
    } else if (file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.jsx') || file.name.endsWith('.tsx')) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 检查是否使用了服务端环境变量
      const serverEnvMatches = content.match(/process\.env\.(?!NEXT_PUBLIC_)[A-Z_]+/g);
      if (serverEnvMatches) {
        console.log(`  ⚠️  ${filePath} 使用了服务端环境变量: ${serverEnvMatches.join(', ')}`);
        warnings.push(`${filePath} 使用了服务端环境变量，在客户端可能无法访问`);
      }
      
      // 检查是否使用了客户端环境变量
      const clientEnvMatches = content.match(/process\.env\.NEXT_PUBLIC_[A-Z_]+/g);
      if (clientEnvMatches) {
        console.log(`  ✅ ${filePath} 正确使用客户端环境变量: ${clientEnvMatches.join(', ')}`);
      }
    }
  });
}

if (fs.existsSync(appDir)) {
  checkEnvUsage(appDir);
}

if (fs.existsSync(libDir)) {
  checkEnvUsage(libDir);
}

// 检查 API 路由
console.log('\n🔌 检查 API 路由:');
const apiRemovedDir = path.join(process.cwd(), 'app/api-removed');
if (fs.existsSync(apiRemovedDir)) {
  console.log('  ✅ API 路由已移动到 api-removed 目录');
} else {
  console.log('  ⚠️  未找到 api-removed 目录');
  warnings.push('建议将旧 API 路由移动到 api-removed 目录');
}

// 检查静态文件
console.log('\n📁 检查静态文件:');
const publicDir = path.join(process.cwd(), 'public');
if (fs.existsSync(publicDir)) {
  console.log('  ✅ public 目录存在');
} else {
  console.log('  ⚠️  public 目录不存在');
  warnings.push('建议创建 public 目录存放静态文件');
}

// 检查构建兼容性
console.log('\n🔨 检查构建兼容性:');
const hasServerComponents = fs.existsSync(path.join(process.cwd(), 'app/layout.js'));
if (hasServerComponents) {
  console.log('  ✅ 使用 App Router (推荐)');
} else {
  console.log('  ⚠️  未检测到 App Router');
  warnings.push('建议使用 Next.js 13+ App Router');
}

// 总结
console.log('\n📊 检查结果:');
if (issues.length === 0) {
  console.log('  ✅ 所有必需检查通过');
  console.log('  ✅ 前端可以成功部署到 Vercel');
} else {
  console.log('  ❌ 发现以下问题:');
  issues.forEach(issue => {
    console.log(`    - ${issue}`);
  });
}

if (warnings.length > 0) {
  console.log('\n⚠️  建议改进:');
  warnings.forEach(warning => {
    console.log(`    - ${warning}`);
  });
}

console.log('\n🚀 Vercel 部署建议:');
console.log('  1. 在 Vercel Dashboard 中设置环境变量');
console.log('  2. 确保 NEXT_PUBLIC_API_URL 指向您的后端服务');
console.log('  3. 配置 Supabase 和 Stripe 的生产环境密钥');
console.log('  4. 测试所有功能是否正常工作');

if (issues.length > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 前端 Vercel 部署检查通过！');
}
