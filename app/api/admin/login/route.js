import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// 管理员账户信息（在实际应用中应该存储在数据库中）
const ADMIN_ACCOUNTS = [
  {
    id: 'admin_001',
    email: 'admin@partytix.com',
    password_hash: '$2b$12$8W3LV46ciMxyypxP8AiIQ.dByrDuDK4/1gAjCNkSbuhBnnfbi/R5G', // admin123
    name: 'System Administrator',
    role: 'super_admin',
    createdAt: '2024-01-01T00:00:00.000Z'
  }
]

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // 查找管理员账户
    const admin = ADMIN_ACCOUNTS.find(acc => acc.email === email)
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, admin.password_hash)
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // 生成管理员令牌
    const token = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 返回管理员信息（不包含密码）
    const adminInfo = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      createdAt: admin.createdAt
    }

    return NextResponse.json({
      success: true,
      token,
      admin: adminInfo
    })

  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

