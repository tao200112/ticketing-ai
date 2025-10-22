import Link from "next/link";

export default function Home() {
  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ textAlign: "center", marginBottom: "2rem", color: "#333" }}>
         Ridiculous Chicken Ticketing System
      </h1>
      
      <div style={{
        backgroundColor: "#f8f9fa",
        border: "2px solid #e9ecef",
        borderRadius: "12px",
        padding: "2rem",
        marginBottom: "2rem",
        textAlign: "center"
      }}>
        <h2 style={{ color: "#dc3545", marginBottom: "1rem", fontSize: "2rem" }}>
           Ridiculous Chicken
        </h2>
        <p style={{ fontSize: "1.2rem", marginBottom: "1.5rem", color: "#666", fontWeight: "bold" }}>
          一场前所未有的滑稽鸡表演，保证让您捧腹大笑！
        </p>
        <div style={{ marginBottom: "1.5rem" }}>
          <p><strong> 日期:</strong> 2025年12月25日</p>
          <p><strong> 时间:</strong> 晚上 7:00 PM - 9:00 PM</p>
          <p><strong> 地点:</strong> 城市大剧院</p>
        </div>
        <Link 
          href="/event/ridiculous-chicken" 
          style={{
            display: "inline-block",
            backgroundColor: "#dc3545",
            color: "white",
            padding: "12px 24px",
            borderRadius: "6px",
            textDecoration: "none",
            fontSize: "1.1rem",
            fontWeight: "bold"
          }}
        >
          查看详情 & 购票
        </Link>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem" }}>
        <Link href="/events" passHref>
          <button style={{
            backgroundColor: "#6c757d",
            color: "white",
            padding: "10px 20px",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer"
          }}>
            所有活动 (Demo)
          </button>
        </Link>
        <Link href="/admin" passHref>
          <button style={{
            backgroundColor: "#28a745",
            color: "white",
            padding: "10px 20px",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer"
          }}>
            商家后台 (Admin)
          </button>
        </Link>
      </div>
    </div>
  );
}
