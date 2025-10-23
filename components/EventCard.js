'use client'

import Image from 'next/image'

export default function EventCard({ event, className = '' }) {
  const formatPrice = (amountCents) => {
    return `¥${(amountCents / 100).toFixed(2)}`
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={`bg-partytix-card rounded-xl overflow-hidden hover:scale-105 transition-transform duration-300 cursor-pointer group ${className}`}>
      {/* 海报 */}
      <div className="relative h-48 bg-gradient-to-br from-purple-600 to-cyan-400">
        {event.poster_url ? (
          <Image
            src={event.poster_url}
            alt={event.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-white text-6xl opacity-80">🎪</div>
          </div>
        )}
        
        {/* 状态标签 */}
        {event.status && (
          <div className="absolute top-3 right-3">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              event.status === 'active' ? 'bg-green-500/80 text-white' :
              event.status === 'draft' ? 'bg-yellow-500/80 text-white' :
              event.status === 'ended' ? 'bg-gray-500/80 text-white' :
              'bg-red-500/80 text-white'
            }`}>
              {event.status === 'active' ? '进行中' :
               event.status === 'draft' ? '草稿' :
               event.status === 'ended' ? '已结束' : '已取消'}
            </span>
          </div>
        )}
      </div>

      {/* 内容 */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-purple-300 transition-colors">
          {event.name}
        </h3>
        
        <div className="space-y-2">
          <div className="flex items-center text-slate-400 text-sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(event.start_date)}
          </div>
          
          <div className="flex items-center text-slate-400 text-sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="line-clamp-1">{event.location}</span>
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <span className="text-slate-400 text-sm">起价</span>
            <span className="text-lg font-bold text-partytix-gradient">
              {event.starting_price ? formatPrice(event.starting_price) : '免费'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
