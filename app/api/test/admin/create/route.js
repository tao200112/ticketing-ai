import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function GET() {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 创建测试管理员用户
    const testEmail = 'admin@partytix.com'
    const testPassword = 'admin123'
    const hashedPassword = await bcrypt.hash(testPassword, 10)

    // 检查用户是否存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', testEmail)
      .single()

    let userId
    if (existingUser) {
      // 更新现有用户为管理员
      const { data: updatedUser } = await supabase
        .from('users')
        .update({ role: 'admin', password_hash: hashedPassword })
        .eq('email', testEmail)
        .select()
        .single()
      userId = updatedUser.id
    } else {
      // 创建新管理员用户
      const { data: newUser } = await supabase
        .from('users')
        .insert([{
          email: testEmail,
          name: 'Administrator',
          age: 30,
          password_hash: hashedPassword,
          role: 'admin'
        }])
        .select()
        .single()
      userId = newUser.id
    }

    return NextResponse.json({
      success: true,
      message: 'Test admin created/updated',
      credentials: {
        email: testEmail,
        password: testPassword
      },
      userId
    })

  } catch (error) {
    console.error('Error creating test admin:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}





