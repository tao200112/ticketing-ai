/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ['@prisma/client'],
  
  // 环境变量配置
  env: {
    // 构建时注入版本信息
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || 'dev',
    NEXT_PUBLIC_GIT_SHA: process.env.NEXT_PUBLIC_GIT_SHA || 'unknown',
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  
  // 构建时生成版本信息
  generateBuildId: async () => {
    // 尝试获取 Git SHA
    try {
      const { execSync } = require('child_process');
      const gitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      return gitSha.substring(0, 8);
    } catch (error) {
      console.warn('无法获取 Git SHA，使用时间戳作为构建 ID');
      return Date.now().toString();
    }
  }
}

module.exports = nextConfig
