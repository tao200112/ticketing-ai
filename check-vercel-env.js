/**
 * 检查 Vercel 环境配置
 * 这个脚本将检查当前运行环境中可用的环境变量
 */

console.log('🔍 检查环境变量配置...\n')

// 检查关键环境变量
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
]

const optionalVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NODE_ENV'
]

console.log('📋 必需的环境变量:')
let hasAllRequired = true

requiredVars.forEach(varName => {
  const value = process.env[varName]
  if (value) {
    console.log(`  ✅ ${varName}: ${value.substring(0, 20)}...`)
  } else {
    console.log(`  ❌ ${varName}: 未配置`)
    hasAllRequired = false
  }
})

console.log('\n📋 可选的环境变量:')
optionalVars.forEach(varName => {
  const value = process.env[varName]
  if (value) {
    console.log(`  ✅ ${varName}: ${value.substring(0, 20)}...`)
  } else {
    console.log(`  ⚠️  ${varName}: 未配置`)
  }
})

console.log('\n🌍 运行环境信息:')
console.log(`  NODE_ENV: ${process.env.NODE_ENV || '未设置'}`)
console.log(`  VERCEL: ${process.env.VERCEL || '否'}`)
console.log(`  VERCEL_ENV: ${process.env.VERCEL_ENV || '未设置'}`)
console.log(`  VERCEL_URL: ${process.env.VERCEL_URL || '未设置'}`)

console.log('\n📊 诊断结果:')
if (hasAllRequired) {
  console.log('  ✅ 所有必需的环境变量都已配置')
} else {
  console.log('  ❌ 缺少必需的环境变量')
  console.log('\n💡 解决方案:')
  console.log('  1. 登录 Vercel Dashboard')
  console.log('  2. 进入项目设置 → Environment Variables')
  console.log('  3. 添加缺失的环境变量')
  console.log('  4. 重新部署应用')
}
