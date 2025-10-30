/**
 * Unified Error Handler
 * Goal: No more 500 errors, all errors are "readable, traceable, and countable"
 */

import { createLogger } from './logger.js'

// Error type definitions
export const ErrorTypes = {
  // Client errors (4xx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  
  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
}

// Error code mappings (for user-friendly messages)
const ERROR_MESSAGES = {
  // Validation errors
  MISSING_FIELDS: 'Please fill in all required fields',
  INVALID_EMAIL: 'Invalid email format',
  PASSWORD_TOO_SHORT: 'Password is too short, must be at least 8 characters',
  PASSWORD_TOO_LONG: 'Password is too long, maximum 128 characters',
  PASSWORD_MISMATCH: 'Passwords do not match',
  INVALID_AGE: 'Age requirement not met (must be 16 or older)',
  INVALID_PHONE: 'Invalid phone number format',
  
  // Authentication errors
  EMAIL_EXISTS: 'This email is already registered',
  USER_NOT_FOUND: 'User not found',
  INVALID_CREDENTIALS: 'Invalid email or password',
  TOKEN_EXPIRED: 'Login expired, please log in again',
  TOKEN_INVALID: 'Invalid login token',
  
  // Resource errors
  EVENT_NOT_FOUND: 'Event not found',
  TICKET_NOT_FOUND: 'Ticket not found',
  ORDER_NOT_FOUND: 'Order not found',
  
  // Database errors
  REGISTRATION_FAILED: 'Registration failed, please try again later',
  DATABASE_CONNECTION_ERROR: 'Database connection failed',
  DATABASE_QUERY_ERROR: 'Database query failed',
  
  // Configuration errors
  CONFIG_ERROR: 'System configuration error, please contact administrator',
  
  // General errors
  INTERNAL_ERROR: 'Internal server error, please try again later',
  NETWORK_ERROR: 'Network error, please check your connection',
  UNKNOWN_ERROR: 'An unknown error occurred, please contact support',
}

/**
 * Error class
 */
export class AppError extends Error {
  constructor(type, code, message, statusCode = 500, details = null, originalError = null) {
    super(message || ERROR_MESSAGES[code] || 'An error occurred')
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
   * Convert to API response format
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
   * Log error
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
 * Error factory functions
 */
export class ErrorHandler {
  /**
   * Validation error (400)
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
   * Authentication error (401)
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
   * Authorization error (403)
   */
  static authorizationError(code = 'FORBIDDEN', message = 'You do not have permission to perform this action') {
    return new AppError(
      ErrorTypes.AUTHORIZATION_ERROR,
      code,
      message,
      403
    )
  }

  /**
   * Not found error (404)
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
   * Conflict error (409)
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
   * Database error (500)
   */
  static databaseError(originalError, code = 'DATABASE_QUERY_ERROR', message = null, details = null) {
    return new AppError(
      ErrorTypes.DATABASE_ERROR,
      code,
      message || ERROR_MESSAGES[code] || 'Database operation failed',
      500,
      details,
      originalError
    )
  }

  /**
   * Configuration error (500)
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
   * Internal error (500)
   */
  static internalError(originalError = null, message = 'Internal server error') {
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
   * Create app error from Supabase error
   */
  static fromSupabaseError(error, defaultCode = 'DATABASE_QUERY_ERROR') {
    // Supabase error code mappings
    const supabaseErrorMap = {
      '23505': 'EMAIL_EXISTS', // Unique constraint violation
      '23503': 'FOREIGN_KEY_VIOLATION', // Foreign key constraint violation
      '23502': 'NOT_NULL_VIOLATION', // Not null constraint violation
      '42P01': 'DATABASE_CONNECTION_ERROR', // Table does not exist
      'PGRST116': 'NOT_FOUND', // Record not found
    }

    const errorCode = supabaseErrorMap[error.code] || defaultCode
    const isClientError = ['23505', '23503', '23502', 'PGRST116'].includes(error.code)
    
    if (isClientError) {
      // Client errors use 4xx status codes
      return ErrorHandler.validationError(
        errorCode,
        ERROR_MESSAGES[errorCode] || error.message,
        { supabaseCode: error.code, supabaseMessage: error.message }
      )
    } else {
      // Server errors use 5xx status codes
      return ErrorHandler.databaseError(
        error,
        errorCode,
        ERROR_MESSAGES[errorCode] || 'Database operation failed',
        { supabaseCode: error.code, supabaseMessage: error.message }
      )
    }
  }

  /**
   * Handle and format error as API response
   */
  static async handleError(error, logger = null) {
    let appError

    if (error instanceof AppError) {
      appError = error
    } else if (error.code && (error.code.startsWith('PGRST') || /^\d{5}$/.test(error.code))) {
      // Supabase error
      appError = ErrorHandler.fromSupabaseError(error)
    } else {
      // Unknown error
      appError = ErrorHandler.internalError(error)
    }

    // Log error
    appError.log(logger)

    return {
      statusCode: appError.statusCode,
      response: appError.toResponse()
    }
  }
}

/**
 * Express error handling middleware
 */
export function errorMiddleware(logger = null) {
  return async (err, req, res, next) => {
    const { statusCode, response } = await ErrorHandler.handleError(err, logger)
    res.status(statusCode).json(response)
  }
}

/**
 * Next.js API error handling helper function
 */
export async function handleApiError(error, request, logger = null) {
  const { NextResponse } = await import('next/server')
  const { statusCode, response } = await ErrorHandler.handleError(error, logger)
  return NextResponse.json(response, { status: statusCode })
}
