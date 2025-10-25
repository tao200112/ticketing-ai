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
  },

  // 线上部署优化配置
  experimental: {
    // 启用服务器组件缓存
    serverComponentsExternalPackages: ['@prisma/client'],
  },

  // 重写规则 - 处理动态路由
  async rewrites() {
    return [
      // 确保事件路由正确重写
      {
        source: '/events/:id',
        destination: '/events/:id',
      },
    ]
  },

  // 错误处理
  async headers() {
    return [
      {
        source: '/events/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, stale-while-revalidate=300',
          },
        ],
      },
    ]
  }
}

module.exports = nextConfig
