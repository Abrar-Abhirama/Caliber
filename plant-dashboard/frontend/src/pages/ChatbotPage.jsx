import { useState } from "react";
import ChatWindow from "../components/chatbot/ChatWindow.jsx";
import SourceDrawer from "../components/chatbot/SourceDrawer.jsx";
import { useChat } from "../hooks/useChat.js";

export default function ChatbotPage() {
  const { messages, loading, sendMessage } = useChat();
  const [selectedSource, setSelectedSource] = useState(null);
  const [assetContext, setAssetContext] = useState("");

  return (
    <div style={{ padding: "20px", height: "calc(100vh - 65px)", position: "relative", boxSizing: "border-box" }}>
      <ChatWindow
        messages={messages}
        loading={loading}
        onSend={sendMessage}
        assetContext={assetContext}
        setAssetContext={setAssetContext}
        onSelectSource={setSelectedSource}
      />
      <SourceDrawer
        source={selectedSource}
        onClose={() => setSelectedSource(null)}
      />
    </div>
  );
}
