#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 验证前后端分离状态...\n');

// 检查前后端分离的关键文件
const separationFiles = [
  // 后端服务文件
  'backend/server.js',
  'backend/package.json',
  
  // API 客户端文件
  'lib/api-client.js',
  'lib/auth-context.js',
  'lib/hooks/use-api.js',
  
  // 配置文件
  'env.example',
  'docker-compose.yml',
  'docker-compose.prod.yml',
];

// 检查前端是否还在调用 Next.js API
const frontendFiles = [
  'app/page.js',
  'app/layout.js',
  'app/account/page.js',
  'app/events/page.js',
  'app/auth/login/page.js',
];

let separationStatus = true;
let issues = [];

console.log('📁 检查前后端分离文件:');
separationFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - 文件不存在`);
    separationStatus = false;
    issues.push(`缺少文件: ${file}`);
  }
});

console.log('\n🔍 检查前端 API 调用:');
frontendFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 检查是否还在调用 Next.js API
    if (content.includes("fetch('/api/") || content.includes("fetch(\"/api/")) {
      console.log(`  ⚠️  ${file} - 仍在调用 Next.js API`);
      separationStatus = false;
      issues.push(`${file} 仍在调用 Next.js API`);
    } else if (content.includes('useEvents') || content.includes('apiClient')) {
      console.log(`  ✅ ${file} - 使用新的 API 客户端`);
    } else {
      console.log(`  ℹ️  ${file} - 无需 API 调用`);
    }
  }
});

console.log('\n🔍 检查 API 路由状态:');
const apiDir = path.join(process.cwd(), 'app/api');
const apiRemovedDir = path.join(process.cwd(), 'app/api-removed');

if (fs.existsSync(apiDir) && fs.readdirSync(apiDir).length > 0) {
  console.log('  ❌ 原始 API 路由目录 app/api 仍存在且包含文件');
  separationStatus = false;
  issues.push('原始 API 路由仍存在');
} else if (fs.existsSync(apiRemovedDir) && fs.readdirSync(apiRemovedDir).length > 0) {
  console.log('  ✅ API 路由已移动到 api-removed 目录');
} else {
  console.log('  ✅ 原始 API 路由目录 app/api 已清空或移除');
}

console.log('\n🔍 检查后端服务配置:');
const backendServer = path.join(process.cwd(), 'backend/server.js');
if (fs.existsSync(backendServer)) {
  const content = fs.readFileSync(backendServer, 'utf8');
  
  if (content.includes('express') && content.includes('supabase') && content.includes('jwt')) {
    console.log('  ✅ 后端服务配置完整');
  } else {
    console.log('  ⚠️  后端服务配置不完整');
    separationStatus = false;
    issues.push('后端服务配置不完整');
  }
} else {
  console.log('  ❌ 后端服务文件不存在');
  separationStatus = false;
  issues.push('后端服务文件不存在');
}

console.log('\n🔍 检查 API 客户端配置:');
const apiClient = path.join(process.cwd(), 'lib/api-client.js');
if (fs.existsSync(apiClient)) {
  const content = fs.readFileSync(apiClient, 'utf8');
  
  if (content.includes('API_BASE_URL') && content.includes('apiClient') && content.includes('Bearer')) {
    console.log('  ✅ API 客户端配置完整');
  } else {
    console.log('  ⚠️  API 客户端配置不完整');
    separationStatus = false;
    issues.push('API 客户端配置不完整');
  }
} else {
  console.log('  ❌ API 客户端文件不存在');
  separationStatus = false;
  issues.push('API 客户端文件不存在');
}

console.log('\n🔍 检查认证上下文:');
const authContext = path.join(process.cwd(), 'lib/auth-context.js');
if (fs.existsSync(authContext)) {
  const content = fs.readFileSync(authContext, 'utf8');
  
  if (content.includes('AuthProvider') && content.includes('useAuth') && content.includes('login')) {
    console.log('  ✅ 认证上下文配置完整');
  } else {
    console.log('  ⚠️  认证上下文配置不完整');
    separationStatus = false;
    issues.push('认证上下文配置不完整');
  }
} else {
  console.log('  ❌ 认证上下文文件不存在');
  separationStatus = false;
  issues.push('认证上下文文件不存在');
}

// 总结
console.log('\n📊 分离状态总结:');
if (separationStatus) {
  console.log('  ✅ 前后端分离基本完成');
  console.log('  ✅ 前端使用新的 API 客户端');
  console.log('  ✅ 后端服务独立运行');
  console.log('  ✅ API 路由已移除');
  console.log('\n🎉 前后端分离验证通过！');
} else {
  console.log('  ❌ 前后端分离未完成');
  console.log('\n⚠️  发现的问题:');
  issues.forEach(issue => {
    console.log(`    - ${issue}`);
  });
  console.log('\n🔧 请修复上述问题后重新运行验证');
  process.exit(1);
}
