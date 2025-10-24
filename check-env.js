// 检查环境变量配置
console.log('🔍 Environment Variables Check:')
console.log('================================')

// 检查Supabase配置
console.log('📊 Supabase Configuration:')
console.log('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing')
console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing')

// 检查Stripe配置
console.log('\n💳 Stripe Configuration:')
console.log('  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? '✅ Set' : '❌ Missing')
console.log('  STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing')

// 检查其他重要环境变量
console.log('\n🔧 Other Configuration:')
console.log('  NODE_ENV:', process.env.NODE_ENV || 'Not set')
console.log('  VERCEL:', process.env.VERCEL ? '✅ Vercel Environment' : '❌ Local Environment')

// 检查邀请码配置
console.log('\n🎫 Invite Codes:')
const inviteCodes = process.env.ADMIN_INVITE_CODES ? JSON.parse(process.env.ADMIN_INVITE_CODES) : []
console.log('  Available invite codes:', inviteCodes.length)
if (inviteCodes.length > 0) {
  console.log('  Sample invite code:', inviteCodes[0]?.code || 'N/A')
}

console.log('\n📝 Recommendations:')
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('  ⚠️  Supabase not configured - app will use fallback methods')
  console.log('  💡 To fix: Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel')
}

if (!process.env.STRIPE_SECRET_KEY) {
  console.log('  ⚠️  Stripe not configured - payment features will not work')
  console.log('  💡 To fix: Set STRIPE_SECRET_KEY in Vercel')
}

if (inviteCodes.length === 0) {
  console.log('  ⚠️  No invite codes available - merchant registration will fail')
  console.log('  💡 To fix: Generate invite codes from admin dashboard')
}
