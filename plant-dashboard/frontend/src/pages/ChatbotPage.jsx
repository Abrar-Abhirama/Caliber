import { useState } from "react";
import ChatWindow from "../components/chatbot/ChatWindow.jsx";
import SourceDrawer from "../components/chatbot/SourceDrawer.jsx";
import { useModels } from "../hooks/useModels.js";

export default function ChatbotPage({ chat, jumpRequest, sidebarOpen, onOpenSidebar, onNewChat, modeToggle }) {
  const [selectedSource, setSelectedSource] = useState(null);
  const [assetContext, setAssetContext] = useState("");
  const { models, model, setModel } = useModels();

  return (
    <>
      <ChatWindow
        messages={chat.messages}
        loading={chat.loading}
        busy={chat.busy}
        onSend={(text) => chat.sendMessage(text, assetContext || null, model || undefined)}
        assetContext={assetContext}
        setAssetContext={setAssetContext}
        models={models}
        model={model}
        setModel={setModel}
        onSelectSource={setSelectedSource}
        onTogglePin={chat.togglePin}
        jumpRequest={jumpRequest}
        sidebarOpen={sidebarOpen}
        onOpenSidebar={onOpenSidebar}
        onNewChat={onNewChat}
        modeToggle={modeToggle}
      />
      <SourceDrawer source={selectedSource} onClose={() => setSelectedSource(null)} />
    </>
  );
}
