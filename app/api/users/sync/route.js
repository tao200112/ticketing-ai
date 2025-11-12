import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ ok: false, message: 'Authentication required' }, { status: 401 })
    }

    const admin = supabaseAdmin
    if (!admin) {
      return NextResponse.json({ ok: false, message: 'Supabase Service Role not configured' }, { status: 500 })
    }

    // Check if user already exists in users table
    const { data: existingUser, error: checkError } = await admin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking user:', checkError)
      return NextResponse.json({ ok: false, message: 'Failed to check user' }, { status: 500 })
    }

    // If user exists, return it
    if (existingUser) {
      // Update user data from auth metadata
      const metadata = user.user_metadata || {}
      const role = metadata.role || existingUser.role || 'user'
      const name = metadata.full_name || metadata.name || metadata.display_name || existingUser.name || user.email || 'User'
      const age = metadata.age || existingUser.age || null
      const provider = user.app_metadata?.provider || existingUser.auth_provider || 'email'

      const { data: updatedUser, error: updateError } = await admin
        .from('users')
        .update({
          name: name,
          role: role,
          age: age,
          auth_provider: provider,
          email_verified_at: user.email_confirmed_at || user.confirmed_at || existingUser.email_verified_at,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating user:', updateError)
        // Return existing user even if update fails
        return NextResponse.json({ ok: true, user: existingUser })
      }

      return NextResponse.json({ ok: true, user: updatedUser })
    }

    // Create new user record
    const metadata = user.user_metadata || {}
    const role = metadata.role || 'user'
    const name = metadata.full_name || metadata.name || metadata.display_name || user.email || 'User'
    const age = metadata.age || null
    const provider = user.app_metadata?.provider || 'email'

    const { data: newUser, error: insertError } = await admin
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        name: name,
        role: role,
        age: age,
        auth_provider: provider,
        email_verified_at: user.email_confirmed_at || user.confirmed_at || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating user:', insertError)
      // If it's a conflict error, try to get the existing user
      if (insertError.code === '23505') {
        const { data: conflictUser, error: getError } = await admin
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (getError) {
          return NextResponse.json({ ok: false, message: 'Failed to create or retrieve user' }, { status: 500 })
        }

        return NextResponse.json({ ok: true, user: conflictUser })
      }

      return NextResponse.json({ ok: false, message: 'Failed to create user' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, user: newUser })
  } catch (error) {
    console.error('users/sync error:', error)
    return NextResponse.json({ ok: false, message: error.message || 'Internal Server Error' }, { status: 500 })
  }
}



