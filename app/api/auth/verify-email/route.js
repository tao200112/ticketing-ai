import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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
    const { token } = body;

    // 验证必需字段
    if (!token) {
      return NextResponse.json(
        createError('VALID_002', { 
          details: 'Verification token is required',
          requestId 
        }),
        { status: 400 }
      );
    }

    // 查找用户并验证令牌
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, email_verification_token, email_verification_expire_at, email_verified_at')
      .eq('email_verification_token', token)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        createError('AUTH_002', { 
          details: 'Invalid or expired verification token',
          requestId 
        }),
        { status: 400 }
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

    // 检查令牌是否过期
    if (user.email_verification_expire_at && 
        new Date(user.email_verification_expire_at) < new Date()) {
      return NextResponse.json(
        createError('AUTH_003', { 
          details: 'Verification token has expired',
          requestId 
        }),
        { status: 400 }
      );
    }

    // 更新用户邮箱验证状态
    const { error: updateError } = await supabase
      .from('users')
      .update({
        email_verified_at: new Date().toISOString(),
        email_verification_token: null,
        email_verification_expire_at: null
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('❌ 更新邮箱验证状态失败:', updateError);
      return NextResponse.json(
        createError('SYS_001', { 
          details: 'Failed to verify email',
          requestId 
        }),
        { status: 500 }
      );
    }

    // 记录验证日志
    await supabase
      .from('email_verification_logs')
      .insert({
        user_id: user.id,
        email: user.email,
        action: 'verification_verified',
        token_hash: token.substring(0, 8) + '...',
        success: true
      });

    return NextResponse.json({
      success: true,
      message: '邮箱验证成功！您现在可以正常使用所有功能了',
      data: {
        email: user.email,
        verifiedAt: new Date().toISOString()
      },
      requestId
    });

  } catch (error) {
    console.error('❌ 验证邮箱 API 错误:', error);
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
        details: 'Verification token is required',
        requestId 
      }),
      { status: 400 }
    );
  }

  // 重定向到前端验证页面
  const frontendUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/verify-email?token=${token}`;
  return NextResponse.redirect(frontendUrl);
}
