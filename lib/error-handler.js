/**
 * 统一错误处理工具
 * 目标：告别500，一切错误都"可读、可追踪、可统计"
 */

import { createLogger } from './logger.js'

// 错误类型定义
export const ErrorTypes = {
  // 客户端错误 (4xx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  
  // 服务器错误 (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
}

// 错误代码映射（用于用户友好的消息）
const ERROR_MESSAGES = {
  // 验证错误
  MISSING_FIELDS: '请填写所有必需字段',
  INVALID_EMAIL: '邮箱格式不正确',
  PASSWORD_TOO_SHORT: '密码长度不够，至少需要8个字符',
  PASSWORD_TOO_LONG: '密码长度过长，最多128个字符',
  PASSWORD_MISMATCH: '两次输入的密码不一致',
  INVALID_AGE: '年龄不符合要求（必须年满16岁）',
  INVALID_PHONE: '手机号格式不正确',
  
  // 认证错误
  EMAIL_EXISTS: '该邮箱已被注册',
  USER_NOT_FOUND: '用户不存在',
  INVALID_CREDENTIALS: '邮箱或密码错误',
  TOKEN_EXPIRED: '登录已过期，请重新登录',
  TOKEN_INVALID: '无效的登录令牌',
  
  // 资源错误
  EVENT_NOT_FOUND: '活动不存在',
  TICKET_NOT_FOUND: '票券不存在',
  ORDER_NOT_FOUND: '订单不存在',
  
  // 数据库错误
  REGISTRATION_FAILED: '注册失败，请稍后重试',
  DATABASE_CONNECTION_ERROR: '数据库连接失败',
  DATABASE_QUERY_ERROR: '数据库查询失败',
  
  // 配置错误
  CONFIG_ERROR: '系统配置错误，请联系管理员',
  
  // 通用错误
  INTERNAL_ERROR: '服务器内部错误，请稍后重试',
  NETWORK_ERROR: '网络错误，请检查您的网络连接',
  UNKNOWN_ERROR: '发生未知错误，请联系客服',
}

/**
 * 错误类
 */
export class AppError extends Error {
  constructor(type, code, message, statusCode = 500, details = null, originalError = null) {
    super(message || ERROR_MESSAGES[code] || '发生错误')
    this.name = 'AppError'
    this.type = type
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.originalError = originalError
    this.timestamp = new Date().toISOString()
    this.trackable = true
  }

  /**
   * 转换为API响应格式
   */
  toResponse() {
    return {
      success: false,
      error: this.code,
      message: this.message,
      type: this.type,
      ...(this.details && { details: this.details }),
      ...(process.env.NODE_ENV === 'development' && this.originalError && {
        debug: {
          stack: this.originalError.stack,
          name: this.originalError.name,
        }
      })
    }
  }

  /**
   * 记录错误日志
   */
  log(logger) {
    if (!logger) logger = createLogger('ErrorHandler')
    
    logger.error(this.message, this.originalError, {
      errorType: this.type,
      errorCode: this.code,
      statusCode: this.statusCode,
      details: this.details,
      trackable: this.trackable,
    })
  }
}

/**
 * 错误工厂函数
 */
export class ErrorHandler {
  /**
   * 验证错误 (400)
   */
  static validationError(code, message, details = null) {
    return new AppError(
      ErrorTypes.VALIDATION_ERROR,
      code,
      message || ERROR_MESSAGES[code],
      400,
      details
    )
  }

  /**
   * 认证错误 (401)
   */
  static authenticationError(code, message, details = null) {
    return new AppError(
      ErrorTypes.AUTHENTICATION_ERROR,
      code,
      message || ERROR_MESSAGES[code],
      401,
      details
    )
  }

  /**
   * 授权错误 (403)
   */
  static authorizationError(code = 'FORBIDDEN', message = '没有权限执行此操作') {
    return new AppError(
      ErrorTypes.AUTHORIZATION_ERROR,
      code,
      message,
      403
    )
  }

  /**
   * 未找到错误 (404)
   */
  static notFoundError(code, message) {
    return new AppError(
      ErrorTypes.NOT_FOUND,
      code,
      message || ERROR_MESSAGES[code],
      404
    )
  }

  /**
   * 冲突错误 (409)
   */
  static conflictError(code, message, details = null) {
    return new AppError(
      ErrorTypes.CONFLICT,
      code,
      message || ERROR_MESSAGES[code],
      409,
      details
    )
  }

  /**
   * 数据库错误 (500)
   */
  static databaseError(originalError, code = 'DATABASE_QUERY_ERROR', message = null, details = null) {
    return new AppError(
      ErrorTypes.DATABASE_ERROR,
      code,
      message || ERROR_MESSAGES[code] || '数据库操作失败',
      500,
      details,
      originalError
    )
  }

  /**
   * 配置错误 (500)
   */
  static configurationError(code = 'CONFIG_ERROR', message = null) {
    return new AppError(
      ErrorTypes.CONFIGURATION_ERROR,
      code,
      message || ERROR_MESSAGES[code],
      500
    )
  }

  /**
   * 内部错误 (500)
   */
  static internalError(originalError = null, message = '服务器内部错误') {
    return new AppError(
      ErrorTypes.INTERNAL_ERROR,
      'INTERNAL_ERROR',
      message,
      500,
      null,
      originalError
    )
  }

  /**
   * 从Supabase错误创建应用错误
   */
  static fromSupabaseError(error, defaultCode = 'DATABASE_QUERY_ERROR') {
    // Supabase错误代码映射
    const supabaseErrorMap = {
      '23505': 'EMAIL_EXISTS', // 唯一约束违反
      '23503': 'FOREIGN_KEY_VIOLATION', // 外键约束违反
      '23502': 'NOT_NULL_VIOLATION', // 非空约束违反
      '42P01': 'DATABASE_CONNECTION_ERROR', // 表不存在
      'PGRST116': 'NOT_FOUND', // 未找到记录
    }

    const errorCode = supabaseErrorMap[error.code] || defaultCode
    const isClientError = ['23505', '23503', '23502', 'PGRST116'].includes(error.code)
    
    if (isClientError) {
      // 客户端错误使用4xx状态码
      return ErrorHandler.validationError(
        errorCode,
        ERROR_MESSAGES[errorCode] || error.message,
        { supabaseCode: error.code, supabaseMessage: error.message }
      )
    } else {
      // 服务器错误使用5xx状态码
      return ErrorHandler.databaseError(
        error,
        errorCode,
        ERROR_MESSAGES[errorCode] || '数据库操作失败',
        { supabaseCode: error.code, supabaseMessage: error.message }
      )
    }
  }

  /**
   * 处理并格式化错误为API响应
   */
  static async handleError(error, logger = null) {
    let appError

    if (error instanceof AppError) {
      appError = error
    } else if (error.code && error.code.startsWith('PGRST') || error.code && /^\d{5}$/.test(error.code)) {
      // Supabase错误
      appError = ErrorHandler.fromSupabaseError(error)
    } else {
      // 未知错误
      appError = ErrorHandler.internalError(error)
    }

    // 记录错误
    appError.log(logger)

    return {
      statusCode: appError.statusCode,
      enriched: appError.toResponse()
    }
  }
}

/**
 * Express错误处理中间件
 */
export function errorMiddleware(logger = null) {
  return async (err, req, res, next) => {
    const { statusCode, response } = await ErrorHandler.handleError(err, logger)
    res.status(statusCode).json(response)
  }
}

/**
 * Next.js API错误处理辅助函数
 */
export async function handleApiError(error, request, logger = null) {
  const { NextResponse } = await import('next/server')
  const { statusCode, response } = await ErrorHandler.handleError(error, logger)
  return NextResponse.json(response, { status: statusCode })
}

