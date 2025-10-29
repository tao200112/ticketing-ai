import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    message: 'Debug Routes API is working!',
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_REGION: process.env.VERCEL_REGION,
      VERCEL_URL: process.env.VERCEL_URL
    },
    availableRoutes: [
      '/api/debug-routes',
      '/api/test-email',
      '/api/auth/send-verification',
      '/api/auth/verify-email',
      '/api/auth/forgot-password',
      '/api/auth/reset-password'
    ],
    availablePages: [
      '/simple-test',
      '/email-test',
      '/debug-vercel',
      '/auth/verify-email',
      '/auth/forgot-password',
      '/auth/reset-password'
    ]
  })
}
