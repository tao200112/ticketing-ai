/**
 * 无票可售状态组件
 */
export function NoTicketsAvailable() {
  return (
    <div style={{
      backgroundColor: '#fff9e6',
      border: '2px solid #ffd700',
      borderRadius: '8px',
      padding: '2rem',
      textAlign: 'center',
      marginTop: '2rem'
    }}>
      <h3 style={{ color: '#856404', marginBottom: '1rem' }}>
        暂无可售票种
      </h3>
      <p style={{ color: '#666' }}>
        当前没有可售的票种。请稍后再试或联系活动主办方。
      </p>
    </div>
  )
}
