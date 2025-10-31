import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import bcrypt from 'bcryptjs'

const logger = createLogger('merchant-create-api')

export async function POST(request) {
  try {
    const body = await request.json()
    const { businessName, phone, inviteCode, userId, email, password, name, age } = body

    logger.info('Received merchant registration request', { businessName, inviteCode, userId: userId ? 'provided' : 'missing' })

    // 验证必需字段
    if (!businessName || !inviteCode) {
      throw ErrorHandler.validationError(
        'MISSING_FIELDS',
        'Business name and invite code are required'
      )
    }

    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase is not configured'
      )
    }

    const supabase = createSupabaseClient()

    // 验证邀请码
    const { data: inviteCodeData, error: inviteError } = await supabase
      .from('admin_invite_codes')
      .select('*')
      .eq('code', inviteCode)
      .eq('is_active', true)
      .single()

    if (inviteError || !inviteCodeData) {
      throw ErrorHandler.validationError(
        'INVALID_INVITE_CODE',
        'Invalid invite code'
      )
    }

    // 检查邀请码是否过期
    if (new Date(inviteCodeData.expires_at) < new Date()) {
      throw ErrorHandler.validationError(
        'INVITE_CODE_EXPIRED',
        'Invite code has expired'
      )
    }

    // 检查邀请码是否已被使用
    if (inviteCodeData.used_by) {
      throw ErrorHandler.validationError(
        'INVITE_CODE_ALREADY_USED',
        'Invite code has already been used'
      )
    }

    let userRecord
    let finalUserId = userId

      // 如果没有 userId，需要先创建用户
      if (!userId) {
        if (!email || !password || !name || !age) {
          throw ErrorHandler.validationError(
            'MISSING_USER_INFO',
            'Email, password, name, and age are required when creating a new user'
          )
        }
        
        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          throw ErrorHandler.validationError('INVALID_EMAIL')
        }

      // 检查邮箱是否已存在（只检查merchant角色）
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .eq('role', 'merchant')
        .single()

      if (existingUser) {
        throw ErrorHandler.conflictError(
          'EMAIL_EXISTS',
          'Email already registered as merchant'
        )
      }

      // 验证密码长度
      if (password.length < 8) {
        throw ErrorHandler.validationError('PASSWORD_TOO_SHORT')
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 12)

      // 创建商家用户
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert([{
          email,
          name,
          age: parseInt(age),
          password_hash: hashedPassword,
          role: 'merchant'
        }])
        .select()
        .single()

      if (userError) {
        throw ErrorHandler.fromSupabaseError(userError, 'USER_CREATION_FAILED')
      }

      userRecord = newUser
      finalUserId = newUser.id
    } else {
      // 更新现有用户角色为商家
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ role: 'merchant' })
        .eq('id', userId)
        .select()
        .single()

      if (updateError) {
        throw ErrorHandler.fromSupabaseError(updateError, 'USER_UPDATE_FAILED')
      }

      userRecord = updatedUser
    }

    // 检查用户是否已有商家账户
    const { data: existingMerchant } = await supabase
      .from('merchants')
      .select('*')
      .eq('owner_user_id', finalUserId)
      .single()

    if (existingMerchant) {
      throw ErrorHandler.conflictError(
        'MERCHANT_EXISTS',
        'User already has a merchant account'
      )
    }

    // 创建商家记录
    const { data: newMerchant, error: merchantError } = await supabase
      .from('merchants')
      .insert([{
        owner_user_id: finalUserId,
        name: businessName,
        description: phone ? `商家联系方式: ${phone}` : null,
        contact_email: userRecord.email,
        verified: false,
        status: 'active'
      }])
      .select()
      .single()

    if (merchantError) {
      throw ErrorHandler.fromSupabaseError(merchantError, 'MERCHANT_CREATION_FAILED')
    }

    // 标记邀请码为已使用
    const { error: updateInviteError } = await supabase
      .from('admin_invite_codes')
      .update({
        used_by: finalUserId,
        used_at: new Date().toISOString()
      })
      .eq('id', inviteCodeData.id)

    if (updateInviteError) {
      logger.warn('Failed to update invite code', { error: updateInviteError })
      // 非阻塞性错误，商家已创建成功
    }

    logger.success('Merchant created successfully', { merchantId: newMerchant.id })

    return NextResponse.json({
      ok: true,
      success: true,
      merchant: newMerchant,
      user: userRecord
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}






