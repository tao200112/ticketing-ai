#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 验证基础设施配置...\n');

// 检查必需的文件
const requiredFiles = [
  '.github/workflows/ci.yml',
  '.github/workflows/cd.yml',
  'Dockerfile.frontend',
  'Dockerfile.backend',
  'docker-compose.yml',
  'docker-compose.prod.yml',
  'jest.config.js',
  'jest.setup.js',
  'nginx/nginx.conf',
  'nginx/nginx.prod.conf',
  'k8s/staging/namespace.yaml',
  'k8s/staging/frontend-deployment.yaml',
  'k8s/staging/backend-deployment.yaml',
  '.prettierrc',
  '.prettierignore',
  'env.example'
];

let allFilesExist = true;

console.log('📁 检查必需文件:');
requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - 文件不存在`);
    allFilesExist = false;
  }
});

// 检查 Docker 配置
console.log('\n🐳 检查 Docker 配置:');
const dockerFiles = ['Dockerfile.frontend', 'Dockerfile.backend', 'docker-compose.yml'];
dockerFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('FROM node:') && content.includes('WORKDIR')) {
      console.log(`  ✅ ${file} - 配置正确`);
    } else {
      console.log(`  ⚠️  ${file} - 配置可能不完整`);
    }
  }
});

// 检查 CI/CD 配置
console.log('\n🚀 检查 CI/CD 配置:');
const ciFile = path.join(process.cwd(), '.github/workflows/ci.yml');
if (fs.existsSync(ciFile)) {
  const content = fs.readFileSync(ciFile, 'utf8');
  if (content.includes('test') && content.includes('build')) {
    console.log('  ✅ CI 配置正确');
  } else {
    console.log('  ⚠️  CI 配置可能不完整');
  }
}

const cdFile = path.join(process.cwd(), '.github/workflows/cd.yml');
if (fs.existsSync(cdFile)) {
  const content = fs.readFileSync(cdFile, 'utf8');
  if (content.includes('deploy') && content.includes('staging')) {
    console.log('  ✅ CD 配置正确');
  } else {
    console.log('  ⚠️  CD 配置可能不完整');
  }
}

// 检查测试配置
console.log('\n🧪 检查测试配置:');
const jestFile = path.join(process.cwd(), 'jest.config.js');
if (fs.existsSync(jestFile)) {
  const content = fs.readFileSync(jestFile, 'utf8');
  if (content.includes('testEnvironment') && content.includes('setupFilesAfterEnv')) {
    console.log('  ✅ Jest 配置正确');
  } else {
    console.log('  ⚠️  Jest 配置可能不完整');
  }
}

// 检查环境变量模板
console.log('\n🔧 检查环境变量配置:');
const envFile = path.join(process.cwd(), 'env.example');
if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, 'utf8');
  const requiredVars = ['NODE_ENV', 'SUPABASE_URL', 'JWT_SECRET', 'STRIPE_SECRET_KEY'];
  const missingVars = requiredVars.filter(varName => !content.includes(varName));
  
  if (missingVars.length === 0) {
    console.log('  ✅ 环境变量配置完整');
  } else {
    console.log(`  ⚠️  缺少环境变量: ${missingVars.join(', ')}`);
  }
}

// 总结
console.log('\n📊 验证结果:');
if (allFilesExist) {
  console.log('  ✅ 所有必需文件都存在');
  console.log('  ✅ 基础设施配置验证通过');
  console.log('\n🎉 基础设施准备完成！');
} else {
  console.log('  ❌ 部分文件缺失，请检查配置');
  console.log('\n⚠️  请修复上述问题后重新运行验证');
  process.exit(1);
}
