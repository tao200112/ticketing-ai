/**
 * 🧹 清理 "aa" 活动脚本
 * 删除有问题的 "aa" 活动数据
 */

// 清理 localStorage 中的 "aa" 活动
function cleanupAAEvent() {
  try {
    // 检查是否在浏览器环境
    if (typeof window === 'undefined') {
      console.log('❌ 此脚本只能在浏览器环境中运行')
      return
    }

    // 获取商家活动数据
    const merchantEvents = JSON.parse(localStorage.getItem('merchantEvents') || '[]')
    
    // 过滤掉 "aa" 相关的活动
    const cleanedEvents = merchantEvents.filter(event => {
      const isAAEvent = event.title === 'aa' || 
                       event.id.includes('aa') ||
                       event.id.startsWith('default-aa-')
      
      if (isAAEvent) {
        console.log('🗑️ 删除有问题的活动:', event.title, event.id)
        return false
      }
      return true
    })

    // 保存清理后的数据
    localStorage.setItem('merchantEvents', JSON.stringify(cleanedEvents))
    
    console.log('✅ 清理完成')
    console.log(`删除了 ${merchantEvents.length - cleanedEvents.length} 个有问题的活动`)
    console.log(`剩余 ${cleanedEvents.length} 个正常活动`)

    // 如果还有 "aa" 相关的活动，显示警告
    const remainingAAEvents = cleanedEvents.filter(event => 
      event.title === 'aa' || event.id.includes('aa')
    )
    
    if (remainingAAEvents.length > 0) {
      console.warn('⚠️ 仍有 "aa" 相关活动未清理:', remainingAAEvents)
    }

  } catch (error) {
    console.error('❌ 清理过程中出现错误:', error)
  }
}

// 如果直接运行此脚本
if (typeof window !== 'undefined') {
  cleanupAAEvent()
}

// 导出函数供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { cleanupAAEvent }
}
