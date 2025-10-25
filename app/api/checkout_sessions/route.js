import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

// Initialize Stripe with fallback
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_demo_key';
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-12-18.acacia',
});

// Verify Stripe configuration
if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'your_str***************here') {
  console.warn('[CheckoutSessions] STRIPE_SECRET_KEY is not configured, using demo mode');
}

export async function POST(request) {
  try {
    console.log('[CheckoutSessions] API Request: POST /api/checkout_sessions');
    
    // Check Stripe configuration - early return for demo mode
    if (!process.env.STRIPE_SECRET_KEY || 
        process.env.STRIPE_SECRET_KEY === 'your_str***************here' ||
        process.env.STRIPE_SECRET_KEY.includes('your_str') ||
        process.env.STRIPE_SECRET_KEY.length < 20) {
      console.warn('[CheckoutSessions] STRIPE_SECRET_KEY is not configured, using demo mode');
      
      // Parse request body for demo mode
      const body = await request.json();
      const { eventId, ticketType, quantity = 1, customerEmail, customerName } = body;
      
      // Return demo mode response immediately
      return NextResponse.json({
        url: '/success?session_id=demo_session_' + Date.now(),
        demo: true,
        message: 'Demo mode - no actual payment processed',
        eventId,
        ticketType,
        quantity,
        customerEmail,
        customerName
      });
    }
    
    // Parse request body
    const body = await request.json();
    const { 
      eventId, 
      ticketType, 
      quantity = 1, 
      customerEmail,
      customerName,
      userId,
      userToken,
      metadata = {} 
    } = body;

    // Verify user is logged in
    if (!userToken || !userId) {
      console.warn('[CheckoutSessions] User not authenticated');
      return NextResponse.json(
        { error: 'Please login before purchasing tickets' },
        { status: 401 }
      );
    }

    // Verify user email
    if (!customerEmail) {
      console.warn('[CheckoutSessions] Missing customer email');
      return NextResponse.json(
        { error: 'Please provide your email address' },
        { status: 400 }
      );
    }
    
    // Verify required parameters
    if (!eventId || !ticketType) {
      console.warn('[CheckoutSessions] Missing required parameters');
      return NextResponse.json(
        { error: 'Missing required parameters: eventId and ticketType' },
        { status: 400 }
      );
    }
    
    // Verify quantity
    if (quantity < 1 || quantity > 10) {
      console.warn('[CheckoutSessions] Invalid quantity:', quantity);
      return NextResponse.json(
        { error: 'Quantity must be between 1 and 10' },
        { status: 400 }
      );
    }
    
    // Get event information from request body
    const { eventData } = body;
    
    if (!eventData) {
      console.warn('[CheckoutSessions] Event data not provided');
      return NextResponse.json(
        { error: 'Event data is required' },
        { status: 400 }
      );
    }
    
    const event = eventData;
    
    // Find ticket type information
    const ticketInfo = event.prices.find(p => p.name === ticketType);
    if (!ticketInfo) {
      console.warn('[CheckoutSessions] Ticket type not found:', ticketType);
      return NextResponse.json(
        { error: 'Ticket type not found' },
        { status: 404 }
      );
    }
    
    // Check inventory
    if (ticketInfo.inventory < quantity) {
      console.warn('[CheckoutSessions] Insufficient inventory');
      return NextResponse.json(
        { error: 'Insufficient inventory' },
        { status: 400 }
      );
    }
    
    console.log('[CheckoutSessions] Creating checkout session:', { 
      eventId, 
      ticketType, 
      quantity, 
      customerEmail,
      customerName 
    });
    
    // Build metadata
    const sessionMetadata = {
      eventId: eventId,
      eventTitle: event.title,
      ticketType: ticketType,
      quantity: quantity.toString(),
      customerEmail: customerEmail || '',
      customerName: customerName || '',
      user_id: userId || '',
      tier: ticketType,
      merchantId: event.merchantId || 'unknown',
      ...metadata
    };
    
    // Verify price data
    if (!ticketInfo.amount_cents || ticketInfo.amount_cents <= 0) {
      console.warn('[CheckoutSessions] Invalid amount_cents:', ticketInfo.amount_cents);
      return NextResponse.json(
        { error: 'Invalid ticket price' },
        { status: 400 }
      );
    }

    // Verify Stripe minimum amount requirement (50 cents = $0.50)
    if (ticketInfo.amount_cents < 50) {
      console.warn('[CheckoutSessions] Amount too small for Stripe:', ticketInfo.amount_cents);
      return NextResponse.json(
        { error: 'Ticket price must be at least $0.50 (Stripe minimum requirement)' },
        { status: 400 }
      );
    }

    console.log('[CheckoutSessions] Creating session with:', {
      eventTitle: event.title,
      ticketType: ticketType,
      amountCents: ticketInfo.amount_cents,
      quantity: quantity,
      customerEmail: customerEmail
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${event.title} - ${ticketType}`,
              description: event.description || 'Event ticket',
              metadata: {
                eventId: eventId,
                ticketType: ticketType
              }
            },
            unit_amount: ticketInfo.amount_cents, // Price in cents
          },
          quantity: quantity,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/events/dynamic/${event.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').trim()}`,
      metadata: sessionMetadata,
      customer_email: customerEmail,
      // Allow customer to enter email
      customer_creation: 'always',
    });
    
    console.log('[CheckoutSessions] Checkout session created:', {
      sessionId: session.id,
      url: session.url
    });
    
    return NextResponse.json({
      url: session.url,
      sessionId: session.id
    });
    
  } catch (error) {
    console.error('[CheckoutSessions] Error creating checkout session:', error);
    
    // Handle Stripe specific errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { 
          error: 'Invalid request to Stripe',
          message: error.message 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to create checkout session'
      },
      { status: 500 }
    );
  }
}

// Handle other HTTP methods
export async function GET() {
  console.warn('[CheckoutSessions] GET method not allowed on /api/checkout_sessions');
  
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}