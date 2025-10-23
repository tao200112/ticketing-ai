'use client'

export default function SkeletonCard({ type = 'event', className = '' }) {
  if (type === 'event') {
    return (
      <div className={`bg-partytix-card rounded-xl overflow-hidden animate-pulse ${className}`}>
        {/* 海报骨架 */}
        <div className="h-48 bg-slate-700"></div>
        
        {/* 内容骨架 */}
        <div className="p-4 space-y-3">
          <div className="h-5 bg-slate-700 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            <div className="h-4 bg-slate-700 rounded w-2/3"></div>
            <div className="h-4 bg-slate-700 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'price') {
    return (
      <div className={`bg-slate-800/30 rounded-lg p-4 animate-pulse ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-700 rounded w-1/3"></div>
            <div className="h-3 bg-slate-700 rounded w-1/2"></div>
          </div>
          <div className="h-6 bg-slate-700 rounded w-16"></div>
        </div>
      </div>
    )
  }

  if (type === 'text') {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="h-4 bg-slate-700 rounded animate-pulse"></div>
        <div className="h-4 bg-slate-700 rounded w-3/4 animate-pulse"></div>
        <div className="h-4 bg-slate-700 rounded w-1/2 animate-pulse"></div>
      </div>
    )
  }

  if (type === 'button') {
    return (
      <div className={`h-10 bg-slate-700 rounded-lg animate-pulse ${className}`}></div>
    )
  }

  if (type === 'avatar') {
    return (
      <div className={`w-12 h-12 bg-slate-700 rounded-full animate-pulse ${className}`}></div>
    )
  }

  // 默认骨架
  return (
    <div className={`bg-slate-700 rounded animate-pulse ${className}`}></div>
  )
}

// 骨架屏组合组件
export function SkeletonGrid({ count = 3, type = 'event', className = '' }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} type={type} />
      ))}
    </div>
  )
}

export function SkeletonList({ count = 5, className = '' }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-partytix-card rounded-lg p-4 animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-slate-700 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-700 rounded w-1/4"></div>
              <div className="h-3 bg-slate-700 rounded w-1/2"></div>
            </div>
            <div className="h-8 bg-slate-700 rounded w-20"></div>
          </div>
        </div>
      ))}
    </div>
  )
}
