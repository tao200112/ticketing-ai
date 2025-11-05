import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Email API is working!',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({
        success: false,
        message: 'Email is required'
      }, { status: 400 });
    }
    
    // 这里可以调用邮件发送服务
    return NextResponse.json({
      success: true,
      message: `Test email would be sent to: ${email}`,
      email: email
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Error processing request',
      error: error.message
    }, { status: 500 });
  }
}
