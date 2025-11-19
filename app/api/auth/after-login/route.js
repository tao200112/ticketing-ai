/**
 * After Login API
 * 统一处理登录后的业务逻辑
 * 
 * 功能：
 * 1. 根据用户类型创建/更新业务表记录
 * 2. 判断是否需要设置密码
 * 3. 判断是否需要 onboarding
 * 4. 返回前端需要的状态信息
 */

import { NextResponse } from 'next/server';
import { getSupabaseUser, createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseClient } from '@/lib/supabase-api';
import { ErrorHandler, handleApiError } from '@/lib/error-handler';
import { createLogger } from '@/lib/logger';

const logger = createLogger('after-login-api');

export async function POST(request) {
  try {
    // 1. 获取当前认证用户
    const user = await getSupabaseUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { path } = await request.json().catch(() => ({}));
    logger.info('After login check', { userId: user.id, email: user.email, path });

    // 2. 判断入口类型（商家入口 vs 普通用户入口）
    const isMerchantEntry = path?.includes('/merchant') || path?.includes('/admin');

    // 3. 获取 Supabase 客户端（使用 service role 以访问所有表）
    const supabase = createSupabaseClient();

    // 4. 检查用户是否有密码
    // 通过检查 user.app_metadata 或 user.user_metadata 来判断
    const authProvider = user.app_metadata?.provider || 'email';
    // Google 登录用户默认没有密码
    // 邮箱注册用户默认有密码（除非是特殊场景）
    const hasPassword = authProvider === 'email' && user.user_metadata?.has_password !== false;

    // 5. 检查是否是 Google 登录
    const isGoogleLogin = authProvider === 'google';

    // 6. 根据入口类型处理业务表记录
    let isUser = false;
    let isMerchant = false;
    let requireEmailVerification = false;
    let emailConfirmed = false;
    let needPasswordSetup = false;
    let needOnboarding = false;

    if (isMerchantEntry) {
      // 商家入口：检查 merchant_members
      const { data: merchantMember, error: merchantError } = await supabase
        .from('merchant_members')
        .select('*, merchants(*)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (merchantError && merchantError.code !== 'PGRST116') {
        logger.error('Error checking merchant_members', { error: merchantError });
        throw ErrorHandler.databaseError(merchantError, 'MERCHANT_CHECK_FAILED');
      }

      if (merchantMember) {
        isMerchant = true;
        requireEmailVerification = merchantMember.require_email_verification || false;
        // emailConfirmed: 如果 require_email_verification = true，需要检查 email_verified_at
        // 商家统一为 false，所以这里直接设为 true
        emailConfirmed = !requireEmailVerification; // 商家统一为 false，所以已确认
      } else {
        // 商家成员不存在，可能需要激活邀请码
        needOnboarding = true;
      }
    } else {
      // 普通用户入口：检查 public.users
      const { data: publicUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (userError && userError.code !== 'PGRST116') {
        logger.error('Error checking users', { error: userError });
        throw ErrorHandler.databaseError(userError, 'USER_CHECK_FAILED');
      }

      if (publicUser) {
        isUser = true;
        requireEmailVerification = publicUser.require_email_verification || false;
        // emailConfirmed: 如果 require_email_verification = true，需要检查 email_verified_at
        // 如果 require_email_verification = false，则认为已确认
        emailConfirmed = requireEmailVerification 
          ? (publicUser.email_verified_at !== null)
          : true;
      } else {
        // 用户不存在，创建记录
        // 根据登录方式设置 require_email_verification:
        // - Google 登录: false（不需要提示）
        // - 邮箱注册: true（显示提示，但不拦截功能）
        const requireEmailVerificationForNewUser = !isGoogleLogin;

        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || 
                  user.user_metadata?.name || 
                  user.user_metadata?.display_name || 
                  user.email?.split('@')[0] || 'User',
            role: 'user',
            auth_provider: authProvider,
            require_email_verification: requireEmailVerificationForNewUser,
            email_verified_at: isGoogleLogin ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (createError) {
          logger.error('Error creating user', { error: createError });
          throw ErrorHandler.databaseError(createError, 'USER_CREATE_FAILED');
        }

        isUser = true;
        requireEmailVerification = requireEmailVerificationForNewUser;
        // emailConfirmed: 如果 require_email_verification = true，需要检查 email_verified_at
        // 如果 require_email_verification = false，则认为已确认
        emailConfirmed = requireEmailVerificationForNewUser 
          ? (newUser.email_verified_at !== null)
          : true; // Google 登录默认已确认
        logger.info('Created new user record', { 
          userId: user.id, 
          requireEmailVerification: requireEmailVerificationForNewUser 
        });
      }
    }

    // 7. 检查是否需要设置密码
    // Google 登录用户默认需要设置密码（除非已经有密码）
    if (isGoogleLogin) {
      // 检查用户元数据中是否有 has_password 标记
      const userHasPassword = user.user_metadata?.has_password === true;
      if (!userHasPassword) {
        needPasswordSetup = true;
      }
    }

    // 8. 检查是否需要 onboarding
    // 如果用户是新创建的且没有完成基本信息，需要 onboarding
    if (isUser && !isMerchant) {
      const { data: userRecord } = await supabase
        .from('users')
        .select('name, age')
        .eq('id', user.id)
        .single();

      // 如果缺少基本信息，需要 onboarding
      if (!userRecord?.age || !userRecord?.name || userRecord.name === user.email?.split('@')[0]) {
        needOnboarding = true;
      }
    }

    // 9. 返回结果
    const result = {
      isUser,
      isMerchant,
      requireEmailVerification,
      emailConfirmed,
      needPasswordSetup,
      needOnboarding,
    };

    logger.info('After login result', { userId: user.id, result });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('After login error', { error });
    return handleApiError(error);
  }
}

