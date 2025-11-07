import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const logger = createLogger('debug-oauth-error')

/**
 * 诊断端点：帮助查看 OAuth 回调中的实际错误信息
 * 使用方法：在 Vercel 函数日志中搜索 "Error creating user" 或 "OAuth callback error"
 */
export async function GET(request) {
  try {
    return NextResponse.json({
      success: true,
      message: 'This is a diagnostic endpoint. Check Vercel function logs for actual error details.',
      instructions: [
        '1. Go to Vercel Dashboard > Your Project > Functions',
        '2. Find the /api/auth/callback function',
        '3. Look for logs containing "Error creating user"',
        '4. Check the logged error object structure',
        '5. The error should include: errorCode, errorMessage, errorDetails, errorHint, errorKeys'
      ],
      note: 'The improved error handling now logs comprehensive error information. Check the logs to see the actual error structure.'
    })
  } catch (error) {
    logger.error('Debug endpoint error', { error })
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

