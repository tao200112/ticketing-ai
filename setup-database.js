const bcrypt = require('bcryptjs');

// 示例数据
const sampleUsers = [
  {
    email: 'admin@partytix.com',
    name: 'System Administrator',
    age: 30,
    password: 'admin123',
    role: 'admin'
  },
  {
    email: 'john@example.com',
    name: 'John Smith',
    age: 25,
    password: 'user123',
    role: 'user'
  },
  {
    email: 'jane@example.com',
    name: 'Jane Doe',
    age: 28,
    password: 'user123',
    role: 'user'
  },
  {
    email: 'merchant1@example.com',
    name: 'Event Organizer',
    age: 35,
    password: 'merchant123',
    role: 'merchant'
  },
  {
    email: 'merchant2@example.com',
    name: 'Concert Manager',
    age: 32,
    password: 'merchant123',
    role: 'merchant'
  }
];

const sampleMerchants = [
  {
    name: 'Music Events Co.',
    contact_email: 'merchant1@example.com',
    contact_phone: '+1-555-0101',
    status: 'active',
    verified: true,
    max_events: 20
  },
  {
    name: 'Concert Hall',
    contact_email: 'merchant2@example.com',
    contact_phone: '+1-555-0102',
    status: 'active',
    verified: true,
    max_events: 15
  }
];

const sampleEvents = [
  {
    title: 'Summer Music Festival',
    description: 'A three-day music festival featuring top artists',
    start_date: '2024-07-15T18:00:00Z',
    end_date: '2024-07-17T23:00:00Z',
    location: 'Central Park, New York',
    max_attendees: 5000,
    status: 'active',
    ticket_types: [
      { name: 'General Admission', price: 50, quantity: 3000 },
      { name: 'VIP', price: 150, quantity: 500 },
      { name: 'Premium VIP', price: 300, quantity: 200 }
    ]
  },
  {
    title: 'Jazz Night',
    description: 'An intimate jazz performance in a cozy venue',
    start_date: '2024-06-20T20:00:00Z',
    end_date: '2024-06-20T23:00:00Z',
    location: 'Blue Note Jazz Club',
    max_attendees: 200,
    status: 'active',
    ticket_types: [
      { name: 'Standard', price: 25, quantity: 150 },
      { name: 'Table Seating', price: 45, quantity: 50 }
    ]
  },
  {
    title: 'Food & Wine Festival',
    description: 'A culinary experience with local chefs and wineries',
    start_date: '2024-08-10T12:00:00Z',
    end_date: '2024-08-10T20:00:00Z',
    location: 'Downtown Plaza',
    max_attendees: 1000,
    status: 'active',
    ticket_types: [
      { name: 'Tasting Pass', price: 35, quantity: 800 },
      { name: 'VIP Experience', price: 75, quantity: 200 }
    ]
  }
];

const sampleInviteCodes = [
  {
    code: 'ADMIN_INV_2024_001',
    is_active: true,
    expires_at: '2024-12-31T23:59:59Z'
  },
  {
    code: 'ADMIN_INV_2024_002',
    is_active: true,
    expires_at: '2024-12-31T23:59:59Z'
  }
];

async function generateSampleData() {
  console.log('🔧 Generating sample data for PartyTix...\n');

  // 处理用户数据
  console.log('👥 Sample Users:');
  const processedUsers = [];
  for (const user of sampleUsers) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const processedUser = {
      ...user,
      password_hash: hashedPassword
    };
    delete processedUser.password;
    processedUsers.push(processedUser);
    console.log(`- ${user.name} (${user.email}) - Role: ${user.role}`);
  }

  console.log('\n🏪 Sample Merchants:');
  sampleMerchants.forEach(merchant => {
    console.log(`- ${merchant.name} (${merchant.contact_email})`);
  });

  console.log('\n🎪 Sample Events:');
  sampleEvents.forEach(event => {
    console.log(`- ${event.title} (${event.location})`);
  });

  console.log('\n🎫 Sample Invite Codes:');
  sampleInviteCodes.forEach(code => {
    console.log(`- ${code.code} (Expires: ${code.expires_at})`);
  });

  // 生成SQL插入语句
  console.log('\n📝 SQL Insert Statements:');
  console.log('\n-- Users');
  processedUsers.forEach(user => {
    console.log(`INSERT INTO users (email, name, age, password_hash, role) VALUES ('${user.email}', '${user.name}', ${user.age}, '${user.password_hash}', '${user.role}');`);
  });

  console.log('\n-- Merchants');
  sampleMerchants.forEach((merchant, index) => {
    const userId = processedUsers.find(u => u.role === 'merchant')[index]?.id || 'merchant-user-id';
    console.log(`INSERT INTO merchants (owner_user_id, name, contact_email, contact_phone, status, verified, max_events) VALUES ('${userId}', '${merchant.name}', '${merchant.contact_email}', '${merchant.contact_phone}', '${merchant.status}', ${merchant.verified}, ${merchant.max_events});`);
  });

  console.log('\n-- Events');
  sampleEvents.forEach((event, index) => {
    const merchantId = `merchant-${index + 1}-id`;
    console.log(`INSERT INTO events (merchant_id, title, description, start_date, end_date, location, max_attendees, status) VALUES ('${merchantId}', '${event.title}', '${event.description}', '${event.start_date}', '${event.end_date}', '${event.location}', ${event.max_attendees}, '${event.status}');`);
  });

  console.log('\n-- Invite Codes');
  sampleInviteCodes.forEach(code => {
    console.log(`INSERT INTO admin_invite_codes (code, is_active, expires_at) VALUES ('${code.code}', ${code.is_active}, '${code.expires_at}');`);
  });

  console.log('\n✅ Sample data generation complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Set up your Supabase project');
  console.log('2. Run the database migration scripts');
  console.log('3. Execute the SQL insert statements above');
  console.log('4. Configure environment variables');
}

// 运行脚本
generateSampleData().catch(console.error);
