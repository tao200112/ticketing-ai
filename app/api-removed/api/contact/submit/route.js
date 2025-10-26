import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // 验证必需字段
    const { firstName, lastName, email, phone, message } = body;
    
    if (!firstName || !lastName || !email || !phone || !message) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 插入消息到数据库
    const { data, error } = await supabaseAdmin
      .from('contact_messages')
      .insert([
        {
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone,
          address: body.address || null,
          city: body.city || null,
          state: body.state || null,
          zip: body.zip || null,
          message: message,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('[ContactSubmit] Error inserting message:', error);
      return NextResponse.json(
        { ok: false, error: 'Failed to submit message' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Message submitted successfully',
      data: data
    });
  } catch (error) {
    console.error('[ContactSubmit] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
