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
      rateLimiter.checkIPLimit(clientIP, 'reset_password', 3, 15),
      rateLimiter.checkEmailLimit(email, 'reset_password', 2, 15)
    ]);

    if (!ipLimit.allowed) {
      return NextResponse.json(
        createError('AUTH_004', { 
          details: 'Too many password reset requests from this IP',
          requestId,
          retryAfter: ipLimit.resetTime
        }),
        { status: 429 }
      );
    }

    if (!emailLimit.allowed) {
      return NextResponse.json(
        createError('AUTH_004', { 
          details: 'Too many password reset requests for this email',
          requestId,
          retryAfter: emailLimit.resetTime
        }),
        { status: 429 }
      );
    }

    // 查找用户
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, last_password_reset_sent_at, reset_token_expire_at')
      .eq('email', email)
      .single();

    if (userError || !user) {
      // 为了安全，即使用户不存在也返回成功
      return NextResponse.json({
        success: true,
        message: '如果该邮箱已注册，您将收到密码重置邮件',
        requestId
      });
    }

    // 检查是否在冷却期内
    if (user.last_password_reset_sent_at) {
      const lastResetTime = new Date(user.last_password_reset_sent_at);
      const cooldownMinutes = 5; // 5分钟冷却期
      const cooldownEnd = new Date(lastResetTime.getTime() + cooldownMinutes * 60 * 1000);
      
      if (new Date() < cooldownEnd) {
        const remainingMinutes = Math.ceil((cooldownEnd - new Date()) / (1000 * 60));
        
        return NextResponse.json(
          createError('AUTH_004', { 
            details: `Please wait ${remainingMinutes} minutes before requesting another password reset`,
            requestId,
            retryAfter: cooldownEnd.toISOString()
          }),
          { status: 429 }
        );
      }
    }

    // 检查是否有未过期的重置令牌
    if (user.reset_token_expire_at && 
        new Date(user.reset_token_expire_at) > new Date()) {
      const remainingMinutes = Math.ceil(
        (new Date(user.reset_token_expire_at) - new Date()) / (1000 * 60)
      );
      
      return NextResponse.json(
        createError('AUTH_004', { 
          details: `A password reset email was already sent. Please wait ${remainingMinutes} minutes before requesting another one`,
          requestId,
          retryAfter: user.reset_token_expire_at
        }),
        { status: 429 }
      );
    }

    // 生成重置令牌
    const resetToken = await supabase.rpc('send_password_reset_email', {
      p_user_id: user.id,
      p_email: user.email
    });

    if (resetToken.error) {
      console.error('❌ 生成重置令牌失败:', resetToken.error);
      return NextResponse.json(
        createError('SYS_001', { 
          details: 'Failed to generate reset token',
          requestId 
        }),
        { status: 500 }
      );
    }

    // 发送重置邮件
    try {
      await emailService.sendPasswordResetEmail(
        user.email, 
        user.name, 
        resetToken.data
      );
    } catch (emailError) {
      console.error('❌ 发送重置邮件失败:', emailError);
      return NextResponse.json(
        createError('API_001', { 
          details: 'Failed to send password reset email',
          requestId 
        }),
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '密码重置邮件已发送，请检查您的邮箱',
      data: {
        email: user.email,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30分钟
      },
      requestId
    });

  } catch (error) {
    console.error('❌ 找回密码 API 错误:', error);
    return NextResponse.json(
      createError('SYS_001', { 
        details: 'Internal server error',
        requestId: getCurrentRequestId()
      }),
      { status: 500 }
    );
  }
}
