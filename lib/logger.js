/**
 * 统一日志工具
 * 简单的 console 包装，便于后续扩展
 */

const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

class Logger {
  constructor(context = 'App') {
    this.context = context;
  }

  error(message, error = null) {
    console.error(`[${this.context}] ERROR:`, message);
    if (error) {
      console.error('Error details:', error);
    }
  }

  warn(message, data = null) {
    console.warn(`[${this.context}] WARN:`, message);
    if (data) {
      console.warn('Data:', data);
    }
  }

  info(message, data = null) {
    console.info(`[${this.context}] INFO:`, message);
    if (data) {
      console.info('Data:', data);
    }
  }

  debug(message, data = null) {
    console.debug(`[${this.context}] DEBUG:`, message);
    if (data) {
      console.debug('Data:', data);
    }
  }

  // API 请求日志
  apiRequest(method, url, data = null) {
    this.info(`API Request: ${method} ${url}`, data);
  }

  // API 响应日志
  apiResponse(status, message, data = null) {
    const level = status >= 400 ? 'error' : 'info';
    this[level](`API Response: ${status} - ${message}`, data);
  }
}

// 创建默认实例
const logger = new Logger('TicketingApp');

// 创建特定上下文的日志器
export const createLogger = (context) => new Logger(context);

// 导出默认日志器
export default logger;
