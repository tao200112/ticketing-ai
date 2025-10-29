#!/usr/bin/env node

/**
 * 环境变量设置脚本
 * 用于根据环境自动生成对应的 .env 文件
 */

const fs = require('fs');
const path = require('path');

const environments = {
  local: 'env.local.example',
  preview: 'env.preview.example',
  production: 'env.production.example'
};

function setupEnvironment(env) {
  const templateFile = environments[env];
  const targetFile = '.env';
  
  if (!templateFile) {
    console.error(`❌ 不支持的环境: ${env}`);
    console.log('支持的环境: local, preview, production');
    process.exit(1);
  }

  if (!fs.existsSync(templateFile)) {
    console.error(`❌ 模板文件不存在: ${templateFile}`);
    process.exit(1);
  }

  try {
    // 读取模板文件
    const templateContent = fs.readFileSync(templateFile, 'utf8');
    
    // 写入目标文件
    fs.writeFileSync(targetFile, templateContent);
    
    console.log(`✅ 环境配置已设置: ${env}`);
    console.log(`📁 模板文件: ${templateFile}`);
    console.log(`📁 目标文件: ${targetFile}`);
    console.log('');
    console.log('⚠️  请记得更新 .env 文件中的实际配置值！');
    
  } catch (error) {
    console.error(`❌ 设置环境配置失败:`, error.message);
    process.exit(1);
  }
}

// 主函数
function main() {
  const env = process.argv[2] || 'local';
  
  console.log('🚀 环境变量设置工具');
  console.log('==================');
  
  setupEnvironment(env);
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { setupEnvironment };
