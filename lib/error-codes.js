/**
 * 错误码字典 - 最小集版本
 * 用于统一错误处理和监控
 */

// 错误码分类
export const ERROR_CATEGORIES = {
  AUTHENTICATION: 'AUTH',
  AUTHORIZATION: 'AUTHZ', 
  VALIDATION: 'VALID',
  DATABASE: 'DB',
  EXTERNAL_API: 'API',
  BUSINESS_LOGIC: 'BIZ',
  SYSTEM: 'SYS'
};

// 错误严重级别
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// 错误码定义
export const ERROR_CODES = {
  // 认证错误 (AUTH_*)
  AUTH_001: {
    code: 'AUTH_001',
    message: '用户未登录',
    category: ERROR_CATEGORIES.AUTHENTICATION,
    severity: ERROR_SEVERITY.MEDIUM,
    httpStatus: 401
  },
  AUTH_002: {
    code: 'AUTH_002', 
    message: '登录凭据无效',
    category: ERROR_CATEGORIES.AUTHENTICATION,
    severity: ERROR_SEVERITY.MEDIUM,
    httpStatus: 401
  },
  AUTH_003: {
    code: 'AUTH_003',
    message: '登录凭据已过期',
    category: ERROR_CATEGORIES.AUTHENTICATION,
    severity: ERROR_SEVERITY.MEDIUM,
    httpStatus: 401
  },
  AUTH_004: {
    code: 'AUTH_004',
    message: '请求过于频繁，请稍后再试',
    category: ERROR_CATEGORIES.AUTHENTICATION,
    severity: ERROR_SEVERITY.LOW,
    httpStatus: 429
  },
  AUTH_005: {
    code: 'AUTH_005',
    message: '邮箱已验证',
    category: ERROR_CATEGORIES.AUTHENTICATION,
    severity: ERROR_SEVERITY.LOW,
    httpStatus: 400
  },
  AUTH_006: {
    code: 'AUTH_006',
    message: '需要验证邮箱',
    category: ERROR_CATEGORIES.AUTHENTICATION,
    severity: ERROR_SEVERITY.HIGH,
    httpStatus: 403
  },

  // 授权错误 (AUTHZ_*)
  AUTHZ_001: {
    code: 'AUTHZ_001',
    message: '权限不足',
    category: ERROR_CATEGORIES.AUTHORIZATION,
    severity: ERROR_SEVERITY.HIGH,
    httpStatus: 403
  },
  AUTHZ_002: {
    code: 'AUTHZ_002',
    message: '资源访问被拒绝',
    category: ERROR_CATEGORIES.AUTHORIZATION,
    severity: ERROR_SEVERITY.HIGH,
    httpStatus: 403
  },

  // 验证错误 (VALID_*)
  VALID_001: {
    code: 'VALID_001',
    message: '请求参数无效',
    category: ERROR_CATEGORIES.VALIDATION,
    severity: ERROR_SEVERITY.LOW,
    httpStatus: 400
  },
  VALID_002: {
    code: 'VALID_002',
    message: '必填字段缺失',
    category: ERROR_CATEGORIES.VALIDATION,
    severity: ERROR_SEVERITY.LOW,
    httpStatus: 400
  },
  VALID_003: {
    code: 'VALID_003',
    message: '数据格式不正确',
    category: ERROR_CATEGORIES.VALIDATION,
    severity: ERROR_SEVERITY.LOW,
    httpStatus: 400
  },

  // 数据库错误 (DB_*)
  DB_001: {
    code: 'DB_001',
    message: '数据库连接失败',
    category: ERROR_CATEGORIES.DATABASE,
    severity: ERROR_SEVERITY.CRITICAL,
    httpStatus: 500
  },
  DB_002: {
    code: 'DB_002',
    message: '查询执行失败',
    category: ERROR_CATEGORIES.DATABASE,
    severity: ERROR_SEVERITY.HIGH,
    httpStatus: 500
  },
  DB_003: {
    code: 'DB_003',
    message: '数据不存在',
    category: ERROR_CATEGORIES.DATABASE,
    severity: ERROR_SEVERITY.MEDIUM,
    httpStatus: 404
  },

  // 外部API错误 (API_*)
  API_001: {
    code: 'API_001',
    message: '外部服务调用失败',
    category: ERROR_CATEGORIES.EXTERNAL_API,
    severity: ERROR_SEVERITY.HIGH,
    httpStatus: 502
  },
  API_002: {
    code: 'API_002',
    message: '外部服务超时',
    category: ERROR_CATEGORIES.EXTERNAL_API,
    severity: ERROR_SEVERITY.HIGH,
    httpStatus: 504
  },
  API_003: {
    code: 'API_003',
    message: '支付服务错误',
    category: ERROR_CATEGORIES.EXTERNAL_API,
    severity: ERROR_SEVERITY.CRITICAL,
    httpStatus: 502
  },

  // 业务逻辑错误 (BIZ_*)
  BIZ_001: {
    code: 'BIZ_001',
    message: '活动不存在',
    category: ERROR_CATEGORIES.BUSINESS_LOGIC,
    severity: ERROR_SEVERITY.MEDIUM,
    httpStatus: 404
  },
  BIZ_002: {
    code: 'BIZ_002',
    message: '活动已结束',
    category: ERROR_CATEGORIES.BUSINESS_LOGIC,
    severity: ERROR_SEVERITY.MEDIUM,
    httpStatus: 400
  },
  BIZ_003: {
    code: 'BIZ_003',
    message: '票已售罄',
    category: ERROR_CATEGORIES.BUSINESS_LOGIC,
    severity: ERROR_SEVERITY.MEDIUM,
    httpStatus: 400
  },

  // 系统错误 (SYS_*)
  SYS_001: {
    code: 'SYS_001',
    message: '内部服务器错误',
    category: ERROR_CATEGORIES.SYSTEM,
    severity: ERROR_SEVERITY.CRITICAL,
    httpStatus: 500
  },
  SYS_002: {
    code: 'SYS_002',
    message: '服务暂时不可用',
    category: ERROR_CATEGORIES.SYSTEM,
    severity: ERROR_SEVERITY.HIGH,
    httpStatus: 503
  }
};

// 根据错误码获取错误信息
export function getErrorInfo(errorCode) {
  return ERROR_CODES[errorCode] || {
    code: 'UNKNOWN',
    message: '未知错误',
    category: ERROR_CATEGORIES.SYSTEM,
    severity: ERROR_SEVERITY.MEDIUM,
    httpStatus: 500
  };
}

// 创建标准化错误对象
export function createError(errorCode, details = {}, originalError = null) {
  const errorInfo = getErrorInfo(errorCode);
  
  const error = new Error(errorInfo.message);
  error.code = errorInfo.code;
  error.category = errorInfo.category;
  error.severity = errorInfo.severity;
  error.httpStatus = errorInfo.httpStatus;
  error.details = details;
  error.timestamp = new Date().toISOString();
  
  if (originalError) {
    error.originalError = originalError.message;
    error.stack = originalError.stack;
  }
  
  return error;
}

// 错误码验证
export function isValidErrorCode(code) {
  return Object.keys(ERROR_CODES).includes(code);
}
