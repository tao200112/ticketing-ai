/**
 * 统一结构化日志工具（服务端专用）
 * 
 * 特性：
 * - 统一字段格式
 * - 敏感信息过滤
 * - 开始/结束日志
 * - 一行 JSON 输出
 */

// 敏感字段过滤配置
const SENSITIVE_FIELDS = [
  'password', 'token', 'key', 'secret', 'authorization', 'cookie',
  'session', 'auth', 'credential', 'private', 'sensitive',
  'stripe_secret', 'supabase_service_role', 'api_key',
  'email', 'phone', 'ssn', 'credit_card', 'card_number'
]

// 日志级别
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn', 
  INFO: 'info',
  DEBUG: 'debug'
}

/**
 * 过滤敏感信息
 */
function sanitizeData(data) {
  if (!data || typeof data !== 'object') {
    return data
  }

  const sanitized = {}
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase()
    const isSensitive = SENSITIVE_FIELDS.some(field => 
      lowerKey.includes(field) || field.includes(lowerKey)
    )
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

/**
 * 生成请求 ID
 */
function generateRequestId() {
  return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

/**
 * 统一日志格式
 */
function formatLog(level, fn, data = {}) {
  const logEntry = {
    ts: new Date().toISOString(),
    level,
    fn,
    requestId: data.requestId || generateRequestId(),
    duration_ms: data.duration_ms || null,
    sessionId: data.sessionId ? data.sessionId.substring(0, 8) + '...' : null,
    eventId: data.eventId || null,
    userId: data.userId ? data.userId.substring(0, 8) + '...' : null,
    supabaseError: data.supabaseError ? {
      code: data.supabaseError.code,
      message: data.supabaseError.message
    } : null,
    http: data.http ? {
      status: data.http.status,
      method: data.http.method,
      url: data.http.url
    } : null,
    needs_attention: data.needs_attention || false,
    message: data.message || '',
    ...sanitizeData(data.metadata || {})
  }

  // 移除 null 值
  Object.keys(logEntry).forEach(key => {
    if (logEntry[key] === null || logEntry[key] === undefined) {
      delete logEntry[key]
    }
  })

  return logEntry
}

/**
 * 日志工具类
 */
class Logger {
  constructor(fn) {
    this.fn = fn
    this.startTime = Date.now()
  }

  /**
   * 开始日志
   */
  start(data = {}) {
    const logEntry = formatLog(LOG_LEVELS.INFO, this.fn, {
      ...data,
      message: `Starting ${this.fn}`,
      action: 'start'
    })
    
    console.log(JSON.stringify(logEntry))
    return logEntry.requestId
  }

  /**
   * 结束日志
   */
  end(data = {}) {
    const duration = Date.now() - this.startTime
    const logEntry = formatLog(LOG_LEVELS.INFO, this.fn, {
      ...data,
      duration_ms: duration,
      message: `Completed ${this.fn}`,
      action: 'end'
    })
    
    console.log(JSON.stringify(logEntry))
    return logEntry
  }

  /**
   * 信息日志
   */
  info(message, data = {}) {
    const logEntry = formatLog(LOG_LEVELS.INFO, this.fn, {
      ...data,
      message,
      action: 'info'
    })
    
    console.log(JSON.stringify(logEntry))
    return logEntry
  }

  /**
   * 警告日志
   */
  warn(message, data = {}) {
    const logEntry = formatLog(LOG_LEVELS.WARN, this.fn, {
      ...data,
      message,
      action: 'warn'
    })
    
    console.log(JSON.stringify(logEntry))
    return logEntry
  }

  /**
   * 错误日志
   */
  error(message, error = null, data = {}) {
    const logEntry = formatLog(LOG_LEVELS.ERROR, this.fn, {
      ...data,
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null,
      needs_attention: true,
      action: 'error'
    })
    
    console.log(JSON.stringify(logEntry))
    return logEntry
  }

  /**
   * 成功日志
   */
  success(message, data = {}) {
    const logEntry = formatLog(LOG_LEVELS.INFO, this.fn, {
      ...data,
      message,
      action: 'success'
    })
    
    console.log(JSON.stringify(logEntry))
    return logEntry
  }
}

/**
 * 创建日志实例
 */
export function createLogger(fn) {
  return new Logger(fn)
}

/**
 * 快速日志方法
 */
export const log = {
  info: (fn, message, data = {}) => {
    const logger = new Logger(fn)
    return logger.info(message, data)
  },
  
  warn: (fn, message, data = {}) => {
    const logger = new Logger(fn)
    return logger.warn(message, data)
  },
  
  error: (fn, message, error = null, data = {}) => {
    const logger = new Logger(fn)
    return logger.error(message, error, data)
  },
  
  success: (fn, message, data = {}) => {
    const logger = new Logger(fn)
    return logger.success(message, data)
  }
}

/**
 * 生成请求 ID
 */
export { generateRequestId }

/**
 * 敏感信息过滤
 */
export { sanitizeData }
