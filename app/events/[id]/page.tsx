import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params

  // 由于前后端分离，这里应该通过 API 获取事件详情
  // 暂时返回 404，实际应该调用后端 API
  return notFound()
}