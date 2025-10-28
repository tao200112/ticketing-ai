#!/usr/bin/env node

const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 全面系统诊断开始...\n');

// 测试函数
async function testEndpoint(url, description) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const success = res.statusCode >= 200 && res.statusCode < 300;
        console.log(`  ${success ? '✅' : '❌'} ${description} - 状态: ${res.statusCode}`);
        resolve({ success, status: res.statusCode, data });
      });
    });
    
    req.on('error', (error) => {
      console.log(`  ❌ ${description} - 错误: ${error.message}`);
      resolve({ success: false, error: error.message });
    });
    
    req.setTimeout(5000, () => {
      console.log(`  ⏰ ${description} - 超时`);
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
  });
}

// 检查文件是否存在
function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${description} - 存在`);
    return true;
  } else {
    console.log(`  ❌ ${description} - 缺失`);
    return false;
  }
}

// 检查目录是否存在
function checkDirectory(dirPath, description) {
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    console.log(`  ✅ ${description} - 存在`);
    return true;
  } else {
    console.log(`  ❌ ${description} - 缺失`);
    return false;
  }
}

// 诊断后端
async function diagnoseBackend() {
  console.log('🔧 诊断后端服务:');
  
  // 检查后端文件
  checkFile('backend/server.js', '后端服务器文件');
  checkFile('backend/package.json', '后端 package.json');
  checkFile('backend/load-env.js', '环境变量加载文件');
  
  // 测试后端端点
  await testEndpoint('http://localhost:3001/', '后端根路径');
  await testEndpoint('http://localhost:3001/health', '后端健康检查');
  await testEndpoint('http://localhost:3001/v1/health', '后端 API 健康检查');
  await testEndpoint('http://localhost:3001/v1/events', '后端活动 API');
  
  console.log('');
}

// 诊断前端
async function diagnoseFrontend() {
  console.log('🌐 诊断前端服务:');
  
  // 检查前端文件
  checkFile('package.json', '前端 package.json');
  checkFile('next.config.js', 'Next.js 配置');
  checkFile('app/layout.js', '前端布局文件');
  checkFile('app/page.js', '前端首页');
  checkDirectory('.next', 'Next.js 构建目录');
  
  // 测试前端端点
  await testEndpoint('http://localhost:3000/', '前端首页');
  await testEndpoint('http://localhost:3000/auth/login', '前端登录页面');
  await testEndpoint('http://localhost:3000/auth/register', '前端注册页面');
  await testEndpoint('http://localhost:3000/events', '前端活动页面');
  
  console.log('');
}

// 诊断数据库连接
async function diagnoseDatabase() {
  console.log('🗄️ 诊断数据库连接:');
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const SUPABASE_URL = 'https://htaqcvnyipiqdbmvvfvj.supabase.co';
    const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YXFjdm55aXBpcWRibXZ2ZnZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA3NjA5OCwiZXhwIjoyMDc2NjUyMDk4fQ.84ZGW8t9veGNDJwvy-grFeOa67jtsp1UMLFRcw5hEKM';
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // 测试数据库连接
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log(`  ❌ 数据库连接失败: ${error.message}`);
    } else {
      console.log(`  ✅ 数据库连接正常`);
    }
    
  } catch (error) {
    console.log(`  ❌ 数据库连接异常: ${error.message}`);
  }
  
  console.log('');
}

// 修复建议
function provideFixes() {
  console.log('🔧 修复建议:');
  console.log('');
  
  console.log('1. 启动前端服务:');
  console.log('   npm run dev');
  console.log('');
  
  console.log('2. 如果前端启动失败，重新构建:');
  console.log('   Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue');
  console.log('   npm run build');
  console.log('   npm start');
  console.log('');
  
  console.log('3. 启动后端服务:');
  console.log('   cd backend');
  console.log('   node server.js');
  console.log('');
  
  console.log('4. 检查端口占用:');
  console.log('   netstat -ano | findstr ":300"');
  console.log('');
  
  console.log('5. 停止所有 Node.js 进程:');
  console.log('   Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue');
  console.log('');
}

// 主诊断函数
async function runDiagnosis() {
  console.log('🚀 开始全面系统诊断...\n');
  
  await diagnoseBackend();
  await diagnoseFrontend();
  await diagnoseDatabase();
  
  provideFixes();
  
  console.log('✅ 诊断完成！');
}

// 运行诊断
if (require.main === module) {
  runDiagnosis().then(() => {
    process.exit(0);
  });
}

module.exports = { runDiagnosis, testEndpoint };
