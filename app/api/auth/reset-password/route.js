import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import rateLimiter from '../../../../lib/rate-limiter.js';
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
    const { token, newPassword } = body;

    // 验证必需字段
    if (!token || !newPassword) {
      return NextResponse.json(
        createError('VALID_002', { 
          details: 'Token and new password are required',
          requestId 
        }),
        { status: 400 }
      );
    }

    // 验证密码强度
    if (newPassword.length < 6) {
      return NextResponse.json(
        createError('VALID_003', { 
          details: 'Password must be at least 6 characters long',
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
    const ipLimit = await rateLimiter.checkIPLimit(clientIP, 'reset_password_confirm', 5, 15);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        createError('AUTH_004', { 
          details: 'Too many password reset attempts from this IP',
          requestId,
          retryAfter: ipLimit.resetTime
        }),
        { status: 429 }
      );
    }

    // 查找用户并验证令牌
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, reset_token_hash, reset_token_expire_at')
      .eq('reset_token_hash', token)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        createError('AUTH_002', { 
          details: 'Invalid or expired reset token',
          requestId 
        }),
        { status: 400 }
      );
    }

    // 检查令牌是否过期
    if (user.reset_token_expire_at && 
        new Date(user.reset_token_expire_at) < new Date()) {
      return NextResponse.json(
        createError('AUTH_003', { 
          details: 'Reset token has expired',
          requestId 
        }),
        { status: 400 }
      );
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 更新用户密码并清除重置令牌
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: hashedPassword,
        reset_token_hash: null,
        reset_token_expire_at: null,
        last_password_reset_sent_at: null
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('❌ 更新密码失败:', updateError);
      return NextResponse.json(
        createError('SYS_001', { 
          details: 'Failed to reset password',
          requestId 
        }),
        { status: 500 }
      );
    }

    // 记录重置日志
    await supabase
      .from('email_verification_logs')
      .insert({
        user_id: user.id,
        email: user.email,
        action: 'password_reset_used',
        token_hash: token.substring(0, 8) + '...',
        success: true
      });

    return NextResponse.json({
      success: true,
      message: '密码重置成功！请使用新密码登录',
      data: {
        email: user.email,
        resetAt: new Date().toISOString()
      },
      requestId
    });

  } catch (error) {
    console.error('❌ 重置密码 API 错误:', error);
    return NextResponse.json(
      createError('SYS_001', { 
        details: 'Internal server error',
        requestId: getCurrentRequestId()
      }),
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const requestId = getCurrentRequestId();
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      createError('VALID_002', { 
        details: 'Reset token is required',
        requestId 
      }),
      { status: 400 }
    );
  }

  // 验证令牌有效性
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, reset_token_hash, reset_token_expire_at')
    .eq('reset_token_hash', token)
    .single();

  if (error || !user) {
    return NextResponse.json(
      createError('AUTH_002', { 
        details: 'Invalid reset token',
        requestId 
      }),
      { status: 400 }
    );
  }

  // 检查令牌是否过期
  if (user.reset_token_expire_at && 
      new Date(user.reset_token_expire_at) < new Date()) {
    return NextResponse.json(
      createError('AUTH_003', { 
        details: 'Reset token has expired',
        requestId 
      }),
      { status: 400 }
    );
  }

  // 重定向到前端重置页面
  const frontendUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password?token=${token}`;
  return NextResponse.redirect(frontendUrl);
}
