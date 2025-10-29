// 默认活动数据
export const defaultEvents = [
  {
    id: 'ridiculous-chicken',
    name: 'Ridiculous Chicken Night Event',
    description: 'Enjoy delicious chicken and an amazing night at Virginia Tech\'s most popular event. We provide the freshest ingredients, the most unique cooking methods, and the warmest service.',
    start_date: '2025-10-25T20:00:00Z',
    end_date: '2025-10-25T23:00:00Z',
    location: '201 N Main St SUITE A, Blacksburg, VA 24060',
    address: '201 N Main St SUITE A, Blacksburg, VA 24060',
    max_attendees: 150,
    poster_url: null,
    status: 'published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    merchant: {
      id: 'default-merchant',
      name: 'PartyTix Events',
      contact_email: 'events@partytix.com'
    },
    prices: [
      {
        name: 'Regular Ticket (21+)',
        amount_cents: 1500,
        inventory: 100,
        limit_per_user: 5
      },
      {
        name: 'Special Ticket (18-20)',
        amount_cents: 3000,
        inventory: 50,
        limit_per_user: 2
      }
    ]
  }
]

// 获取默认活动数据
export function getDefaultEvents() {
  return defaultEvents
}

// 检查是否是默认活动
export function isDefaultEvent(eventId) {
  return eventId === 'ridiculous-chicken'
}

// 获取默认活动
export function getDefaultEvent(eventId) {
  return defaultEvents.find(event => event.id === eventId)
}
