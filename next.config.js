/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  
  // 路径别名配置
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname),
    }
    return config
  },
  
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
  },

  // 线上部署优化配置
  // 注意：serverComponentsExternalPackages 已移动到 serverExternalPackages

  // 简化的配置，避免构建错误
  // 移除可能导致问题的重写规则和头部配置
}

module.exports = nextConfig
