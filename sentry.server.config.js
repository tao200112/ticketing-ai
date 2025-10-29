// Sentry 服务端配置 (Next.js API Routes)
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // 环境配置
  environment: process.env.NODE_ENV,
  
  // 性能监控
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // 错误采样率
  sampleRate: 1.0,
  
  // 调试模式
  debug: process.env.NODE_ENV === 'development',
  
  // 发布版本
  release: process.env.NEXT_PUBLIC_APP_VERSION,
  
  // 集成配置
  integrations: [
    // 自动添加面包屑
    new Sentry.Integrations.Http({ tracing: true }),
  ],
  
  // 忽略的错误
  ignoreErrors: [
    'ECONNRESET',
    'ENOTFOUND',
    'ECONNREFUSED',
  ],
  
  // 过滤敏感数据
  beforeSend(event) {
    // 过滤敏感信息
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    
    // 添加 request_id
    if (event.request?.headers) {
      event.request.headers['x-request-id'] = event.request.headers['x-request-id'] || generateRequestId();
    }
    
    return event;
  },
  
  // 面包屑配置
  beforeBreadcrumb(breadcrumb) {
    // 过滤敏感面包屑
    if (breadcrumb.category === 'http' && breadcrumb.data?.url?.includes('password')) {
      return null;
    }
    return breadcrumb;
  },
});

// 生成 request_id 的工具函数
function generateRequestId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}
