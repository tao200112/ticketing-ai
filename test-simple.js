// 简单测试
const { PrismaClient } = require('@prisma/client');

async function test() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing Prisma...');
    await prisma.$connect();
    console.log('Connected!');
    
    // 测试查询
    const orders = await prisma.order.findMany();
    console.log('Orders:', orders.length);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
