import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'
import { hasSupabase } from '../../../../lib/safeEnv'
import bcrypt from 'bcryptjs'

export async function POST(request) {
  try {
    const { email, name, businessName, phone, password, inviteCode } = await request.json()

    // 基本验证
    if (!email || !name || !businessName || !phone || !password || !inviteCode) {
      return NextResponse.json(
        { error: '所有字段都是必填的' },
        { status: 400 }
      )
    }

    // 密码强度验证
    if (password.length < 8) {
      return NextResponse.json(
        { error: '密码至少需要8个字符' },
        { status: 400 }
      )
    }

    // 验证邀请码
    let validInviteCode = null
    
    if (hasSupabase()) {
      // 使用 Supabase 验证邀请码
      if (supabase) {
        const { data: inviteCodeData, error } = await supabase
          .from('admin_invite_codes')
          .select('*')
          .eq('code', inviteCode)
          .eq('is_active', true)
          .is('used_by', null)
          .gt('expires_at', new Date().toISOString())
          .single()

        if (error || !inviteCodeData) {
          return NextResponse.json(
            { error: '无效或已过期的邀请码' },
            { status: 400 }
          )
        }
        validInviteCode = inviteCodeData
      }
    } else {
      // 降级到环境变量存储（临时方案）
      const inviteCodes = JSON.parse(process.env.ADMIN_INVITE_CODES || '[]')
      validInviteCode = inviteCodes.find(code => 
        code.code === inviteCode && 
        code.isActive && 
        !code.usedBy &&
        new Date(code.expiresAt) > new Date()
      )

      if (!validInviteCode) {
        return NextResponse.json(
          { error: '无效或已过期的邀请码' },
          { status: 400 }
        )
      }
    }

    // 检查邮箱是否已存在
    let existingMerchant = null
    
    if (hasSupabase()) {
      if (supabase) {
        const { data: merchantData, error } = await supabase
          .from('merchants')
          .select('id')
          .eq('contact_email', email)
          .single()
        
        if (merchantData) {
          return NextResponse.json(
            { error: '该邮箱已被注册' },
            { status: 400 }
          )
        }
      }
    } else {
      // 降级到环境变量存储
      const existingMerchants = JSON.parse(process.env.MERCHANT_USERS || '[]')
      if (existingMerchants.find(merchant => merchant.email === email)) {
        return NextResponse.json(
          { error: '该邮箱已被注册' },
          { status: 400 }
        )
      }
    }

    // 哈希密码
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)

    let newMerchant = null

    if (hasSupabase()) {
      // 使用 Supabase 创建商家账户
      if (supabase) {
        // 首先创建用户账户
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert([
            {
              email: email,
              name: name,
              password_hash: passwordHash,
              role: 'merchant'
            }
          ])
          .select()
          .single()

        if (userError) {
          console.error('创建用户失败:', userError)
          return NextResponse.json(
            { error: '注册失败，请重试' },
            { status: 500 }
          )
        }

        // 创建商家账户
        const { data: merchantData, error: merchantError } = await supabase
          .from('merchants')
          .insert([
            {
              owner_user_id: newUser.id,
              name: businessName,
              contact_email: email,
              description: `商家：${businessName}`,
              verified: false,
              status: 'active'
            }
          ])
          .select()
          .single()

        if (merchantError) {
          console.error('创建商家失败:', merchantError)
          return NextResponse.json(
            { error: '注册失败，请重试' },
            { status: 500 }
          )
        }

        // 标记邀请码为已使用
        const { error: updateError } = await supabase
          .from('admin_invite_codes')
          .update({
            used_by: newUser.id,
            used_at: new Date().toISOString()
          })
          .eq('id', validInviteCode.id)

        if (updateError) {
          console.error('更新邀请码失败:', updateError)
        }

        newMerchant = {
          id: merchantData.id,
          email: email,
          name: name,
          businessName: businessName,
          phone: phone,
          maxEvents: validInviteCode.max_events || 10,
          isActive: true,
          createdAt: merchantData.created_at
        }
      }
    } else {
      // 降级到环境变量存储
      newMerchant = {
        id: `merchant_${Date.now()}`,
        email,
        name,
        businessName,
        phone,
        password_hash: passwordHash,
        maxEvents: validInviteCode.maxEvents || 10,
        isActive: true,
        createdAt: new Date().toISOString(),
        inviteCodeUsed: inviteCode
      }

      // 保存商家信息
      const existingMerchants = JSON.parse(process.env.MERCHANT_USERS || '[]')
      const updatedMerchants = [...existingMerchants, newMerchant]
      process.env.MERCHANT_USERS = JSON.stringify(updatedMerchants)

      // 标记邀请码为已使用
      const inviteCodes = JSON.parse(process.env.ADMIN_INVITE_CODES || '[]')
      const updatedInviteCodes = inviteCodes.map(code => {
        if (code.id === validInviteCode.id) {
          return {
            ...code,
            usedBy: newMerchant.id,
            usedAt: new Date().toISOString()
          }
        }
        return code
      })
      process.env.ADMIN_INVITE_CODES = JSON.stringify(updatedInviteCodes)
    }

    // 返回商家信息（不包含密码）
    const merchantInfo = {
      id: newMerchant.id,
      email: newMerchant.email,
      name: newMerchant.name,
      businessName: newMerchant.businessName,
      phone: newMerchant.phone,
      maxEvents: newMerchant.maxEvents,
      isActive: newMerchant.isActive,
      createdAt: newMerchant.createdAt
    }

    return NextResponse.json({
      success: true,
      message: '商家注册成功',
      merchant: merchantInfo
    })

  } catch (error) {
    console.error('Merchant registration error:', error)
    return NextResponse.json(
      { error: '注册失败，请重试' },
      { status: 500 }
    )
  }
}

