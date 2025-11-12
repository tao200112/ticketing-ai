/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint 配置：在构建时完全跳过 ESLint 检查（必须在最前面）
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // TypeScript 配置：在构建时忽略类型错误
  typescript: {
    ignoreBuildErrors: true,
  },
  
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
    // 如果环境变量未设置，使用占位符值以避免构建失败
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
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
}

module.exports = nextConfig
