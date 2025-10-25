// 模拟数据 - 用于演示管理员界面
export const mockStats = {
  users: 5,
  merchants: 2,
  events: 3,
  orders: 12,
  tickets: 25
};

export const mockMerchants = [
  {
    id: 'merchant-1',
    name: 'Music Events Co.',
    contact_email: 'merchant1@example.com',
    contact_phone: '+1-555-0101',
    status: 'active',
    verified: true,
    max_events: 20,
    created_at: '2024-01-15T10:00:00Z',
    users: {
      id: 'user-1',
      email: 'merchant1@example.com',
      name: 'Event Organizer',
      created_at: '2024-01-15T10:00:00Z'
    }
  },
  {
    id: 'merchant-2',
    name: 'Concert Hall',
    contact_email: 'merchant2@example.com',
    contact_phone: '+1-555-0102',
    status: 'active',
    verified: true,
    max_events: 15,
    created_at: '2024-01-20T14:30:00Z',
    users: {
      id: 'user-2',
      email: 'merchant2@example.com',
      name: 'Concert Manager',
      created_at: '2024-01-20T14:30:00Z'
    }
  }
];

export const mockEvents = [
  {
    id: 'event-1',
    title: 'Summer Music Festival',
    description: 'A three-day music festival featuring top artists',
    start_date: '2024-07-15T18:00:00Z',
    end_date: '2024-07-17T23:00:00Z',
    location: 'Central Park, New York',
    max_attendees: 5000,
    status: 'active',
    created_at: '2024-01-15T10:00:00Z',
    merchants: {
      id: 'merchant-1',
      name: 'Music Events Co.',
      contact_email: 'merchant1@example.com'
    }
  },
  {
    id: 'event-2',
    title: 'Jazz Night',
    description: 'An intimate jazz performance in a cozy venue',
    start_date: '2024-06-20T20:00:00Z',
    end_date: '2024-06-20T23:00:00Z',
    location: 'Blue Note Jazz Club',
    max_attendees: 200,
    status: 'active',
    created_at: '2024-01-20T14:30:00Z',
    merchants: {
      id: 'merchant-2',
      name: 'Concert Hall',
      contact_email: 'merchant2@example.com'
    }
  },
  {
    id: 'event-3',
    title: 'Food & Wine Festival',
    description: 'A culinary experience with local chefs and wineries',
    start_date: '2024-08-10T12:00:00Z',
    end_date: '2024-08-10T20:00:00Z',
    location: 'Downtown Plaza',
    max_attendees: 1000,
    status: 'active',
    created_at: '2024-01-25T09:15:00Z',
    merchants: {
      id: 'merchant-1',
      name: 'Music Events Co.',
      contact_email: 'merchant1@example.com'
    }
  }
];

export const mockCustomers = [
  {
    id: 'user-3',
    email: 'john@example.com',
    name: 'John Smith',
    age: 25,
    role: 'user',
    created_at: '2024-01-10T08:00:00Z'
  },
  {
    id: 'user-4',
    email: 'jane@example.com',
    name: 'Jane Doe',
    age: 28,
    role: 'user',
    created_at: '2024-01-12T15:30:00Z'
  }
];

export const mockInviteCodes = [
  {
    id: 'invite-1',
    code: 'ADMIN_INV_2024_001',
    is_active: true,
    expires_at: '2024-12-31T23:59:59Z',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'invite-2',
    code: 'ADMIN_INV_2024_002',
    is_active: true,
    expires_at: '2024-12-31T23:59:59Z',
    created_at: '2024-01-01T00:00:00Z'
  }
];
