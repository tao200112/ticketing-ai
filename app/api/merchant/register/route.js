import { NextResponse } from 'next/server'
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
    const inviteCodes = JSON.parse(process.env.ADMIN_INVITE_CODES || '[]')
    const validInviteCode = inviteCodes.find(code => 
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

    // 检查邮箱是否已存在
    const existingMerchants = JSON.parse(process.env.MERCHANT_USERS || '[]')
    if (existingMerchants.find(merchant => merchant.email === email)) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 400 }
      )
    }

    // 哈希密码
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // 创建商家账户
    const newMerchant = {
      id: `merchant_${Date.now()}`,
      email,
      name,
      businessName,
      phone,
      password_hash: passwordHash,
      maxEvents: validInviteCode.maxEvents,
      isActive: true,
      createdAt: new Date().toISOString(),
      inviteCodeUsed: inviteCode
    }

    // 保存商家信息
    const updatedMerchants = [...existingMerchants, newMerchant]
    process.env.MERCHANT_USERS = JSON.stringify(updatedMerchants)

    // 标记邀请码为已使用
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

