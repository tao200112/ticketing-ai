// 生成临时邀请码
const inviteCode = `INV_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`

const inviteCodeData = {
  id: `invite_${Date.now()}`,
  code: inviteCode,
  isActive: true,
  maxEvents: 10,
  usedBy: null,
  usedAt: null,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天后过期
  createdAt: new Date().toISOString()
}

console.log('🎫 Generated Invite Code:')
console.log('========================')
console.log('Code:', inviteCode)
console.log('Max Events:', inviteCodeData.maxEvents)
console.log('Expires:', inviteCodeData.expiresAt)
console.log('')
console.log('📋 Environment Variable to set in Vercel:')
console.log('ADMIN_INVITE_CODES=' + JSON.stringify([inviteCodeData]))
console.log('')
console.log('💡 Copy the above JSON and set it as ADMIN_INVITE_CODES in your Vercel environment variables')
