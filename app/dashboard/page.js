export default function Dashboard() {
  const stats = [
    {
      title: "Total Sales",
      value: "1,247",
      change: "+12%",
      color: "#007bff"
    },
    {
      title: "Total Revenue",
      value: "$45,230",
      change: "+8%",
      color: "#28a745"
    },
    {
      title: "This Week Orders",
      value: "89",
      change: "+15%",
      color: "#ffc107"
    }
  ];

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <h1 style={{
        fontSize: '2.5rem',
        fontWeight: 'bold',
        marginBottom: '2rem',
        color: '#333'
      }}>
        Dashboard
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem',
        marginBottom: '3rem'
      }}>
        {stats.map((stat, index) => (
          <div key={index} style={{
            border: '1px solid #e9ecef',
            borderRadius: '12px',
            padding: '2rem',
            backgroundColor: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}>
            <h3 style={{
              fontSize: '1.2rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
              color: '#666'
            }}>
              {stat.title}
            </h3>
            
            <div style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: stat.color,
              marginBottom: '0.5rem'
            }}>
              {stat.value}
            </div>
            
            <div style={{
              fontSize: '1rem',
              color: '#28a745',
              fontWeight: 'bold'
            }}>
              {stat.change} from last month
            </div>
          </div>
        ))}
      </div>

      <div style={{
        border: '1px solid #e9ecef',
        borderRadius: '12px',
        padding: '2rem',
        backgroundColor: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          color: '#333'
        }}>
          Recent Activity
        </h2>
        
        <div style={{
          color: '#666',
          lineHeight: '1.6'
        }}>
          <p>• New ticket purchase for Tech Conference 2024</p>
          <p>• Ticket verification completed for Music Festival</p>
          <p>• Payment processed for Art Exhibition</p>
          <p>• New event created: Winter Concert</p>
        </div>
      </div>
    </div>
  );
}


