/**
 * 请求ID工具函数
 * 
 * 用于在API路由和数据层之间传递requestId
 */

/**
 * 从请求中提取requestId
 */
export function getRequestId(request) {
  if (!request) return null
  
  // 从请求头获取
  const headerId = request.headers?.get('x-request-id')
  if (headerId) return headerId
  
  // 从URL参数获取（备用方案）
  const url = new URL(request.url)
  const paramId = url.searchParams.get('requestId')
  if (paramId) return paramId
  
  return null
}

/**
 * 为响应添加requestId头
 */
export function addRequestIdHeader(response, requestId) {
  if (response && requestId) {
    response.headers.set('x-request-id', requestId)
  }
  return response
}

/**
 * 创建带requestId的上下文对象
 */
export function createRequestContext(request, additionalData = {}) {
  const requestId = getRequestId(request)
  
  return {
    requestId,
    timestamp: new Date().toISOString(),
    url: request?.url,
    method: request?.method,
    userAgent: request?.headers?.get('user-agent'),
    ...additionalData
  }
}

/**
 * 在数据层函数中传递requestId
 */
export function withRequestId(fn, requestId) {
  return function(...args) {
    // 将requestId添加到参数中
    const argsWithRequestId = [...args, { requestId }]
    return fn.apply(this, argsWithRequestId)
  }
}
