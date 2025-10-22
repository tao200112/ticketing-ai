// 测试数据库功能
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('🧪 Testing database connection...');
    
    // 测试连接
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // 测试创建订单
    console.log('\n📝 Testing order creation...');
    const testOrder = await prisma.order.create({
      data: {
        sessionId: 'cs_test_' + Date.now(),
        email: 'test@example.com',
        eventId: 'ridiculous-chicken',
        tier: 'basic',
        amount: 1500,
        currency: 'usd',
        status: 'paid'
      }
    });
    console.log('✅ Order created:', testOrder.id);
    
    // 测试创建票务
    console.log('\n🎫 Testing ticket creation...');
    const testTicket = await prisma.ticket.create({
      data: {
        shortId: 'TKT' + Math.random().toString(36).substr(2, 5).toUpperCase(),
        orderId: testOrder.id,
        eventId: 'ridiculous-chicken',
        tier: 'basic',
        holderEmail: 'test@example.com',
        status: 'unused'
      }
    });
    console.log('✅ Ticket created:', testTicket.shortId);
    
    // 查询数据
    console.log('\n📊 Testing data queries...');
    const orders = await prisma.order.findMany({
      include: { tickets: true }
    });
    console.log(`✅ Found ${orders.length} orders`);
    
    const tickets = await prisma.ticket.findMany({
      include: { order: true }
    });
    console.log(`✅ Found ${tickets.length} tickets`);
    
    console.log('\n🎉 Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
