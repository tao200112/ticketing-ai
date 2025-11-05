import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    message: 'Environment Variables Test',
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_REGION: process.env.VERCEL_REGION,
      VERCEL_URL: process.env.VERCEL_URL
    },
    sentry: {
      SENTRY_DSN: process.env.SENTRY_DSN ? 'SET' : 'NOT SET',
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN ? 'SET' : 'NOT SET'
    },
    supabase: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'
    },
    email: {
      SMTP_HOST: process.env.SMTP_HOST ? 'SET' : 'NOT SET',
      SMTP_PORT: process.env.SMTP_PORT ? 'SET' : 'NOT SET',
      SMTP_USER: process.env.SMTP_USER ? 'SET' : 'NOT SET',
      SMTP_PASS: process.env.SMTP_PASS ? 'SET' : 'NOT SET'
    },
    redis: {
      UPSTASH_REDIS_URL: process.env.UPSTASH_REDIS_URL ? 'SET' : 'NOT SET',
      UPSTASH_REDIS_TOKEN: process.env.UPSTASH_REDIS_TOKEN ? 'SET' : 'NOT SET'
    },
    other: {
      MERCHANT_ID: process.env.MERCHANT_ID ? 'SET' : 'NOT SET',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ? 'SET' : 'NOT SET'
    }
  })
}
