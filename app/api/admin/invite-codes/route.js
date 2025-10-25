import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'
import { hasSupabase } from '../../../../lib/safeEnv'

// 获取所有邀请码
export async function GET() {
  try {
    if (hasSupabase()) {
      const supabase = await createServerSupabaseClient()
      
      if (supabase) {
        const { data: inviteCodes, error } = await supabase
          .from('admin_invite_codes')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('获取邀请码失败:', error)
          return NextResponse.json(
            { error: '获取邀请码失败' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          inviteCodes: inviteCodes || []
        })
      }
    }

    // 降级到环境变量存储
    const inviteCodes = JSON.parse(process.env.ADMIN_INVITE_CODES || '[]')
    return NextResponse.json({
      success: true,
      inviteCodes: inviteCodes
    })

  } catch (error) {
    console.error('获取邀请码错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// 创建新邀请码
export async function POST(request) {
  try {
    const { maxEvents = 10, expiresInDays = 30 } = await request.json()

    const code = `INV_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()

    if (hasSupabase()) {
      const supabase = await createServerSupabaseClient()
      
      if (supabase) {
        const { data: newInviteCode, error } = await supabase
          .from('admin_invite_codes')
          .insert([
            {
              code: code,
              max_events: maxEvents,
              expires_at: expiresAt,
              is_active: true,
              created_by: 'admin'
            }
          ])
          .select()
          .single()

        if (error) {
          console.error('创建邀请码失败:', error)
          return NextResponse.json(
            { error: '创建邀请码失败' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          inviteCode: newInviteCode
        })
      }
    }

    // 降级到环境变量存储
    const newInviteCode = {
      id: `invite_${Date.now()}`,
      code: code,
      createdBy: 'admin',
      createdAt: new Date().toISOString(),
      usedBy: null,
      usedAt: null,
      isActive: true,
      maxEvents: maxEvents,
      expiresAt: expiresAt
    }

    const existingCodes = JSON.parse(process.env.ADMIN_INVITE_CODES || '[]')
    const updatedCodes = [...existingCodes, newInviteCode]
    process.env.ADMIN_INVITE_CODES = JSON.stringify(updatedCodes)

    return NextResponse.json({
      success: true,
      inviteCode: newInviteCode
    })

  } catch (error) {
    console.error('创建邀请码错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// 更新邀请码状态
export async function PUT(request) {
  try {
    const { id, isActive } = await request.json()

    if (hasSupabase()) {
      if (supabase) {
        const { data: updatedCode, error } = await supabase
          .from('admin_invite_codes')
          .update({ is_active: isActive })
          .eq('id', id)
          .select()
          .single()

        if (error) {
          console.error('更新邀请码失败:', error)
          return NextResponse.json(
            { error: '更新邀请码失败' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          inviteCode: updatedCode
        })
      }
    }

    // 降级到环境变量存储
    const inviteCodes = JSON.parse(process.env.ADMIN_INVITE_CODES || '[]')
    const updatedCodes = inviteCodes.map(code => {
      if (code.id === id) {
        return { ...code, isActive: isActive }
      }
      return code
    })
    process.env.ADMIN_INVITE_CODES = JSON.stringify(updatedCodes)

    return NextResponse.json({
      success: true,
      message: '邀请码状态已更新'
    })

  } catch (error) {
    console.error('更新邀请码错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
