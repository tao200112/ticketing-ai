import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'MISSING_FIELDS',
          message: 'Email and password are required'
        },
        { status: 400 }
      )
    }

    // If Supabase is not configured, return configuration error
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'CONFIG_ERROR',
          message: 'Supabase is not configured, login is not available'
        },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Find merchant user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('role', 'merchant')
      .single()

    console.log('🔍 Query user result:', { user, error })

    if (error || !user) {
      console.log('❌ Merchant user not found or query error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        },
        { status: 401 }
      )
    }

    // Validate password
    if (!user.password_hash) {
      console.log('❌ User has no password hash')
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        },
        { status: 401 }
      )
    }
    
    console.log('🔑 Verifying password...')
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    console.log('✅ Password verification result:', isValidPassword)
    
    if (!isValidPassword) {
      console.log('❌ Password verification failed')
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        },
        { status: 401 }
      )
    }

    // Get merchant information (try as owner first)
    let merchant = null
    let merchantId = null
    
    const { data: ownerMerchant, error: merchantError } = await supabase
      .from('merchants')
      .select('*')
      .eq('owner_user_id', user.id)
      .single()
    
    if (!merchantError && ownerMerchant) {
      merchant = ownerMerchant
      merchantId = ownerMerchant.id
      console.log('🏪 Found merchant (owner):', merchant.id)
    } else {
      // If not owner, try to find as staff
      const { data: member, error: memberError } = await supabase
        .from('merchant_members')
        .select('merchant_id')
        .eq('user_id', user.id)
        .single()
      
      if (!memberError && member) {
        merchantId = member.merchant_id
        // Get merchant information for staff
        const { data: memberMerchant } = await supabase
          .from('merchants')
          .select('*')
          .eq('id', member.merchant_id)
          .single()
        
        if (memberMerchant) {
          merchant = memberMerchant
          console.log('🏪 Found merchant (staff):', merchant.id)
        }
      }
    }
    
    // If neither owner nor staff, try to auto-create merchant record (backward compatibility)
    if (!merchant && !merchantId) {
      console.log('⚠️ User has no merchant association, attempting auto-create...')
      
      // Auto-create merchant record for merchant user (as owner)
      const { data: autoMerchant, error: createError } = await supabase
        .from('merchants')
        .insert([{
          owner_user_id: user.id,
          name: user.name || 'Unnamed Merchant',
          description: 'Auto-created merchant account',
          contact_email: user.email,
          verified: false,
          status: 'active'
        }])
        .select()
        .single()
      
      if (!createError && autoMerchant) {
        merchant = autoMerchant
        merchantId = autoMerchant.id
        console.log('✅ Auto-created merchant record:', merchant.id)
      } else {
        console.log('❌ Failed to auto-create merchant record:', createError)
        return NextResponse.json(
          {
            success: false,
            error: 'NO_MERCHANT_ACCESS',
            message: 'You do not have a merchant account associated. Please contact administrator'
          },
          { status: 403 }
        )
      }
    }

    // Remove password field
    delete user.password_hash

    // Construct return data
    // Note: All merchant users can access Staff and Boss pages after login
    // Boss page requires second-factor password (boss123) verification
    const finalMerchantId = merchant?.id || merchantId
    const userData = {
      ...user,
      merchant_id: finalMerchantId,
      merchant: merchant || null,
      merchant_role: 'boss' // Default to boss, but not used for page access control
    }
    
    console.log('📤 Returning user data:', { 
      id: userData.id, 
      merchant_id: userData.merchant_id, 
      merchant_role: userData.merchant_role,
      hasMerchant: !!userData.merchant 
    })

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: userData
    })

  } catch (error) {
    console.error('❌ API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Internal server error'
      },
      { status: 500 }
    )
  }
}
