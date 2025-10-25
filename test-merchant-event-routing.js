// 测试商家活动路由逻辑
console.log('=== 测试商家活动路由逻辑 ===\n');

// 模拟商家活动数据
const merchantEvents = [
  {
    id: '1234567890',
    title: 'Test Event Title',
    description: 'Test description',
    startTime: '2025-10-25T20:00:00Z',
    endTime: '2025-10-25T23:00:00Z',
    location: 'Test Location',
    prices: [{ name: 'Regular Ticket', amount_cents: 1500, inventory: 100 }]
  },
  {
    id: '1234567891',
    title: 'Another Event Name',
    description: 'Another description',
    startTime: '2025-10-26T20:00:00Z',
    endTime: '2025-10-26T23:00:00Z',
    location: 'Another Location',
    prices: [{ name: 'VIP Ticket', amount_cents: 3000, inventory: 50 }]
  }
];

// 模拟路由参数
const testSlugs = [
  'test-event-title',
  'another-event-name',
  'non-existent-event'
];

console.log('商家活动数据:');
merchantEvents.forEach((event, index) => {
  const slug = event.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
  
  console.log(`${index + 1}. ID: ${event.id}`);
  console.log(`   Title: ${event.title}`);
  console.log(`   Generated Slug: ${slug}`);
  console.log(`   Expected URL: /events/${slug}\n`);
});

console.log('测试路由匹配:');
testSlugs.forEach(slug => {
  console.log(`\n测试 slug: "${slug}"`);
  
  const foundEvent = merchantEvents.find(e => {
    const eventSlug = e.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
    return eventSlug === slug;
  });
  
  if (foundEvent) {
    console.log(`✅ 找到活动: ${foundEvent.title}`);
  } else {
    console.log(`❌ 未找到活动`);
  }
});

console.log('\n=== 测试完成 ===');
