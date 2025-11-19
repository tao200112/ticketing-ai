/**
 * Activate Merchant Invite API
 * 激活商家邀请码
 * 
 * 功能：
 * 1. 校验 admin_invite_codes
 * 2. 创建 merchant_members 记录
 * 3. 设置 require_email_verification = false
 * 4. 标记 used_by = user.id
 */

import { NextResponse } from 'next/server';
import { requireSupabaseUser } from '@/lib/supabase/server';
import { createSupabaseClient } from '@/lib/supabase-api';
import { ErrorHandler, handleApiError } from '@/lib/error-handler';
import { createLogger } from '@/lib/logger';

const logger = createLogger('activate-invite-api');

export async function POST(request) {
  try {
    // 1. 要求用户必须已登录
    const user = await requireSupabaseUser();
    logger.info('Activate invite request', { userId: user.id, email: user.email });

    // 2. 获取请求体
    const body = await request.json();
    const { inviteCode } = body;

    if (!inviteCode || !inviteCode.trim()) {
      throw ErrorHandler.validationError(
        'MISSING_INVITE_CODE',
        '邀请码不能为空'
      );
    }

    const normalizedCode = inviteCode.trim().toUpperCase();

    // 3. 获取 Supabase 客户端
    const supabase = createSupabaseClient();

    // 4. 验证邀请码
    const { data: inviteCodeData, error: inviteError } = await supabase
      .from('admin_invite_codes')
      .select('*')
      .eq('code', normalizedCode)
      .maybeSingle();

    if (inviteError && inviteError.code !== 'PGRST116') {
      logger.error('Error checking invite code', { error: inviteError, code: normalizedCode });
      throw ErrorHandler.databaseError(
        inviteError,
        'INVITE_CODE_CHECK_FAILED',
        '验证邀请码失败'
      );
    }

    if (!inviteCodeData) {
      throw ErrorHandler.validationError(
        'INVALID_INVITE_CODE',
        '邀请码无效，请检查是否正确'
      );
    }

    // 5. 检查邀请码是否已被使用
    if (inviteCodeData.used_by) {
      throw ErrorHandler.validationError(
        'INVITE_CODE_ALREADY_USED',
        '邀请码已被使用，请联系管理员获取新的邀请码'
      );
    }

    // 6. 检查邀请码是否过期
    if (new Date(inviteCodeData.expires_at) < new Date()) {
      throw ErrorHandler.validationError(
        'INVITE_CODE_EXPIRED',
        '邀请码已过期，请联系管理员获取新的邀请码'
      );
    }

    // 7. 检查邀请码是否活跃
    if (!inviteCodeData.is_active) {
      throw ErrorHandler.validationError(
        'INVITE_CODE_INACTIVE',
        '邀请码已失效，请联系管理员获取新的邀请码'
      );
    }

    // 8. 检查用户是否已经是商家成员
    const { data: existingMember, error: memberError } = await supabase
      .from('merchant_members')
      .select('*, merchants(*)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError && memberError.code !== 'PGRST116') {
      logger.error('Error checking merchant_members', { error: memberError });
      throw ErrorHandler.databaseError(memberError, 'MEMBER_CHECK_FAILED');
    }

    if (existingMember) {
      // 用户已经是商家成员，返回现有商家信息
      logger.info('User already a merchant member', { 
        userId: user.id, 
        merchantId: existingMember.merchant_id 
      });
      
      return NextResponse.json({
        success: true,
        merchant: existingMember.merchants,
        message: '您已经是商家成员',
      });
    }

    // 9. 查找或创建商家记录
    // 首先检查是否有未关联的商家（通过邀请码的 max_events 等信息）
    // 如果没有，创建一个新商家
    let merchantId = null;

    // 尝试查找是否有可用的商家（这里可以根据业务逻辑调整）
    // 为了简化，我们创建一个新商家
    const { data: newMerchant, error: merchantError } = await supabase
      .from('merchants')
      .insert({
        name: `商家-${user.email?.split('@')[0] || 'Unknown'}`,
        contact_email: user.email,
        status: 'active',
        verified: false,
      })
      .select()
      .single();

    if (merchantError) {
      logger.error('Error creating merchant', { error: merchantError });
      throw ErrorHandler.databaseError(merchantError, 'MERCHANT_CREATE_FAILED');
    }

    merchantId = newMerchant.id;
    logger.info('Created new merchant', { merchantId, userId: user.id });

    // 10. 创建 merchant_members 记录
    const { data: member, error: memberCreateError } = await supabase
      .from('merchant_members')
      .insert({
        merchant_id: merchantId,
        user_id: user.id,
        role: 'boss', // 邀请码激活的默认为 boss
        require_email_verification: false, // 新系统统一为 false
      })
      .select('*, merchants(*)')
      .single();

    if (memberCreateError) {
      logger.error('Error creating merchant_member', { error: memberCreateError });
      throw ErrorHandler.databaseError(memberCreateError, 'MEMBER_CREATE_FAILED');
    }

    // 11. 更新邀请码状态
    const { error: updateError } = await supabase
      .from('admin_invite_codes')
      .update({
        used_by: user.id,
        used_at: new Date().toISOString(),
      })
      .eq('id', inviteCodeData.id);

    if (updateError) {
      logger.error('Error updating invite code', { error: updateError });
      // 不抛出错误，因为成员已经创建成功
      logger.warn('Invite code update failed but member created', { 
        inviteCodeId: inviteCodeData.id 
      });
    }

    // 12. 确保 public.users 记录存在
    const { data: publicUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!publicUser) {
      // 创建用户记录
      const authProvider = user.app_metadata?.provider || 'email';
      await supabase
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
          require_email_verification: false,
        });
    }

    logger.info('Successfully activated invite', { 
      userId: user.id, 
      merchantId,
      inviteCodeId: inviteCodeData.id 
    });

    return NextResponse.json({
      success: true,
      merchant: member.merchants,
      member,
      message: '邀请码激活成功',
    });
  } catch (error) {
    logger.error('Activate invite error', { error });
    return handleApiError(error);
  }
}

