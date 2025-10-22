import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db.js';

export async function GET() {
  try {
    const tickets = await prisma.ticket.findMany({
      include: {
        order: true
      },
      orderBy: {
        issuedAt: 'desc'
      }
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error('[AdminTickets] Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}
