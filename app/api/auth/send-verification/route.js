import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import rateLimiter from '../../../../lib/rate-limiter.js';
import emailService from '../../../../lib/email-service.js';
import { createError } from '../../../../lib/error-codes.js';
import { getCurrentRequestId } from '../../../../lib/request-id.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const requestId = getCurrentRequestId();
  
  try {
    const body = await request.json();
    const { email } = body;

    // 验证必需字段
    if (!email) {
      return NextResponse.json(
        createError('VALID_002', { 
          details: 'Email is required',
          requestId 
        }),
        { status: 400 }
      );
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        createError('VALID_003', { 
          details: 'Invalid email format',
          requestId 
        }),
        { status: 400 }
      );
    }

    // 获取客户端 IP
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     '127.0.0.1';

    // 检查限流
    const [ipLimit, emailLimit] = await Promise.all([
      rateLimiter.checkIPLimit(clientIP, 'send_verification', 3, 15),
      rateLimiter.checkEmailLimit(email, 'send_verification', 2, 15)
    ]);

    if (!ipLimit.allowed) {
      return NextResponse.json(
        createError('AUTH_004', { 
          details: 'Too many requests from this IP',
          requestId,
          retryAfter: ipLimit.resetTime
        }),
        { status: 429 }
      );
    }

    if (!emailLimit.allowed) {
      return NextResponse.json(
        createError('AUTH_004', { 
          details: 'Too many verification emails sent to this address',
          requestId,
          retryAfter: emailLimit.resetTime
        }),
        { status: 429 }
      );
    }

    // 查找用户
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, email_verified_at, email_verification_expire_at')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        createError('AUTH_002', { 
          details: 'User not found',
          requestId 
        }),
        { status: 404 }
      );
    }

    // 检查邮箱是否已验证
    if (user.email_verified_at) {
      return NextResponse.json(
        createError('AUTH_005', { 
          details: 'Email already verified',
          requestId 
        }),
        { status: 400 }
      );
    }

    // 检查是否在冷却期内
    if (user.email_verification_expire_at && 
        new Date(user.email_verification_expire_at) > new Date()) {
      const remainingMinutes = Math.ceil(
        (new Date(user.email_verification_expire_at) - new Date()) / (1000 * 60)
      );
      
      return NextResponse.json(
        createError('AUTH_004', { 
          details: `Please wait ${remainingMinutes} minutes before requesting another verification email`,
          requestId,
          retryAfter: user.email_verification_expire_at
        }),
        { status: 429 }
      );
    }

    // 生成验证令牌
    const verificationToken = await supabase.rpc('send_verification_email', {
      p_user_id: user.id,
      p_email: user.email
    });

    if (verificationToken.error) {
      console.error('❌ 生成验证令牌失败:', verificationToken.error);
      return NextResponse.json(
        createError('SYS_001', { 
          details: 'Failed to generate verification token',
          requestId 
        }),
        { status: 500 }
      );
    }

    // 发送验证邮件
    try {
      await emailService.sendVerificationEmail(
        user.email, 
        user.name, 
        verificationToken.data
      );
    } catch (emailError) {
      console.error('❌ 发送验证邮件失败:', emailError);
      return NextResponse.json(
        createError('API_001', { 
          details: 'Failed to send verification email',
          requestId 
        }),
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '验证邮件已发送，请检查您的邮箱',
      data: {
        email: user.email,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      requestId
    });

  } catch (error) {
    console.error('❌ 发送验证邮件 API 错误:', error);
    return NextResponse.json(
      createError('SYS_001', { 
        details: 'Internal server error',
        requestId: getCurrentRequestId()
      }),
      { status: 500 }
    );
  }
}
