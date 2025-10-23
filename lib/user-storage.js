// 用户存储管理模块
class UserStorage {
  constructor() {
    this.storageKey = 'localUsers'
  }

  // 获取所有用户
  getAllUsers() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(this.storageKey)
      return stored ? JSON.parse(stored) : []
    }
    return []
  }

  // 根据邮箱查找用户
  findUserByEmail(email) {
    const users = this.getAllUsers()
    return users.find(user => user.email === email)
  }

  // 创建新用户
  async createUser({ email, name, age, password }) {
    const users = this.getAllUsers()
    
    // 检查邮箱是否已存在
    if (this.findUserByEmail(email)) {
      throw new Error('该邮箱已被注册')
    }

    // 创建新用户对象
    const newUser = {
      id: Date.now().toString(),
      email,
      name,
      age: parseInt(age),
      password, // 注意：在生产环境中应该哈希密码
      createdAt: new Date().toISOString(),
      tickets: [] // 用户的购票记录
    }

    // 添加到用户列表
    users.push(newUser)
    
    // 保存到本地存储
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(users))
    }

    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      age: newUser.age,
      createdAt: newUser.createdAt
    }
  }

  // 验证用户登录
  async authenticateUser(email, password) {
    const user = this.findUserByEmail(email)
    
    if (!user) {
      throw new Error('用户不存在')
    }

    if (user.password !== password) {
      throw new Error('密码错误')
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      age: user.age,
      createdAt: user.createdAt
    }
  }

  // 添加购票记录
  addTicket(userId, ticketData) {
    const users = this.getAllUsers()
    const userIndex = users.findIndex(user => user.id === userId)
    
    if (userIndex === -1) {
      throw new Error('用户不存在')
    }

    const ticket = {
      id: Date.now().toString(),
      eventName: ticketData.eventName,
      eventDate: ticketData.eventDate,
      ticketType: ticketData.ticketType,
      price: ticketData.price,
      qrCode: ticketData.qrCode,
      purchaseDate: new Date().toISOString()
    }

    users[userIndex].tickets.push(ticket)
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(users))
    }

    return ticket
  }

  // 获取用户的购票记录
  getUserTickets(userId) {
    const users = this.getAllUsers()
    const user = users.find(user => user.id === userId)
    
    return user ? user.tickets : []
  }

  // 更新用户信息
  updateUser(userId, updates) {
    const users = this.getAllUsers()
    const userIndex = users.findIndex(user => user.id === userId)
    
    if (userIndex === -1) {
      throw new Error('用户不存在')
    }

    // 更新用户信息
    Object.assign(users[userIndex], updates)
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(users))
    }

    return users[userIndex]
  }
}

export default new UserStorage()
