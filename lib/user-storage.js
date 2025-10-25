// 用户存储管理模块
import bcrypt from 'bcryptjs'

class UserStorage {
  constructor() {
    this.storageKey = 'localUsers'
    // 在服务端使用内存存储，避免文件系统写入问题
    this.memoryStorage = new Map()
  }

  // 获取所有用户
  getAllUsers() {
    if (typeof window !== 'undefined') {
      // 客户端：使用 localStorage
      const stored = localStorage.getItem(this.storageKey)
      return stored ? JSON.parse(stored) : []
    } else {
      // 服务端：使用内存存储，避免Vercel文件系统限制
      return Array.from(this.memoryStorage.values())
    }
  }

  // 保存用户数据
  saveUsers(users) {
    if (typeof window !== 'undefined') {
      // 客户端：使用 localStorage
      localStorage.setItem(this.storageKey, JSON.stringify(users))
    } else {
      // 服务端：使用内存存储，避免Vercel文件系统限制
      this.memoryStorage.clear()
      users.forEach(user => {
        this.memoryStorage.set(user.id, user)
      })
    }
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

    // 哈希密码
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // 创建新用户对象
    const newUser = {
      id: Date.now().toString(),
      email,
      name,
      age: parseInt(age),
      password_hash: hashedPassword, // 使用哈希密码
      createdAt: new Date().toISOString(),
      tickets: [] // 用户的购票记录
    }

    // 添加到用户列表
    users.push(newUser)
    
    // 保存到本地存储
    this.saveUsers(users)

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

    // 检查是否有哈希密码（新用户）或明文密码（旧用户）
    let isValidPassword = false
    
    if (user.password_hash) {
      // 新用户使用哈希密码验证
      isValidPassword = await bcrypt.compare(password, user.password_hash)
    } else if (user.password) {
      // 旧用户使用明文密码验证（向后兼容）
      isValidPassword = user.password === password
      
      // 如果验证成功，升级为哈希密码
      if (isValidPassword) {
        const saltRounds = 12
        const hashedPassword = await bcrypt.hash(password, saltRounds)
        user.password_hash = hashedPassword
        delete user.password // 删除明文密码
        
        // 保存更新后的用户数据
        const users = this.getAllUsers()
        const userIndex = users.findIndex(u => u.id === user.id)
        if (userIndex !== -1) {
          users[userIndex] = user
          this.saveUsers(users)
        }
      }
    } else {
      throw new Error('用户密码数据异常')
    }

    if (!isValidPassword) {
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
    
    this.saveUsers(users)

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
    
    this.saveUsers(users)

    return users[userIndex]
  }
}

export default new UserStorage()
