// 文件存储管理模块（用于用户数据持久化）
import fs from 'fs'
import path from 'path'

class FileStorage {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data')
    this.usersFile = path.join(this.dataDir, 'users.json')
    this.ensureDataDir()
  }

  // 确保数据目录存在
  ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true })
    }
  }

  // 读取用户数据
  readUsers() {
    try {
      if (fs.existsSync(this.usersFile)) {
        const data = fs.readFileSync(this.usersFile, 'utf8')
        return JSON.parse(data)
      }
    } catch (error) {
      console.error('读取用户数据失败:', error)
    }
    return []
  }

  // 写入用户数据
  writeUsers(users) {
    try {
      fs.writeFileSync(this.usersFile, JSON.stringify(users, null, 2))
    } catch (error) {
      console.error('写入用户数据失败:', error)
      throw error
    }
  }

  // 创建新用户
  async createUser({ email, name, age, password }) {
    const users = this.readUsers()
    
    // 检查邮箱是否已存在
    if (users.find(user => user.email === email)) {
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
    
    // 保存到文件
    this.writeUsers(users)

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
    const users = this.readUsers()
    const user = users.find(user => user.email === email)
    
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
    const users = this.readUsers()
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
    
    // 保存到文件
    this.writeUsers(users)

    return ticket
  }

  // 获取用户的购票记录
  getUserTickets(userId) {
    const users = this.readUsers()
    const user = users.find(user => user.id === userId)
    
    return user ? user.tickets : []
  }

  // 更新用户信息
  updateUser(userId, updates) {
    const users = this.readUsers()
    const userIndex = users.findIndex(user => user.id === userId)
    
    if (userIndex === -1) {
      throw new Error('用户不存在')
    }

    // 更新用户信息
    Object.assign(users[userIndex], updates)
    
    // 保存到文件
    this.writeUsers(users)

    return users[userIndex]
  }
}

export default new FileStorage()
