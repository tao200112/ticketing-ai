export default function TestDeploy() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1 style={{ color: "#dc3545", fontSize: "3rem" }}>
         部署测试成功！
      </h1>
      <p style={{ fontSize: "1.5rem", marginBottom: "2rem" }}>
        如果您看到这个页面，说明 Vercel 部署正常工作
      </p>
      <div style={{ 
        backgroundColor: "#f8f9fa", 
        padding: "1rem", 
        borderRadius: "8px",
        marginBottom: "2rem"
      }}>
        <p><strong>时间:</strong> {new Date().toLocaleString()}</p>
        <p><strong>状态:</strong>  部署成功</p>
      </div>
      <a 
        href="/" 
        style={{
          backgroundColor: "#007bff",
          color: "white",
          padding: "12px 24px",
          borderRadius: "6px",
          textDecoration: "none",
          fontSize: "1.1rem"
        }}
      >
        返回主页
      </a>
    </div>
  );
}
