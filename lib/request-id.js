/**
 * Request ID 中间件和工具函数
 * 用于在请求链路中透传 request_id
 */

import { v4 as uuidv4 } from 'uuid';

// 生成 request_id
export function generateRequestId() {
  return uuidv4();
}

// 获取当前请求的 request_id
export function getCurrentRequestId() {
  if (typeof window !== 'undefined') {
    // 客户端
    return window.__REQUEST_ID__ || generateRequestId();
  } else {
    // 服务端
    return global.__REQUEST_ID__ || generateRequestId();
  }
}

// 设置当前请求的 request_id
export function setCurrentRequestId(requestId) {
  if (typeof window !== 'undefined') {
    // 客户端
    window.__REQUEST_ID__ = requestId;
  } else {
    // 服务端
    global.__REQUEST_ID__ = requestId;
  }
}

// Next.js 中间件：添加 request_id 到请求头
export function withRequestId(handler) {
  return async (req, res) => {
    // 从请求头获取或生成 request_id
    const requestId = req.headers['x-request-id'] || generateRequestId();
    
    // 设置到全局变量
    setCurrentRequestId(requestId);
    
    // 添加到响应头
    res.setHeader('x-request-id', requestId);
    
    // 调用原始处理器
    return handler(req, res);
  };
}

// Express 中间件：添加 request_id 到请求
export function requestIdMiddleware(req, res, next) {
  // 从请求头获取或生成 request_id
  const requestId = req.headers['x-request-id'] || generateRequestId();
  
  // 设置到请求对象
  req.requestId = requestId;
  
  // 设置到全局变量
  setCurrentRequestId(requestId);
  
  // 添加到响应头
  res.setHeader('x-request-id', requestId);
  
  next();
}

// 日志格式化：包含 request_id
export function formatLogWithRequestId(message, level = 'info', extra = {}) {
  const requestId = getCurrentRequestId();
  return {
    timestamp: new Date().toISOString(),
    level,
    requestId,
    message,
    ...extra
  };
}