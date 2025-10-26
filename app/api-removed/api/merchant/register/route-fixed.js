import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase-admin'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    console.log('🔍 Merchant registration attempt started')
    const { email, name, businessName, phone, password, inviteCode } = await request.json()
    
    console.log('📝 Registration data:', { email, name, businessName, phone, inviteCode })

    // 基本验证
    if (!email || !name || !businessName || !phone || !password || !inviteCode) {
      console.log('❌ Missing required fields')
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // 密码强度验证
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // 检查 Supabase 配置
    if (!supabaseAdmin) {
      console.error('❌ Supabase admin client not available')
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }

    console.log('✅ Supabase admin client available')

    // 验证邀请码
    console.log('🔍 Validating invite code:', inviteCode)
    const { data: inviteCodeData, error: inviteError } = await supabaseAdmin
      .from('admin_invite_codes')
      .select('*')
      .eq('code', inviteCode)
      .eq('is_active', true)
      .is('used_by', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (inviteError || !inviteCodeData) {
      console.error('❌ Invalid invite code:', inviteError)
      return NextResponse.json(
        { error: 'Invalid or expired invite code' },
        { status: 400 }
      )
    }

    console.log('✅ Valid invite code found:', inviteCodeData.id)

    // 检查邮箱是否已存在
    console.log('🔍 Checking if email already exists:', email)
    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      console.log('❌ Email already registered')
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    console.log('✅ Email is available')

    // 哈希密码
    console.log('🔐 Hashing password...')
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // 创建用户账户
    console.log('👤 Creating user account...')
    const { data: newUser, error: userError } = await supabaseAdmin
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
      console.error('❌ Failed to create user:', userError)
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    console.log('✅ User created successfully:', newUser.id)

    // 创建商家账户
    console.log('🏢 Creating merchant account...')
    const { data: merchantData, error: merchantError } = await supabaseAdmin
      .from('merchants')
      .insert([
        {
          owner_user_id: newUser.id,
          name: businessName,
          contact_email: email,
          contact_phone: phone,
          description: `商家：${businessName}`,
          verified: false,
          status: 'active'
        }
      ])
      .select()
      .single()

    if (merchantError) {
      console.error('❌ Failed to create merchant:', merchantError)
      // 回滚用户创建
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', newUser.id)
      
      return NextResponse.json(
        { error: 'Failed to create merchant account' },
        { status: 500 }
      )
    }

    console.log('✅ Merchant created successfully:', merchantData.id)

    // 标记邀请码为已使用
    console.log('📝 Marking invite code as used...')
    const { error: updateError } = await supabaseAdmin
      .from('admin_invite_codes')
      .update({
        used_by: newUser.id,
        used_at: new Date().toISOString()
      })
      .eq('id', inviteCodeData.id)

    if (updateError) {
      console.error('⚠️ Failed to update invite code:', updateError)
      // 不返回错误，因为商家已经创建成功
    } else {
      console.log('✅ Invite code marked as used')
    }

    // 返回商家信息
    const merchantInfo = {
      id: merchantData.id,
      email: email,
      name: name,
      businessName: businessName,
      phone: phone,
      maxEvents: inviteCodeData.max_events || 10,
      isActive: true,
      createdAt: merchantData.created_at
    }

    console.log('🎉 Merchant registration successful:', merchantInfo)

    return NextResponse.json({
      success: true,
      message: 'Merchant registration successful',
      merchant: merchantInfo
    })

  } catch (error) {
    console.error('❌ Merchant registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed, please try again' },
      { status: 500 }
    )
  }
}
