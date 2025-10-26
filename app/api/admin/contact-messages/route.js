import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request) {
  try {
    // 获取所有联系消息
    const { data: messages, error } = await supabaseAdmin
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[AdminContactMessages] Error fetching messages:', error);
      return NextResponse.json(
        { ok: false, error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      messages: messages || []
    });
  } catch (error) {
    console.error('[AdminContactMessages] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { ok: false, error: 'Missing id or status' },
        { status: 400 }
      );
    }

    // 更新消息状态
    const { data, error } = await supabaseAdmin
      .from('contact_messages')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[AdminContactMessages] Error updating message:', error);
      return NextResponse.json(
        { ok: false, error: 'Failed to update message' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: data
    });
  } catch (error) {
    console.error('[AdminContactMessages] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
