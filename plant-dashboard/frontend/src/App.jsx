import { useState } from "react";
import Header from "./components/common/Header.jsx";
import ChatbotPage from "./pages/ChatbotPage.jsx";
import KnowledgePage from "./pages/KnowledgePage.jsx";

export default function App() {
  const [activeTab, setActiveTab] = useState("chat");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {activeTab === "chat" && <ChatbotPage />}
        {activeTab === "knowledge" && <KnowledgePage />}
      </main>
    </div>
  );
}
