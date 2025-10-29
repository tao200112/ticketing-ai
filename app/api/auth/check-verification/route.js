import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createError } from '../../../../lib/error-codes.js';
import { getCurrentRequestId } from '../../../../lib/request-id.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  const requestId = getCurrentRequestId();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      createError('VALID_002', { 
        details: 'User ID is required',
        requestId 
      }),
      { status: 400 }
    );
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, email_verified_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return NextResponse.json(
        createError('AUTH_002', { 
          details: 'User not found',
          requestId 
        }),
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        verified: !!user.email_verified_at,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerifiedAt: user.email_verified_at
        }
      },
      requestId
    });

  } catch (error) {
    console.error('❌ 检查邮箱验证状态 API 错误:', error);
    return NextResponse.json(
      createError('SYS_001', { 
        details: 'Internal server error',
        requestId: getCurrentRequestId()
      }),
      { status: 500 }
    );
  }
}
