export default function Header({ activeTab, setActiveTab }) {
  const tabs = [
    { id: "chat", label: "AI Chat Assistant" },
    { id: "knowledge", label: "Knowledge Base" },
  ];

  return (
    <header style={{ padding: "12px 24px", background: "var(--panel)", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ fontWeight: "bold", fontSize: "1.15rem", color: "var(--accent)" }}>
          Plant Knowledge Hub
        </div>
        <span style={{ fontSize: "0.75rem", background: "var(--accent-soft)", color: "var(--accent)", padding: "2px 8px", borderRadius: "12px", fontWeight: 600 }}>
          Gemini 3.8 Flash
        </span>
      </div>

      <nav style={{ display: "flex", gap: "8px" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "7px 16px",
              cursor: "pointer",
              borderRadius: "6px",
              border: "1px solid var(--line)",
              background: activeTab === tab.id ? "var(--accent)" : "transparent",
              color: activeTab === tab.id ? "#fff" : "var(--ink)",
              fontWeight: 600,
              fontSize: "0.85rem",
              transition: "all 0.15s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
