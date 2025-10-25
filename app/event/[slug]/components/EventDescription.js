/**
 * 活动描述组件
 */
export function EventDescription({ text }) {
  if (!text) return null

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ marginBottom: '1rem' }}>活动详情</h2>
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '1.5rem',
        borderRadius: '8px',
        lineHeight: '1.8',
        color: '#555'
      }}>
        {text}
      </div>
    </div>
  )
}
