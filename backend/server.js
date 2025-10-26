const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Stripe = require('stripe');

const app = express();
const PORT = process.env.PORT || 3001;

// 环境变量
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// 初始化服务
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const stripe = Stripe(STRIPE_SECRET_KEY);

// 中间件
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 限制每个IP 100次请求
});
app.use(limiter);

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/v1/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
});

// 认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'ACCESS_TOKEN_REQUIRED' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'INVALID_TOKEN' });
    }
    req.user = user;
    next();
  });
};

// 活动路由
app.get('/v1/events', async (req, res) => {
  try {
    const { data: events, error } = await supabase
      .from('events')
      .select(`
        *,
        merchants (
          id,
          name,
          contact_email
        )
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Failed to fetch events'
      });
    }

    res.json({
      success: true,
      data: events || []
    });
  } catch (error) {
    console.error('Events API error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

// 获取单个活动
app.get('/v1/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: event, error } = await supabase
      .from('events')
      .select(`
        *,
        merchants (
          id,
          name,
          contact_email
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        error: 'EVENT_NOT_FOUND',
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Event API error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

// 用户资料路由
app.get('/v1/users/profile', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, age, role, created_at')
      .eq('id', req.user.userId)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('User profile API error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

// 用户票务路由
app.get('/v1/users/tickets', authenticateToken, async (req, res) => {
  try {
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select(`
        *,
        events (
          id,
          title,
          start_at
        )
      `)
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Failed to fetch tickets'
      });
    }

    res.json({
      success: true,
      data: tickets || []
    });
  } catch (error) {
    console.error('User tickets API error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

// 用户订单路由
app.get('/v1/users/orders', authenticateToken, async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        events (
          id,
          title,
          start_at
        )
      `)
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Failed to fetch orders'
      });
    }

    res.json({
      success: true,
      data: orders || []
    });
  } catch (error) {
    console.error('User orders API error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

// 票务验证路由
app.post('/v1/tickets/verify', async (req, res) => {
  try {
    const { qr_payload } = req.body;

    if (!qr_payload) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_QR_PAYLOAD',
        message: 'QR payload is required'
      });
    }

    // 解析 QR 载荷
    const parts = qr_payload.split('.');
    if (parts.length !== 4) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_QR_FORMAT',
        message: 'Invalid QR code format'
      });
    }

    const [prefix, ticketId, timestamp, signature] = parts;

    if (prefix !== 'TKT') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_QR_PREFIX',
        message: 'Invalid QR code prefix'
      });
    }

    // 查找票务
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        *,
        events (
          id,
          title,
          start_at,
          end_at
        )
      `)
      .eq('id', ticketId)
      .single();

    if (error || !ticket) {
      return res.status(404).json({
        success: false,
        error: 'TICKET_NOT_FOUND',
        message: 'Ticket not found'
      });
    }

    // 检查票务状态
    if (ticket.status === 'used') {
      return res.json({
        success: true,
        data: {
          ticket,
          valid: false,
          message: 'Ticket already used'
        }
      });
    }

    // 检查票务是否过期
    const now = new Date();
    const eventEnd = new Date(ticket.events.end_at);
    if (now > eventEnd) {
      return res.json({
        success: true,
        data: {
          ticket,
          valid: false,
          message: 'Ticket expired'
        }
      });
    }

    res.json({
      success: true,
      data: {
        ticket,
        valid: true,
        message: 'Ticket is valid'
      }
    });
  } catch (error) {
    console.error('Ticket verification API error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

// 支付相关路由
app.post('/v1/payments/checkout', authenticateToken, async (req, res) => {
  try {
    const { event_id, ticket_type, quantity, customer_email, customer_name } = req.body;

    if (!event_id || !ticket_type || !quantity || !customer_email || !customer_name) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'All required fields must be provided'
      });
    }

    // 获取活动信息
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({
        success: false,
        error: 'EVENT_NOT_FOUND',
        message: 'Event not found'
      });
    }

    // 计算价格（这里简化处理，实际应该根据票种计算）
    const pricePerTicket = 5000; // 50.00 CNY in cents
    const totalAmount = pricePerTicket * quantity;

    // 创建 Stripe 支付会话
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'cny',
          product_data: {
            name: event.title,
            description: `Ticket for ${event.title}`,
          },
          unit_amount: pricePerTicket,
        },
        quantity: quantity,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/events/${event_id}`,
      customer_email: customer_email,
      metadata: {
        event_id: event_id,
        ticket_type: ticket_type,
        user_id: req.user.userId,
        customer_name: customer_name
      }
    });

    res.json({
      success: true,
      data: {
        checkout_url: session.url,
        session_id: session.id
      }
    });
  } catch (error) {
    console.error('Checkout API error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

// 用户认证路由
app.post('/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_CREDENTIALS',
        message: 'Email and password are required'
      });
    }

    // 从数据库获取用户
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }

    // 生成JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base: http://localhost:${PORT}/v1`);
});

module.exports = app;
