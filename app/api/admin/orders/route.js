import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db.js';

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        tickets: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('[AdminOrders] Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
